import { create } from 'zustand';
import type { Booking, DayScheduleOverride } from '../types';
import { DAILY_PURGE_HOUR, occupiedSlotsFor } from '../lib/timeSlots';
import { toDateKey } from '../lib/schedule';
import { getBookingRepository } from '../repositories/bookingRepository';

/**
 * Retention has three tiers, each answering a different question:
 *
 *  1. The active list is the day's worklist — a booking leaves it once it is from a past day, or
 *     once it is finished today and the 22:00 cut-off has passed. Today's unfinished bookings
 *     survive the cut-off so nothing disappears unhandled.
 *  2. The month's operational data is therefore cleared as each month rolls over.
 *  3. History is the barber's log, kept for the whole calendar year for the dashboard, then
 *     dropped when the year turns. With cloud persistence the physical yearly delete is a Supabase
 *     scheduled job (see supabase/schema.sql); the client always filters it out of view regardless.
 */
const shouldArchive = (booking: Booking, now: Date): boolean => {
  const todayKey = toDateKey(now);

  if (booking.date < todayKey) return true;
  if (booking.date > todayKey) return false;

  const isFinished = booking.status === 'completed' || booking.status === 'cancelled';
  return isFinished && now.getHours() >= DAILY_PURGE_HOUR;
};

/** History older than the current calendar year is dropped from view — the log resets each January. */
const isBeyondRetention = (booking: Booking, now: Date): boolean =>
  Number(booking.date.slice(0, 4)) < now.getFullYear();

const createOverride = (date: string, patch: Partial<DayScheduleOverride>): DayScheduleOverride => ({
  date,
  isClosed: false,
  startHour: null,
  endHour: null,
  ...patch,
});

/** An override equal to the shop's defaults carries no information and is dropped. */
const isNoOpOverride = (override: DayScheduleOverride): boolean =>
  !override.isClosed && override.startHour === null && override.endHour === null;

const overridesToMap = (overrides: DayScheduleOverride[]): Record<string, DayScheduleOverride> =>
  Object.fromEntries(overrides.map((o) => [o.date, o]));

/** Splits the source list into the day's worklist and this-year history, dropping older records. */
const deriveView = (all: Booking[], now: Date) => {
  const retained = all.filter((b) => !isBeyondRetention(b, now));
  const bookings: Booking[] = [];
  const archivedBookings: Booking[] = [];
  for (const booking of retained) {
    (shouldArchive(booking, now) ? archivedBookings : bookings).push(booking);
  }
  return { allBookings: retained, bookings, archivedBookings };
};

type SyncStatus = 'idle' | 'loading' | 'ready' | 'error';

interface BookingState {
  /** Source of truth in memory: every retained booking (active + archived). */
  allBookings: Booking[];
  /** The day's worklist (derived). */
  bookings: Booking[];
  /** Finished bookings from this year (derived). */
  archivedBookings: Booking[];
  dayOverrides: Record<string, DayScheduleOverride>;

  status: SyncStatus;
  /** True when the backend is the shared cloud database rather than per-device storage. */
  isCloud: boolean;
  lastError: string | null;

  /** Loads from the repository and wires up cross-device/tab syncing. Safe to call repeatedly. */
  hydrate: () => Promise<void>;
  /** Re-pulls from the repository without touching the loading flag (used by polling/tabs). */
  refresh: () => Promise<void>;

  addBooking: (booking: Booking) => void;
  removeBooking: (id: string) => void;
  cancelBooking: (id: string, reason: string | null) => void;

  getDayOverride: (date: string) => DayScheduleOverride | undefined;
  closeDay: (date: string) => void;
  resetDay: (date: string) => void;
  setDayHours: (date: string, startHour: number | null, endHour: number | null) => void;
  isDateClosed: (date: string) => boolean;

  isTimeSlotTaken: (date: string, time: string) => boolean;
  /** 30-min slot markers already consumed on a date, expanding each booking by its duration. */
  getOccupiedSlots: (date: string) => Set<string>;
  getBookingsForDate: (date: string) => Booking[];

  claimPixPayment: (id: string) => void;
  verifyPixPayment: (id: string) => void;
  markAsCompleted: (id: string) => void;

  archiveStaleBookings: () => void;
}

const repo = getBookingRepository();
let unsubscribeRemote: (() => void) | null = null;

