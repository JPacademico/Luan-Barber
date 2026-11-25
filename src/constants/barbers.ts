/**
 * The shop's barbers.
 *
 * A fixed roster rather than a database table: the shop has two chairs and adding a third is a
 * hiring decision, not a self-service action, so a table plus CRUD UI would be cost without a
 * payer. Everything downstream keys off `BarberId`, so adding a barber is this file plus a
 * password secret (see Luan-Studio-Back `_shared/adminAuth.ts`).
 *
 * `id` is written into `bookings.barber_id` and `day_overrides.barber_id` and must never change
 * once rows exist; `name` is display text and is safe to edit.
 */

export type BarberId = 'luan' | 'augusto';

export interface Barber {
  id: BarberId;
  /** Shown to clients in the booking picker and to the admin in the agenda. */
  name: string;
  /** One short line under the name in the public picker. */
  title: string;
  /** The owner sees every agenda; an employee sees only their own. */
  isOwner: boolean;
}

export const BARBERS: readonly Barber[] = [
  { id: 'luan', name: 'Luan', title: 'Fundador & Master Barber', isOwner: true },
  { id: 'augusto', name: 'Augusto', title: 'Barbeiro', isOwner: false },
] as const;

/**
 * Who a booking belongs to when nothing says otherwise — every booking taken before the shop had
 * a second barber. Must match the backfill default in migration 0017.
 */
export const DEFAULT_BARBER_ID: BarberId = 'luan';

const BY_ID = new Map<string, Barber>(BARBERS.map((barber) => [barber.id, barber]));

export const isBarberId = (value: unknown): value is BarberId =>
  typeof value === 'string' && BY_ID.has(value);

/** The roster entry, or undefined for an id that is no longer on the roster (a departed barber). */
export const findBarber = (id: string): Barber | undefined => BY_ID.get(id);

/**
 * Display name for any stored id. A booking whose barber has left the roster still has to render,
 * so this degrades to the raw id rather than throwing or showing an empty chair.
 */
export const barberName = (id: string): string => BY_ID.get(id)?.name ?? id;

/**
 * What a schedule exception applies to.
 *
 * `'shop'` closes or shortens the day for EVERYONE (a holiday, a power cut) and only the owner can
 * set it; a `BarberId` scope is one barber's own day off and leaves the other chair working. Both
 * are rows in `day_overrides`, told apart by `barber_id` — see migration 0017.
 */
export type ScheduleScope = 'shop' | BarberId;

export const SHOP_SCOPE = 'shop' as const;

export const isScheduleScope = (value: unknown): value is ScheduleScope =>
  value === SHOP_SCOPE || isBarberId(value);

/** Label for a scope, for the admin's scope switcher and for toasts. */
export const scopeLabel = (scope: ScheduleScope): string =>
  scope === SHOP_SCOPE ? 'Toda a barbearia' : barberName(scope);
