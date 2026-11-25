import { create } from 'zustand';
import type { Booking, DayScheduleOverride } from '../types';
import type { ScheduleScope } from '../constants/barbers';
import { DAILY_PURGE_HOUR, occupiedSlotsFor } from '../lib/timeSlots';
import { overrideKey, toDateKey } from '../lib/schedule';
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

const createOverride = (
  scope: ScheduleScope,
  date: string,
  patch: Partial<DayScheduleOverride>
): DayScheduleOverride => ({
  date,
  barberId: scope,
  isClosed: false,
  startHour: null,
  endHour: null,
  ...patch,
});

/** An override equal to the shop's defaults carries no information and is dropped. */
const isNoOpOverride = (override: DayScheduleOverride): boolean =>
  !override.isClosed && override.startHour === null && override.endHour === null;

/**
 * Keyed by scope+date, not date alone: the shop's holiday and a barber's own day off can fall on
 * the same date and are separate exceptions (see lib/schedule.ts overrideKey).
 */
const overridesToMap = (overrides: DayScheduleOverride[]): Record<string, DayScheduleOverride> =>
  Object.fromEntries(overrides.map((o) => [overrideKey(o.barberId, o.date), o]));

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
  /** Client self-service cancellation from Meus Agendamentos — same effect as cancelBooking, tagged for the admin's benefit. */
  cancelBookingByClient: (id: string, reason: string | null) => void;
  /** Moves a booking to a new date/time. Caller is responsible for the availability check (see ignoreSlots in lib/timeSlots). */
  rescheduleBooking: (id: string, date: string, time: string) => void;

  /** The exception for one scope ('shop' or a barber) on a date, if any. */
  getDayOverride: (scope: ScheduleScope, date: string) => DayScheduleOverride | undefined;
  closeDay: (scope: ScheduleScope, date: string) => void;
  resetDay: (scope: ScheduleScope, date: string) => void;
  setDayHours: (
    scope: ScheduleScope,
    date: string,
    startHour: number | null,
    endHour: number | null
  ) => void;

  isTimeSlotTaken: (barberId: string, date: string, time: string) => boolean;
  /**
   * 30-min slot markers already consumed on a date BY ONE BARBER, expanding each booking by its
   * duration. Scoped per barber on purpose: the two chairs work in parallel, so Luan being booked
   * at 10:00 must leave Augusto's 10:00 free.
   */
  getOccupiedSlots: (barberId: string, date: string) => Set<string>;
  /** Every booking on a date, optionally narrowed to one barber. */
  getBookingsForDate: (date: string, barberId?: string) => Booking[];

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

  /** Fire-and-forget persistence with visible failure. Clears a prior error once a write lands. */
  const persistWrite = (write: Promise<void>) => {
    write
      .then(() => {
        if (get().lastError) set({ lastError: null });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        // Surfaced (not swallowed) so a misconfigured backend is diagnosable, not just "gone".
        console.error('[Luan] Falha ao salvar no Supabase:', message);
        set({ lastError: message });
        void get().refresh();
      });
  };

  /**
   * Optimistic write: update memory immediately, then persist. If the backend rejects, re-pull
   * the truth so the UI can't drift from the database (the optimistic row disappears, and the
   * error becomes visible via `lastError`).
   */
  const optimistic = (nextAll: Booking[], persist: () => Promise<void>) => {
    commitAll(nextAll);
    persistWrite(persist());
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
      console.info(
        `[Luan] Persistência de agendamentos: ${repo.isCloud ? 'NUVEM (Supabase)' : 'LOCAL (somente este aparelho)'}`
      );
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
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Luan] Falha ao carregar do Supabase:', message);
        set({ status: 'error', lastError: message });
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
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Luan] Falha ao sincronizar com o Supabase:', message);
        set({ lastError: message });
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
        cancelledBy: 'admin',
      };
      optimistic(mapBooking(id, patch), () => repo.updateBooking(id, patch));
    },

    cancelBookingByClient: (id, reason) => {
      const patch: Partial<Booking> = {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason,
        cancelledBy: 'client',
      };
      optimistic(mapBooking(id, patch), () => repo.updateBooking(id, patch));
    },

    rescheduleBooking: (id, date, time) => {
      const current = get().allBookings.find((b) => b.id === id);
      if (!current) return;

      const patch: Partial<Booking> = {
        date,
        time,
        rescheduledAt: new Date().toISOString(),
        // Preserved from the FIRST move only — a second reschedule must not overwrite the
        // original with what was itself already a moved slot.
        originalDate: current.originalDate ?? current.date,
        originalTime: current.originalTime ?? current.time,
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

    getDayOverride: (scope, date) => get().dayOverrides[overrideKey(scope, date)],

    closeDay: (scope, date) => {
      const override = createOverride(scope, date, { isClosed: true });
      const key = overrideKey(scope, date);
      set((state) => ({ dayOverrides: { ...state.dayOverrides, [key]: override } }));
      persistWrite(repo.upsertOverride(override));
    },

    resetDay: (scope, date) => {
      const key = overrideKey(scope, date);
      set((state) => {
        const { [key]: _removed, ...rest } = state.dayOverrides;
        return { dayOverrides: rest };
      });
      persistWrite(repo.deleteOverride(scope, date));
    },

    setDayHours: (scope, date, startHour, endHour) => {
      const override = createOverride(scope, date, { isClosed: false, startHour, endHour });

      if (isNoOpOverride(override)) {
        get().resetDay(scope, date);
        return;
      }

      const key = overrideKey(scope, date);
      set((state) => ({ dayOverrides: { ...state.dayOverrides, [key]: override } }));
      persistWrite(repo.upsertOverride(override));
    },

    isTimeSlotTaken: (barberId, date, time) => get().getOccupiedSlots(barberId, date).has(time),

    getOccupiedSlots: (barberId, date) => {
      const occupied = new Set<string>();
      for (const booking of get().allBookings) {
        if (booking.date !== date || booking.barberId !== barberId) continue;
        if (booking.status === 'cancelled') continue;
        for (const slot of occupiedSlotsFor(booking.time, booking.durationMinutes)) {
          occupied.add(slot);
        }
      }
      return occupied;
    },

    getBookingsForDate: (date, barberId) =>
      get().allBookings.filter(
        (b) => b.date === date && (barberId === undefined || b.barberId === barberId)
      ),

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
