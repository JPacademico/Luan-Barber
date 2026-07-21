import { format, parseISO } from 'date-fns';
import type { Booking, Service } from '../types';

/**
 * WhatsApp Click-to-Chat deep links for cancellation notices.
 *
 * No API, no dependency: `https://wa.me/<number>?text=<message>` opens the admin's WhatsApp with
 * the message pre-filled to the client's number. Sending is still one tap by the admin — a
 * Click-to-Chat link cannot dispatch silently, which is the correct behaviour for a personal
 * cancellation anyway.
 */

/**
 * Normalises a Brazilian phone to wa.me's digits-only, country-coded form.
 * "(79) 9 8817-6953" -> "5579988176953". Idempotent when 55 is already present.
 */
export const toWhatsAppNumber = (rawPhone: string): string => {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
};

interface CancellationContext {
  booking: Booking;
  service: Service | undefined;
  shopName: string;
}

/** A polite, plain-text cancellation message including the date, time and service. */
export const composeCancellationWhatsAppMessage = ({
  booking,
  service,
  shopName,
}: CancellationContext): string => {
  const prettyDate = format(parseISO(booking.date), 'dd/MM/yyyy');

  const lines = [
    `Olá, ${booking.clientName}!`,
    ``,
    `Aqui é da *${shopName}*.`,
    `Infelizmente precisamos *cancelar* o seu agendamento:`,
    ``,
    `*Serviço:* ${service?.name ?? 'Serviço'}`,
    `*Data:* ${prettyDate}`,
    `*Horário:* ${booking.time}`,
    ...(booking.cancellationReason ? ['', `*Motivo:* ${booking.cancellationReason}`] : []),
    ``,
    `Sentimos muito pelo transtorno.`,
    `Podemos remarcar? É só responder esta mensagem e a gente encontra um novo horário pra você.`,
    ``,
    `Um abraço,`,
    `Equipe *${shopName}*`,
  ];

  return lines.join('\n');
};

/** Full wa.me deep link, ready to open in a new tab. */
export const buildCancellationWhatsAppUrl = (context: CancellationContext): string => {
  const number = toWhatsAppNumber(context.booking.clientPhone);
  const text = encodeURIComponent(composeCancellationWhatsAppMessage(context));
  return `https://wa.me/${number}?text=${text}`;
};

// The new-booking → admin notification is now handled automatically by the backend
// (database-triggered), so the client-side wa.me builder for it was removed.
