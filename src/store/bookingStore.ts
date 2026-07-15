import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Booking, DayScheduleOverride } from '../types';
import { DAILY_PURGE_HOUR } from '../lib/timeSlots';
import { toDateKey } from '../lib/schedule';

/** Exported so the cross-tab sync hook can recognise this store's `storage` events. */
export const BOOKINGS_STORAGE_KEY = 'luan-studio-bookings';

/**
 * Retention has three tiers, each answering a different question:
 *
 *  1. The active list is the day's worklist — a booking leaves it once it is from a past day, or
 *     once it is finished today and the 22:00 cut-off has passed. Today's unfinished bookings
 *     survive the cut-off so nothing disappears unhandled.
 *  2. The month's operational data is therefore cleared as each month rolls over: by the 1st,
 *     every booking of the previous month has aged out of the active list into history.
 *  3. History is the barber's log. It is kept for the whole calendar year so the dashboard can be
 *     analysed, and dropped when the year turns.
 */
const shouldArchive = (booking: Booking, now: Date): boolean => {
  const todayKey = toDateKey(now);

  if (booking.date < todayKey) return true;
  if (booking.date > todayKey) return false;

  const isFinished = booking.status === 'completed' || booking.status === 'cancelled';
  return isFinished && now.getHours() >= DAILY_PURGE_HOUR;
};

/** Year of a YYYY-MM-DD key, without paying for date parsing. */
const yearOf = (dateKey: string): number => Number(dateKey.slice(0, 4));

/** History older than the current calendar year is dropped — the log resets each January. */
const isBeyondRetention = (booking: Booking, now: Date): boolean =>
  yearOf(booking.date) < now.getFullYear();

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

interface BookingState {
  bookings: Booking[];
  archivedBookings: Booking[];
  /** Per-date schedule exceptions, keyed by YYYY-MM-DD. Absent key = regular hours. */
  dayOverrides: Record<string, DayScheduleOverride>;

  addBooking: (booking: Booking) => void;
  removeBooking: (id: string) => void;
  /** Frees the slot; notifying the client is a separate, manual step. */
  cancelBooking: (id: string, reason: string | null) => void;
  getDayOverride: (date: string) => DayScheduleOverride | undefined;
  /** Closes the whole day. Existing bookings are left untouched for the admin to handle. */
  closeDay: (date: string) => void;
  /** Clears any exception, returning the day to the shop's regular hours. */
  resetDay: (date: string) => void;
  /** Opens the day on custom hours. `null` on an edge keeps the shop default for that edge. */
  setDayHours: (date: string, startHour: number | null, endHour: number | null) => void;
  isDateClosed: (date: string) => boolean;
  isTimeSlotTaken: (date: string, time: string) => boolean;
  getBookingsForDate: (date: string) => Booking[];
  /** Client-side claim from the simulated Pix modal. Never marks the booking as paid. */
  claimPixPayment: (id: string) => void;
  /** Admin confirmation that the money arrived. */
  verifyPixPayment: (id: string) => void;
  markAsCompleted: (id: string) => void;
  /** Applies the retention tiers above: archive finished work, drop last year's history. Idempotent. */
  archiveStaleBookings: () => void;
}

/** Retired shapes still sitting in visitors' localStorage. */
interface LegacyBookingState {
  bookings?: Booking[];
  archivedBookings?: Booking[];
  /** v2 and earlier: full-day closures before per-date overrides existed. */
  closedDates?: string[];
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      bookings: [],
      archivedBookings: [],
      dayOverrides: {},

      addBooking: (booking) => set((state) => ({ bookings: [...state.bookings, booking] })),

      removeBooking: (id) =>
        set((state) => ({ bookings: state.bookings.filter((b) => b.id !== id) })),

