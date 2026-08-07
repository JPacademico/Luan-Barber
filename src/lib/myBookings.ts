/**
 * Identifies "my bookings" on this device, without any login.
 *
 * A booking id is remembered here the moment it's created (BookingForm.handleConfirmBooking), so
 * the same device that booked it can find it again later purely from localStorage — no network
 * round-trip, no PII leaves the device for this path. A client returning on a DIFFERENT device has
 * no local memory to draw on; that case is what the phone lookup (lib/bookingLookupApi.ts) is for.
 */

const REMEMBERED_KEY = 'luan-studio-my-bookings';
/** Bounds the list so a shared/kiosk device that's booked many times doesn't grow this forever. */
const MAX_REMEMBERED = 30;

const readRaw = (): string[] => {
  try {
    const raw = localStorage.getItem(REMEMBERED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    // Corrupt storage or private-mode restrictions: behave as if nothing is remembered.
    return [];
  }
};

const writeRaw = (ids: string[]): void => {
  try {
    localStorage.setItem(REMEMBERED_KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable (private mode, quota) — the booking still succeeded server-side; the
    // client just won't see it under Meus Agendamentos on this device without the phone lookup.
  }
};

export const readRememberedIds = (): string[] => readRaw();

/** Called right after a booking is created, so this device can find it again later. */
export const rememberBooking = (id: string): void => {
  const ids = readRaw().filter((existing) => existing !== id);
  ids.push(id);
  writeRaw(ids.slice(-MAX_REMEMBERED));
};

/** Called after a cancellation — no point keeping a dead reference around indefinitely. Optional
 *  tidiness, not load-bearing: a cancelled booking's id lookup still resolves fine either way. */
export const forgetBooking = (id: string): void => {
  writeRaw(readRaw().filter((existing) => existing !== id));
};

/** Digits only, so "(79) 9 8817-6953", "79988176953" and "5579988176953" all compare equal.
 *  Mirrors lib/whatsapp.ts's approach but without forcing the 55 country-code prefix — the phone
 *  lookup backend already tolerates either side having it or not. */
export const digitsOnly = (raw: string): string => raw.replace(/\D/g, '');

export const isPlausiblePhone = (raw: string): boolean => {
  const digits = digitsOnly(raw);
  return digits.length >= 10 && digits.length <= 13;
};
