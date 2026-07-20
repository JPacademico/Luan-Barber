import type { Booking, DayScheduleOverride } from '../types';
import { IS_CLOUD_ENABLED } from '../lib/env';
import { supabaseApi } from '../lib/supabaseClient';

/** Everything the booking store needs to hydrate itself, from either backend. */
export interface RepositorySnapshot {
  bookings: Booking[];
  overrides: DayScheduleOverride[];
}

/**
 * Persistence boundary for bookings and schedule overrides.
 *
 * Two implementations satisfy it — a cloud one (Supabase, shared across devices) and a local one
 * (per-device localStorage, the pre-existing behaviour). The store depends only on this interface,
 * so nothing above it knows or cares which backend is live.
 */
export interface BookingRepository {
  /** True when writes are shared across devices. Drives the "sincronizado" UI copy. */
  readonly isCloud: boolean;
  load(): Promise<RepositorySnapshot>;
  createBooking(booking: Booking): Promise<void>;
  updateBooking(id: string, patch: Partial<Booking>): Promise<void>;
  deleteBooking(id: string): Promise<void>;
  upsertOverride(override: DayScheduleOverride): Promise<void>;
  deleteOverride(date: string): Promise<void>;
  /** Registers a callback fired when another client/tab changes the data. Returns an unsubscribe. */
  subscribe(onRemoteChange: () => void): () => void;
}

/** Fills in fields that legacy persisted bookings predate, so nothing surfaces as `undefined`. */
const backfillBooking = (booking: Partial<Booking> & { id: string }): Booking => ({
  id: booking.id,
  clientName: booking.clientName ?? '',
  clientPhone: booking.clientPhone ?? '',
  serviceId: booking.serviceId ?? '',
  durationMinutes: booking.durationMinutes ?? 30,
  date: booking.date ?? '',
  time: booking.time ?? '',
  createdAt: booking.createdAt ?? new Date().toISOString(),
  paymentMethod: booking.paymentMethod ?? 'local',
  isPaid: booking.isPaid ?? false,
  paymentClaimedAt: booking.paymentClaimedAt ?? null,
  status: booking.status ?? 'active',
  completedAt: booking.completedAt ?? null,
  cancelledAt: booking.cancelledAt ?? null,
  cancellationReason: booking.cancellationReason ?? null,
});

// -----------------------------------------------------------------------------------------------
// Local (per-device) repository — the fallback when Supabase is not configured.
// -----------------------------------------------------------------------------------------------

const LOCAL_KEY = 'luan-studio-bookings-repo';
/** The old zustand-persist key, read once to migrate existing visitors' data. */
const LEGACY_PERSIST_KEY = 'luan-studio-bookings';

interface LocalShape {
  v: 6;
  bookings: Booking[];
  overrides: DayScheduleOverride[];
}

const readLocal = (): LocalShape => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalShape;
      return {
        v: 6,
        bookings: (parsed.bookings ?? []).map(backfillBooking),
        overrides: parsed.overrides ?? [],
      };
    }

    // One-time migration from the retired zustand-persist store.
    const legacyRaw = localStorage.getItem(LEGACY_PERSIST_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as {
        state?: {
          bookings?: Array<Partial<Booking> & { id: string }>;
          archivedBookings?: Array<Partial<Booking> & { id: string }>;
          dayOverrides?: Record<string, DayScheduleOverride>;
        };
      };
      const state = legacy.state ?? {};
      const bookings = [...(state.bookings ?? []), ...(state.archivedBookings ?? [])].map(
        backfillBooking
      );
      const overrides = Object.values(state.dayOverrides ?? {});
      const migrated: LocalShape = { v: 6, bookings, overrides };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // Corrupt storage: start clean rather than crash the app.
  }

  return { v: 6, bookings: [], overrides: [] };
};

const writeLocal = (shape: LocalShape): void => {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(shape));
};

class LocalBookingRepository implements BookingRepository {
  readonly isCloud = false;

  async load(): Promise<RepositorySnapshot> {
    const { bookings, overrides } = readLocal();
    return { bookings, overrides };
  }

  async createBooking(booking: Booking): Promise<void> {
    const data = readLocal();
    writeLocal({ ...data, bookings: [...data.bookings, booking] });
  }

  async updateBooking(id: string, patch: Partial<Booking>): Promise<void> {
    const data = readLocal();
    writeLocal({
      ...data,
      bookings: data.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  }

  async deleteBooking(id: string): Promise<void> {
    const data = readLocal();
    writeLocal({ ...data, bookings: data.bookings.filter((b) => b.id !== id) });
  }

  async upsertOverride(override: DayScheduleOverride): Promise<void> {
    const data = readLocal();
    const overrides = data.overrides.filter((o) => o.date !== override.date);
    writeLocal({ ...data, overrides: [...overrides, override] });
  }

  async deleteOverride(date: string): Promise<void> {
    const data = readLocal();
    writeLocal({ ...data, overrides: data.overrides.filter((o) => o.date !== date) });
  }

  subscribe(onRemoteChange: () => void): () => void {
    const handler = (event: StorageEvent) => {
      // Fires only for OTHER tabs' writes, which is exactly the cross-tab signal we want.
      if (event.key === LOCAL_KEY || event.key === null) onRemoteChange();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

// -----------------------------------------------------------------------------------------------
// Cloud (cross-device) repository — Supabase over REST, with polling in lieu of the Realtime WS.
// -----------------------------------------------------------------------------------------------

const CLOUD_POLL_INTERVAL_MS = 15_000;

class SupabaseBookingRepository implements BookingRepository {
  readonly isCloud = true;

  async load(): Promise<RepositorySnapshot> {
    const [bookings, overrides] = await Promise.all([
      supabaseApi.fetchBookings(),
      supabaseApi.fetchOverrides(),
    ]);
    return { bookings, overrides };
  }

  createBooking(booking: Booking): Promise<void> {
    return supabaseApi.insertBooking(booking);
  }

  updateBooking(id: string, patch: Partial<Booking>): Promise<void> {
    return supabaseApi.patchBooking(id, patch);
  }

  deleteBooking(id: string): Promise<void> {
    return supabaseApi.deleteBooking(id);
  }

  upsertOverride(override: DayScheduleOverride): Promise<void> {
    return supabaseApi.upsertOverride(override);
  }

  deleteOverride(date: string): Promise<void> {
    return supabaseApi.deleteOverride(date);
  }

  /**
   * Polls on an interval and also refetches whenever the tab regains focus, so a device left
   * open still catches changes made elsewhere within ~15s (or instantly on return). This stands
   * in for the Supabase Realtime WebSocket — good enough for a barbershop's booking volume and
   * dependency-free. See README for upgrading to true realtime.
   */
  subscribe(onRemoteChange: () => void): () => void {
    const intervalId = window.setInterval(onRemoteChange, CLOUD_POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') onRemoteChange();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', onRemoteChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', onRemoteChange);
    };
  }
}

let repository: BookingRepository | null = null;

/** Singleton accessor. Picks the backend once, based on whether Supabase env vars are present. */
export const getBookingRepository = (): BookingRepository => {
  if (!repository) {
    repository = IS_CLOUD_ENABLED ? new SupabaseBookingRepository() : new LocalBookingRepository();
  }
  return repository;
};
