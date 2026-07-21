import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';
import type {
  Booking,
  BookingStatus,
  DayScheduleOverride,
  PaymentMethod,
  Service,
} from '../types';

/**
 * Minimal Supabase data client built on `fetch` against PostgREST.
 *
 * We deliberately avoid the `@supabase/supabase-js` dependency: the REST surface is tiny, this
 * keeps the bundle lean, and it can be fully type-checked and built without installing anything.
 * The trade-off is that we poll for changes instead of using the Realtime WebSocket — see
 * SupabaseBookingRepository. Auth is the anon key; the database's Row Level Security is the real
 * gatekeeper.
 */

const REST_URL = `${SUPABASE_URL}/rest/v1`;

const baseHeaders: Record<string, string> = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

const request = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const url = `${REST_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: { ...baseHeaders, ...(init.headers as Record<string, string> | undefined) },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // The full URL (not just the path) is included: a malformed VITE_SUPABASE_URL is invisible
    // otherwise, and it is the most common cause of a 404 here.
    throw new Error(
      `Supabase ${init.method ?? 'GET'} ${url} failed (${response.status}): ${detail}`
    );
  }

  return response;
};

// --- Row shapes (snake_case, as stored) --------------------------------------------------------

interface BookingRow {
  id: string;
  client_name: string;
  client_phone: string;
  service_id: string;
  duration_minutes: number;
  date: string;
  time: string;
  created_at: string;
  payment_method: PaymentMethod;
  is_paid: boolean;
  payment_claimed_at: string | null;
  status: BookingStatus;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

interface OverrideRow {
  date: string;
  is_closed: boolean;
  start_hour: number | null;
  end_hour: number | null;
}

interface ServiceRow {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  description: string | null;
  active: boolean;
}

// --- Mappers -----------------------------------------------------------------------------------

const rowToBooking = (row: BookingRow): Booking => ({
  id: row.id,
  clientName: row.client_name,
  clientPhone: row.client_phone,
  serviceId: row.service_id,
  durationMinutes: row.duration_minutes ?? 30,
  date: row.date,
  time: (row.time ?? '').slice(0, 5), // Postgres `time` may come back as HH:mm:ss
  createdAt: row.created_at,
  paymentMethod: row.payment_method ?? 'local',
  isPaid: row.is_paid ?? false,
  paymentClaimedAt: row.payment_claimed_at,
  status: row.status ?? 'active',
  completedAt: row.completed_at,
  cancelledAt: row.cancelled_at,
  cancellationReason: row.cancellation_reason,
});

const bookingToRow = (booking: Booking): BookingRow => ({
  id: booking.id,
  client_name: booking.clientName,
  client_phone: booking.clientPhone,
  service_id: booking.serviceId,
  duration_minutes: booking.durationMinutes,
  date: booking.date,
  time: booking.time,
  created_at: booking.createdAt,
  payment_method: booking.paymentMethod,
  is_paid: booking.isPaid,
  payment_claimed_at: booking.paymentClaimedAt,
  status: booking.status,
  completed_at: booking.completedAt,
  cancelled_at: booking.cancelledAt,
  cancellation_reason: booking.cancellationReason,
});

/** Cents -> reais. The database stores integers so no float rounding can alter a Pix charge. */
const rowToService = (row: ServiceRow): Service => ({
  id: row.id,
  name: row.name,
  price: row.price_cents / 100,
  duration: row.duration_minutes,
  description: row.description ?? '',
});

const rowToOverride = (row: OverrideRow): DayScheduleOverride => ({
  date: row.date,
  isClosed: row.is_closed,
  startHour: row.start_hour,
  endHour: row.end_hour,
});

const overrideToRow = (override: DayScheduleOverride): OverrideRow => ({
  date: override.date,
  is_closed: override.isClosed,
  start_hour: override.startHour,
  end_hour: override.endHour,
});

// --- Public data operations --------------------------------------------------------------------

export const supabaseApi = {
  async fetchBookings(): Promise<Booking[]> {
    const response = await request('/bookings?select=*&order=date.asc,time.asc');
    const rows = (await response.json()) as BookingRow[];
    return rows.map(rowToBooking);
  },

  /**
   * The service catalogue as the database has it — the same rows Pix prices from, so the site
   * can never advertise a price different from the one that gets charged. RLS returns only
   * `active` rows.
   */
  async fetchServices(): Promise<Service[]> {
    const response = await request('/services?select=*&order=id.asc');
    const rows = (await response.json()) as ServiceRow[];
    return rows.map(rowToService);
  },

  async fetchOverrides(): Promise<DayScheduleOverride[]> {
    const response = await request('/day_overrides?select=*');
    const rows = (await response.json()) as OverrideRow[];
    return rows.map(rowToOverride);
  },

  async insertBooking(booking: Booking): Promise<void> {
    await request('/bookings', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(bookingToRow(booking)),
    });
  },

  async patchBooking(id: string, patch: Partial<Booking>): Promise<void> {
    // Translate only the provided camelCase fields to their snake_case columns.
    const columnMap: Record<string, string> = {
      isPaid: 'is_paid',
      paymentClaimedAt: 'payment_claimed_at',
      status: 'status',
      completedAt: 'completed_at',
      cancelledAt: 'cancelled_at',
      cancellationReason: 'cancellation_reason',
    };

    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      const column = columnMap[key];
      if (column) body[column] = value;
    }
    if (Object.keys(body).length === 0) return;

    await request(`/bookings?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    });
  },

  async deleteBooking(id: string): Promise<void> {
    await request(`/bookings?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async upsertOverride(override: DayScheduleOverride): Promise<void> {
    await request('/day_overrides', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(overrideToRow(override)),
    });
  },

  async deleteOverride(date: string): Promise<void> {
    await request(`/day_overrides?date=eq.${encodeURIComponent(date)}`, { method: 'DELETE' });
  },
};
