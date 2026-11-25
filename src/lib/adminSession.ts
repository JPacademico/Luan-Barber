import { DEFAULT_BARBER_ID, isBarberId, type BarberId } from '../constants/barbers';

/**
 * Who is logged into /admin for this browser session.
 *
 * Two logins exist, told apart by which password was accepted (verified server-side — see
 * Luan-Studio-Back `_shared/adminAuth.ts`):
 *
 *  - `owner`  — Luan. Sees both agendas and every panel, and is the only login the server accepts
 *               for price and content writes.
 *  - `barber` — an employee. Sees only their own agenda, their own numbers and their own days off.
 *
 * IMPORTANT — what this does and does not protect. The role decides what the PANEL offers, and it
 * is the server that refuses an employee's password on `update-services` / `update-content`, so
 * prices and site content are genuinely owner-only. Bookings and `day_overrides`, by contrast, are
 * still written straight to PostgREST under the public anon key with `using (true)` RLS (the
 * pre-existing open trust model — see IMPLEMENTATION.md). So an employee is kept out of the
 * owner's agenda by the UI, not by the database. Closing that gap means real per-row auth and is
 * its own piece of work; nothing here makes it worse than it already was.
 */

export type AdminRole = 'owner' | 'barber';

export interface AdminSession {
  role: AdminRole;
  /** The chair this login works. The owner's own agenda is Luan's. */
  barberId: BarberId;
}

const SESSION_KEY = 'adminSession';
/** Pre-roles key. Read once so a panel already open across a deploy isn't logged out. */
const LEGACY_AUTH_KEY = 'adminAuth';

const isAdminRole = (value: unknown): value is AdminRole =>
  value === 'owner' || value === 'barber';

export const readAdminSession = (): AdminSession | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        isAdminRole((parsed as AdminSession).role) &&
        isBarberId((parsed as AdminSession).barberId)
      ) {
        return parsed as AdminSession;
      }
      // Unrecognised shape: treat as no session rather than guessing at a role.
      return null;
    }

    // Only the owner could log in before roles existed.
    if (sessionStorage.getItem(LEGACY_AUTH_KEY) === 'true') {
      return { role: 'owner', barberId: DEFAULT_BARBER_ID };
    }
  } catch {
    // Storage disabled (private mode): the gate simply asks for the password again.
  }

  return null;
};

export const writeAdminSession = (session: AdminSession): void => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.removeItem(LEGACY_AUTH_KEY);
  } catch {
    // The session still works in memory; it just won't survive a reload.
  }
};

export const clearAdminSession = (): void => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LEGACY_AUTH_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
};
