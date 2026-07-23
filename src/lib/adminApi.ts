import { API_BASE_URL, IS_BACKEND_ENABLED } from './env';
import type { Service, ShopContent } from '../types';

/**
 * Calls to the admin-only Edge Functions.
 *
 * These are the writes the public anon key deliberately cannot perform. `services.price_cents` is
 * the amount Pix actually charges, so the server verifies the admin password (held only as a
 * backend secret) before touching it — see Luan-Studio-Back/supabase/functions/_shared/adminAuth.ts.
 */

/** Where the admin password lives for the session, so privileged writes can re-send it. */
const PASSWORD_KEY = 'adminPassword';

export const rememberAdminPassword = (password: string): void => {
  try {
    sessionStorage.setItem(PASSWORD_KEY, password);
  } catch {
    // Private mode with storage disabled: saving prices will prompt for the password again.
  }
};

export const readAdminPassword = (): string => {
  try {
    return sessionStorage.getItem(PASSWORD_KEY) ?? '';
  } catch {
    return '';
  }
};

export const forgetAdminPassword = (): void => {
  try {
    sessionStorage.removeItem(PASSWORD_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
};

export type AdminAuthOutcome = 'ok' | 'wrong-password' | 'unreachable' | 'misconfigured';

/** Verifies the typed password against the backend. */
export const verifyAdminPassword = async (password: string): Promise<AdminAuthOutcome> => {
  if (!IS_BACKEND_ENABLED) return 'misconfigured';

  try {
    const response = await fetch(`${API_BASE_URL}/verify-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (response.ok) return 'ok';
    if (response.status === 401) return 'wrong-password';

    // 500 here means ADMIN_PASSWORD was never set as a secret — a setup gap, not a typo.
    console.error('[admin] verify-admin failed', response.status, await response.text().catch(() => ''));
    return 'misconfigured';
  } catch (error) {
    console.error('[admin] verify-admin unreachable', error);
    return 'unreachable';
  }
};

export type ServiceSyncOutcome = 'synced' | 'skipped' | 'unauthorized' | 'failed';

/**
 * Pushes the whole catalogue to the database, which is what Pix prices from.
 *
 * Prices are converted to integer cents here: sending reais as a float would let rounding shave
 * money off a charge. `Math.round` guards against 45.10 arriving as 45.099999999999994.
 */
export const pushServicesToBackend = async (services: Service[]): Promise<ServiceSyncOutcome> => {
  if (!IS_BACKEND_ENABLED) return 'skipped';

  const password = readAdminPassword();
  if (!password) return 'unauthorized';

  try {
    const response = await fetch(`${API_BASE_URL}/update-services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        services: services.map((service) => ({
          id: service.id,
          name: service.name,
          priceCents: Math.round(service.price * 100),
          durationMinutes: service.duration,
          description: service.description,
        })),
      }),
    });

    if (response.ok) return 'synced';
    if (response.status === 401) return 'unauthorized';

    console.error('[admin] update-services failed', response.status, await response.text().catch(() => ''));
    return 'failed';
  } catch (error) {
    console.error('[admin] update-services unreachable', error);
    return 'failed';
  }
};

/**
 * Pushes the shared site content (owner, carousel, shop info) so every device shows the same
 * thing — most importantly the working hours that drive the client booking grid.
 */
export const pushShopContentToBackend = async (
  content: ShopContent
): Promise<ServiceSyncOutcome> => {
  if (!IS_BACKEND_ENABLED) return 'skipped';

  const password = readAdminPassword();
  if (!password) return 'unauthorized';

  try {
    const response = await fetch(`${API_BASE_URL}/update-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, content }),
    });

    if (response.ok) return 'synced';
    if (response.status === 401) return 'unauthorized';

    console.error('[admin] update-content failed', response.status, await response.text().catch(() => ''));
    return 'failed';
  } catch (error) {
    console.error('[admin] update-content unreachable', error);
    return 'failed';
  }
};
