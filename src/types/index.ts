export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  description: string;
}

export interface DailySpecial {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  abbreviation: string;
  fullDay: string;
  title: string;
  description: string;
}

/** How the client chose to settle the bill. Pix is a simulated flow — no gateway is involved. */
export type PaymentMethod = 'pix' | 'local';

/** Lifecycle of a booking as managed by the admin panel. */
export type BookingStatus = 'active' | 'completed' | 'cancelled';


export interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  /**
   * Service length snapshotted at booking time, in minutes. Drives how many consecutive
   * 30-min slots this booking occupies. Snapshotted (not read live from the service) so that
   * later price/duration edits never retroactively change an existing booking's footprint.
   */
  durationMinutes: number;
  date: string; // ISO format YYYY-MM-DD
  time: string; // HH:mm
  createdAt: string;
  paymentMethod: PaymentMethod;
  /**
   * Set to true only by an admin confirming the money actually arrived.
   * The client's "Já Paguei" click never sets this — it only flags the booking for review.
   */
  isPaid: boolean;
  /** Client claims to have completed the simulated Pix transfer; awaits admin verification. */
  paymentClaimedAt: string | null;
  status: BookingStatus;
  completedAt: string | null;
  cancelledAt: string | null;
  /** Optional note from the admin, included in the cancellation WhatsApp draft. */
  cancellationReason: string | null;
}

/**
 * A per-date exception to the shop's regular hours.
 *
 * Supersedes the old "closed dates" list, which could only express a full day off.
 * `startHour`/`endHour` are hours of the day (24h) and are only meaningful when the day is open;
 * `null` means "use the shop's default" for that edge, so an afternoon-only day is
 * `{ startHour: 12, endHour: null }`.
 */
export interface DayScheduleOverride {
  date: string; // YYYY-MM-DD
  isClosed: boolean;
  startHour: number | null;
  endHour: number | null;
}

export interface CertificateSlot {
  id: string;
  title: string;
  imageUrl: string;
  year: number;
}

export interface OwnerProfile {
  name: string;
  title: string;
  bio: string;
  since: number;
  /** Headline figure shown on the About section. */
  clientsServed: number;
  imageUrl: string;
  certificates: CertificateSlot[];
}

export interface ShopInfo {
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  instagramHandle: string;
  mapEmbedUrl: string;
  pixKey: string;
  workingHours: {
    start: number; // 9
    end: number; // 18
  };
}

export interface CarouselImage {
  id: string;
  url: string;
  alt: string;
  order: number;
}

/**
 * The admin-edited site content that syncs across devices as one document (the `shop_content`
 * cloud table). Everything the "Conteúdo" panel writes — kept together because it's saved,
 * fetched and stored as a whole. Services sync separately (their own table).
 */
export interface ShopContent {
  owner: OwnerProfile;
  carouselImages: CarouselImage[];
  shopInfo: ShopInfo;
}