      cancelBooking: (id, reason) =>
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id
              ? {
                  ...b,
                  status: 'cancelled' as const,
                  cancelledAt: new Date().toISOString(),
                  cancellationReason: reason,
                }
              : b
          ),
        })),

      getDayOverride: (date) => get().dayOverrides[date],

      closeDay: (date) =>
        set((state) => ({
          dayOverrides: {
            ...state.dayOverrides,
            [date]: createOverride(date, { isClosed: true }),
          },
        })),

      resetDay: (date) =>
        set((state) => {
          const { [date]: _removed, ...rest } = state.dayOverrides;
          return { dayOverrides: rest };
        }),

      setDayHours: (date, startHour, endHour) =>
        set((state) => {
          const override = createOverride(date, { isClosed: false, startHour, endHour });

          if (isNoOpOverride(override)) {
            const { [date]: _removed, ...rest } = state.dayOverrides;
            return { dayOverrides: rest };
          }

          return { dayOverrides: { ...state.dayOverrides, [date]: override } };
        }),

      isDateClosed: (date) => get().dayOverrides[date]?.isClosed ?? false,

      // A booking occupies exactly its own 30-minute slot, so an exact match is the whole rule.
      // A cancelled booking releases its slot back to the public calendar.
      isTimeSlotTaken: (date, time) =>
        get().bookings.some(
          (b) => b.date === date && b.time === time && b.status !== 'cancelled'
        ),

      getBookingsForDate: (date) => get().bookings.filter((b) => b.date === date),

      claimPixPayment: (id) =>
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id ? { ...b, paymentClaimedAt: new Date().toISOString() } : b
          ),
        })),

      verifyPixPayment: (id) =>
        set((state) => ({
          bookings: state.bookings.map((b) => (b.id === id ? { ...b, isPaid: true } : b)),
        })),

      markAsCompleted: (id) =>
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === id
              ? { ...b, status: 'completed' as const, completedAt: new Date().toISOString() }
              : b
          ),
        })),

      archiveStaleBookings: () => {
        const now = new Date();
        const { bookings, archivedBookings } = get();

        const stale: Booking[] = [];
        const active: Booking[] = [];
        for (const booking of bookings) {
          (shouldArchive(booking, now) ? stale : active).push(booking);
        }

        // Last year's log is dropped wholesale; this year's is kept for the dashboard.
        const retainedHistory = archivedBookings.filter((b) => !isBeyondRetention(b, now));
        const expiredCount = archivedBookings.length - retainedHistory.length;

        // Bail out before `set`: this runs on a timer, and an unconditional write would both
        // re-render every subscriber each minute and echo a `storage` event to the other tabs.
        if (stale.length === 0 && expiredCount === 0) return;

        set({
          bookings: active,
          archivedBookings: [...retainedHistory, ...stale.filter((b) => !isBeyondRetention(b, now))],
        });
      },
    }),
    {
      name: BOOKINGS_STORAGE_KEY,
      version: 5, // v5 dropped the email outbox; persisted copies are simply ignored.
      migrate: (persistedState, version) => {
        const legacy = persistedState as LegacyBookingState & Partial<BookingState>;

        // v1 predates the payment/lifecycle fields and v3 the cancellation fields; backfill both
        // so older bookings never surface as `undefined` in the panel.
        const backfill = (booking: Booking): Booking => ({
          ...booking,
          paymentMethod: booking.paymentMethod ?? 'local',
          isPaid: booking.isPaid ?? false,
          paymentClaimedAt: booking.paymentClaimedAt ?? null,
          status: booking.status ?? 'active',
          completedAt: booking.completedAt ?? null,
          cancelledAt: booking.cancelledAt ?? null,
          cancellationReason: booking.cancellationReason ?? null,
        });

        const bookings = (legacy.bookings ?? []).map(backfill);

        // v2 stored full-day closures as a flat list; each becomes a closed-day override.
        const dayOverrides =
          version >= 3
            ? legacy.dayOverrides ?? {}
            : Object.fromEntries(
                (legacy.closedDates ?? []).map((date) => [date, createOverride(date, { isClosed: true })])
              );

        // Built explicitly rather than spreading `legacy`: retired keys (the v2 `closedDates`
        // list, the v4 email `outbox`) must not ride along into live state.
        return {
          bookings,
          archivedBookings: (legacy.archivedBookings ?? []).map(backfill),
          dayOverrides,
        } as BookingState;
      },
      onRehydrateStorage: () => (state) => {
        state?.archiveStaleBookings();
      },
    }
  )
);
