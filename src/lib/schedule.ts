import type { DayScheduleOverride, ShopInfo } from '../types';

export type WorkingHours = ShopInfo['workingHours'];

/** Sunday. The shop never opens, regardless of overrides. */
const WEEKLY_CLOSED_WEEKDAY = 0;

/** Saturday. Open, but on its own (earlier-closing) window rather than the weekday one. */
const SATURDAY_WEEKDAY = 6;

/**
 * The shop's default window FOR A GIVEN DATE, before any per-date override.
 *
 * Saturdays use `saturdayHours` (they close earlier); Monday–Friday use `workingHours`. Sunday is
 * handled by isWeeklyClosedDay, so its hours are never requested. Every date-specific caller must
 * resolve through this rather than reading `shopInfo.workingHours` directly, or a client would be
 * offered weekday hours on a Saturday. Falls back to the weekday window if `saturdayHours` is
 * somehow absent (e.g. a stored ShopInfo that predates the field, before its merge backfills it).
 */
export const baseHoursForDate = (shopInfo: ShopInfo, date: Date): WorkingHours =>
  date.getDay() === SATURDAY_WEEKDAY
    ? shopInfo.saturdayHours ?? shopInfo.workingHours
    : shopInfo.workingHours;

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


// --- Per-barber schedule resolution ------------------------------------------------------------

/**
 * Key a `DayScheduleOverride` is stored under in the booking store.
 *
 * Since migration 0017 an exception is identified by BOTH the date and who it applies to, so the
 * store's map can no longer be keyed by date alone — the shop's holiday and Augusto's day off on
 * the same date are two separate rows that must not overwrite each other.
 */
/* `scope` is a ScheduleScope in practice, but typed as the raw string a stored row carries:
 * a booking may name a barber who has since left the roster, and that row's exceptions still
 * have to be looked up rather than rejected by the type system. */
export const overrideKey = (scope: string, date: string): string => `${scope}:${date}`;

/** Why a day offers no slots, or null when it is open. */
export type ClosedReason =
  /** Sunday: the shop never opens. */
  | 'weekly'
  /** The owner closed the whole shop (holiday, maintenance). */
  | 'shop'
  /** This barber's own day off; the other chair may still be working. */
  | 'barber';

export interface ResolvedDay {
  isClosed: boolean;
  closedBy: ClosedReason | null;
  /** The bookable window. Meaningless when `isClosed`; left at the base hours so callers can format it. */
  hours: WorkingHours;
  /** Open, but on a narrower window than this weekday's default. */
  isCustom: boolean;
}

/** The later opening and the earlier closing of two windows — never wider than either. */
const intersect = (a: WorkingHours, b: WorkingHours): WorkingHours => ({
  start: Math.max(a.start, b.start),
  end: Math.min(a.end, b.end),
});

interface ResolveDayArgs {
  date: Date;
  baseHours: WorkingHours;
  /** The `'shop'`-scoped exception for this date, if any. Applies to every barber. */
  shopOverride: DayScheduleOverride | undefined;
  /** This barber's own exception for this date, if any. */
  barberOverride: DayScheduleOverride | undefined;
}

/**
 * What one barber's day actually looks like, after the shop's exception and their own.
 *
 * The two compose by INTERSECTION rather than substitution: a barber narrowing their own hours
 * must not be able to widen them past a shop-wide short day, and the shop closing must win over
 * any barber window. This is the single place that rule lives — the public calendar, the slot
 * grid, the booking commit check and the admin editor all resolve through it, so none of them can
 * disagree about whether a slot exists.
 */
export const resolveDayForBarber = ({
  date,
  baseHours,
  shopOverride,
  barberOverride,
}: ResolveDayArgs): ResolvedDay => {
  if (isWeeklyClosedDay(date)) {
    return { isClosed: true, closedBy: 'weekly', hours: baseHours, isCustom: false };
  }

  if (shopOverride?.isClosed) {
    return { isClosed: true, closedBy: 'shop', hours: baseHours, isCustom: false };
  }

  if (barberOverride?.isClosed) {
    return { isClosed: true, closedBy: 'barber', hours: baseHours, isCustom: false };
  }

  let hours = resolveWorkingHours(baseHours, shopOverride);
  if (barberOverride) hours = intersect(hours, resolveWorkingHours(baseHours, barberOverride));

  // A window can be narrowed until nothing fits (opens 18:00, closes 18:00). That is a closed day
  // in every way that matters, attributed to whoever narrowed it last.
  if (isEmptyWindow(hours)) {
    return {
      isClosed: true,
      closedBy: barberOverride ? 'barber' : 'shop',
      hours: baseHours,
      isCustom: false,
    };
  }

  return {
    isClosed: false,
    closedBy: null,
    hours,
    isCustom: hours.start !== baseHours.start || hours.end !== baseHours.end,
  };
};

/** Short human-readable summary of a resolved day, for calendar tooltips. */
export const describeResolvedDay = (resolved: ResolvedDay, barberLabel: string): string => {
  if (resolved.isClosed) {
    if (resolved.closedBy === 'shop') return 'Barbearia fechada neste dia';
    if (resolved.closedBy === 'barber') return `${barberLabel} não atende neste dia`;
    return 'Fechado';
  }

  return resolved.isCustom
    ? `Horário especial: ${formatHoursRange(resolved.hours)}`
    : `Horário normal (${formatHoursRange(resolved.hours)})`;
};
