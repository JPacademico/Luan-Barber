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
