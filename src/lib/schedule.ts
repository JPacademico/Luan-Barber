import type { DayScheduleOverride, ShopInfo } from '../types';

export type WorkingHours = ShopInfo['workingHours'];

/** Sunday. The shop never opens, regardless of overrides. */
const WEEKLY_CLOSED_WEEKDAY = 0;

/** Local calendar day as YYYY-MM-DD. Avoids the UTC shift of toISOString(). */
export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isWeeklyClosedDay = (date: Date): boolean => date.getDay() === WEEKLY_CLOSED_WEEKDAY;

/**
 * Applies a day's override on top of the shop's default hours.
 *
 * A `null` edge falls back to the default, so "open from 12:00" keeps the usual closing time
 * without the admin having to restate it.
 */
export const resolveWorkingHours = (
  defaultHours: WorkingHours,
  override: DayScheduleOverride | undefined
): WorkingHours => {
  if (!override || override.isClosed) return defaultHours;

  return {
    start: override.startHour ?? defaultHours.start,
    end: override.endHour ?? defaultHours.end,
  };
};

/** True when the override leaves no bookable window at all (e.g. opens at 18:00, closes at 18:00). */
export const isEmptyWindow = (hours: WorkingHours): boolean => hours.end <= hours.start;

export const formatHour = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;

export const formatHoursRange = (hours: WorkingHours): string =>
  `${formatHour(hours.start)} – ${formatHour(hours.end)}`;

/** True when the day is open but on hours that differ from the shop's default. */
export const hasCustomHours = (
  defaultHours: WorkingHours,
  override: DayScheduleOverride | undefined
): boolean => {
  if (!override || override.isClosed) return false;

  const resolved = resolveWorkingHours(defaultHours, override);
  return resolved.start !== defaultHours.start || resolved.end !== defaultHours.end;
};

/** Short human-readable summary of a day's schedule, for badges and tooltips. */
export const describeDaySchedule = (
  defaultHours: WorkingHours,
  override: DayScheduleOverride | undefined
): string => {
  if (override?.isClosed) return 'Fechado o dia todo';
  if (!hasCustomHours(defaultHours, override)) return `Horário normal (${formatHoursRange(defaultHours)})`;

  return `Horário especial: ${formatHoursRange(resolveWorkingHours(defaultHours, override))}`;
};
