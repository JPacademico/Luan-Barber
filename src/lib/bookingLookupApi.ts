import { API_BASE_URL, IS_BACKEND_ENABLED } from './env';
import { digitsOnly } from './myBookings';
import { rowToBooking, type BookingRow } from './supabaseClient';
import { useBookingStore } from '../store/bookingStore';
import type { Booking } from '../types';

/**
 * Client for the two scoped lookup Edge Functions (lookup-bookings-by-ids,
 * lookup-booking-by-phone — Luan-Studio-Back, migration 0014). Calling these instead of filtering
 * the store's already-loaded `allBookings` is the point: it avoids the client-facing "Meus
 * Agendamentos" UI turning the app's existing wide-open booking read into a directory search. See
 * IMPLEMENTATION.md §C2.
 *
 * Falls back to filtering the local store when the backend isn't deployed (VITE_API_BASE_URL
 * unset), same degrade-gracefully posture as Pix and push elsewhere in this app. In that mode the
 * store is whatever this repository backend provides — local-only storage has no cross-client PII
 * to protect in the first place, so the fallback carries no new exposure.
 */

interface LookupResponse {
  bookings?: BookingRow[];
}

const parseBookings = async (response: Response): Promise<Booking[]> => {
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`lookup failed (${response.status}): ${detail}`);
  }
  const body = (await response.json()) as LookupResponse;
  return (body.bookings ?? []).map(rowToBooking);
};

const localFallbackByIds = (ids: string[]): Booking[] => {
  const idSet = new Set(ids);
  return useBookingStore.getState().allBookings.filter((b) => idSet.has(b.id));
};

const localFallbackByPhone = (phone: string): Booking[] => {
  const digits = digitsOnly(phone);
  return useBookingStore
    .getState()
    .allBookings.filter((b) => {
      const bookingDigits = digitsOnly(b.clientPhone);
      return bookingDigits.endsWith(digits) || digits.endsWith(bookingDigits);
    });
};

export const lookupBookingsByIds = async (ids: string[]): Promise<Booking[]> => {
  if (ids.length === 0) return [];
  if (!IS_BACKEND_ENABLED) return localFallbackByIds(ids);

  try {
    const response = await fetch(`${API_BASE_URL}/lookup-bookings-by-ids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return await parseBookings(response);
  } catch (error) {
    console.error('[myBookings] lookup-bookings-by-ids unreachable', error);
    // A network hiccup shouldn't leave the page blank when the store already has the answer.
    return localFallbackByIds(ids);
  }
};

export const lookupBookingByPhone = async (phone: string): Promise<Booking[]> => {
  if (!IS_BACKEND_ENABLED) return localFallbackByPhone(phone);

  try {
    const response = await fetch(`${API_BASE_URL}/lookup-booking-by-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return await parseBookings(response);
  } catch (error) {
    console.error('[myBookings] lookup-booking-by-phone unreachable', error);
    return localFallbackByPhone(phone);
  }
};
