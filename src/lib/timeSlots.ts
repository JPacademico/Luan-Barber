import type { ShopInfo } from '../types';

/** Every bookable slot occupies exactly this many minutes. */
export const SLOT_INTERVAL_MINUTES = 30;

/** Hour of day (24h) after which the current day's finished bookings are purged from the active list. */
export const DAILY_PURGE_HOUR = 22;

/** Converts "09:30" to the number of minutes since midnight (570). */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Converts 570 to "09:30". */
export const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Builds the day's bookable slots at 30-minute granularity.
 *
 * Each generated slot is an independent unit: booking 09:30 consumes 09:30 alone and
 * leaves 09:00, 10:00 and 10:30 open. The final slot starts one interval before closing
 * time, so a shop open 09:00–18:00 offers 09:00 through 17:30.
 */
export const generateTimeSlots = (workingHours: ShopInfo['workingHours']): string[] => {
  const openingMinutes = workingHours.start * 60;
  const closingMinutes = workingHours.end * 60;
  const slots: string[] = [];

  for (let m = openingMinutes; m + SLOT_INTERVAL_MINUTES <= closingMinutes; m += SLOT_INTERVAL_MINUTES) {
    slots.push(minutesToTime(m));
  }

  return slots;
};

/**
 * A slot is in the past once the clock has reached its starting minute, so a 09:30 slot
 * stops being offered at 09:30 sharp rather than at the top of the next hour.
 */
export const isSlotInPast = (slot: string, referenceDate: Date = new Date()): boolean => {
  const nowMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  return timeToMinutes(slot) <= nowMinutes;
};

// --- Duration-aware blocking -------------------------------------------------------------------

/**
 * How many consecutive 30-min slots a service consumes.
 * A 60-min service needs 2 slots, a 90-min service 3, a 45-min service (rounded up) 2.
 */
export const slotsRequired = (durationMinutes: number): number =>
  Math.max(1, Math.ceil(durationMinutes / SLOT_INTERVAL_MINUTES));

/**
 * The exact 30-min slot markers a booking occupies. A 60-min service at 13:30 returns
 * ["13:30", "14:00"], so the next free start for anyone else is 14:30.
 */
export const occupiedSlotsFor = (startTime: string, durationMinutes: number): string[] => {
  const start = timeToMinutes(startTime);
  return Array.from({ length: slotsRequired(durationMinutes) }, (_, i) =>
    minutesToTime(start + i * SLOT_INTERVAL_MINUTES)
  );
};

interface RangeAvailabilityArgs {
  startTime: string;
  durationMinutes: number;
  workingHours: ShopInfo['workingHours'];
  /** 30-min slot markers already taken by existing (non-cancelled) bookings that day. */
  occupied: Set<string>;
  /** True only for the day currently being viewed if it is today. */
  isToday: boolean;
  now?: Date;
}

/**
 * Can a service of the given duration START at `startTime`?
 *
 * It fits only when every slot it would consume (a) ends by closing time, (b) is free of any
 * existing booking, and (c) is not already in the past. This is what disables 16:30 for a
 * 90-min service when 17:30 is booked, or when the shop closes at 18:00.
 */
export const isRangeAvailable = ({
  startTime,
  durationMinutes,
  workingHours,
  occupied,
  isToday,
  now = new Date(),
}: RangeAvailabilityArgs): boolean => {
  const slots = occupiedSlotsFor(startTime, durationMinutes);
  const lastSlotStart = timeToMinutes(slots[slots.length - 1]);

  // The final slot must finish within the working window.
  if (lastSlotStart + SLOT_INTERVAL_MINUTES > workingHours.end * 60) return false;

  for (const slot of slots) {
    if (occupied.has(slot)) return false;
    if (isToday && isSlotInPast(slot, now)) return false;
  }

  return true;
};