export const useBookingStore = create<BookingState>()((set, get) => {
  /** Recompute the derived view from a new source list. */
  const commitAll = (all: Booking[]) => set(deriveView(all, new Date()));

  /**
   * Optimistic write: update memory immediately, then persist. If the backend rejects, re-pull
   * the truth so the UI can't drift from the database.
   */
  const optimistic = (nextAll: Booking[], persist: () => Promise<void>) => {
    commitAll(nextAll);
    persist().catch((error: unknown) => {
      set({ lastError: error instanceof Error ? error.message : String(error) });
      void get().refresh();
    });
  };

  const mapBooking = (id: string, patch: Partial<Booking>) =>
    get().allBookings.map((b) => (b.id === id ? { ...b, ...patch } : b));

  return {
    allBookings: [],
    bookings: [],
    archivedBookings: [],
    dayOverrides: {},
    status: 'idle',
    isCloud: repo.isCloud,
    lastError: null,

    hydrate: async () => {
      if (get().status === 'loading') return;
      set({ status: 'loading', lastError: null });
      try {
        const { bookings, overrides } = await repo.load();
        set({
          ...deriveView(bookings, new Date()),
          dayOverrides: overridesToMap(overrides),
          status: 'ready',
          isCloud: repo.isCloud,
        });

        if (!unsubscribeRemote) {
          unsubscribeRemote = repo.subscribe(() => {
            void get().refresh();
          });
        }
      } catch (error: unknown) {
        set({
          status: 'error',
          lastError: error instanceof Error ? error.message : String(error),
        });
      }
    },

    refresh: async () => {
      try {
        const { bookings, overrides } = await repo.load();
        set({
          ...deriveView(bookings, new Date()),
          dayOverrides: overridesToMap(overrides),
          status: 'ready',
        });
      } catch (error: unknown) {
        set({ lastError: error instanceof Error ? error.message : String(error) });
      }
    },

    addBooking: (booking) => {
      optimistic([...get().allBookings, booking], () => repo.createBooking(booking));
    },

    removeBooking: (id) => {
      optimistic(
        get().allBookings.filter((b) => b.id !== id),
        () => repo.deleteBooking(id)
      );
    },

    cancelBooking: (id, reason) => {
      const patch: Partial<Booking> = {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason,
      };
      optimistic(mapBooking(id, patch), () => repo.updateBooking(id, patch));
    },

    claimPixPayment: (id) => {
      const patch: Partial<Booking> = { paymentClaimedAt: new Date().toISOString() };
      optimistic(mapBooking(id, patch), () => repo.updateBooking(id, patch));
    },

    verifyPixPayment: (id) => {
      const patch: Partial<Booking> = { isPaid: true };
      optimistic(mapBooking(id, patch), () => repo.updateBooking(id, patch));
    },

    markAsCompleted: (id) => {
      const patch: Partial<Booking> = { status: 'completed', completedAt: new Date().toISOString() };
      optimistic(mapBooking(id, patch), () => repo.updateBooking(id, patch));
    },

    getDayOverride: (date) => get().dayOverrides[date],

    closeDay: (date) => {
      const override = createOverride(date, { isClosed: true });
      set((state) => ({ dayOverrides: { ...state.dayOverrides, [date]: override } }));
      repo.upsertOverride(override).catch(() => void get().refresh());
    },

    resetDay: (date) => {
      set((state) => {
        const { [date]: _removed, ...rest } = state.dayOverrides;
        return { dayOverrides: rest };
      });
      repo.deleteOverride(date).catch(() => void get().refresh());
    },

    setDayHours: (date, startHour, endHour) => {
      const override = createOverride(date, { isClosed: false, startHour, endHour });

      if (isNoOpOverride(override)) {
        get().resetDay(date);
        return;
      }

      set((state) => ({ dayOverrides: { ...state.dayOverrides, [date]: override } }));
      repo.upsertOverride(override).catch(() => void get().refresh());
    },

    isDateClosed: (date) => get().dayOverrides[date]?.isClosed ?? false,

    isTimeSlotTaken: (date, time) => get().getOccupiedSlots(date).has(time),

    getOccupiedSlots: (date) => {
      const occupied = new Set<string>();
      for (const booking of get().allBookings) {
        if (booking.date !== date || booking.status === 'cancelled') continue;
        for (const slot of occupiedSlotsFor(booking.time, booking.durationMinutes)) {
          occupied.add(slot);
        }
      }
      return occupied;
    },

    getBookingsForDate: (date) => get().allBookings.filter((b) => b.date === date),

    archiveStaleBookings: () => {
      // Purely a re-derivation of the in-memory view against the current clock — no write.
      const { allBookings, bookings, archivedBookings } = get();
      const next = deriveView(allBookings, new Date());

      // Bail if nothing moved, so the 60s timer doesn't churn renders.
      if (
        next.bookings.length === bookings.length &&
        next.archivedBookings.length === archivedBookings.length &&
        next.allBookings.length === allBookings.length
      ) {
        return;
      }
      set(next);
    },
  };
});
