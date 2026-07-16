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

/** A polite, stylised cancellation message including the date, time and service. */
export const composeCancellationWhatsAppMessage = ({
  booking,
  service,
  shopName,
}: CancellationContext): string => {
  const prettyDate = format(parseISO(booking.date), 'dd/MM/yyyy');

  const lines = [
    `Olá, ${booking.clientName}! 👋`,
    ``,
    `Aqui é da *${shopName}*.`,
    `Infelizmente precisamos *cancelar* o seu agendamento:`,
    ``,
    `✂️ Serviço: ${service?.name ?? 'Serviço'}`,
    `📅 Data: ${prettyDate}`,
    `⏰ Horário: ${booking.time}`,
    ...(booking.cancellationReason ? ['', `ℹ️ Motivo: ${booking.cancellationReason}`] : []),
    ``,
    `Sentimos muito pelo transtorno. 🙏`,
    `Podemos remarcar? É só responder esta mensagem e a gente encontra um novo horário pra você.`,
    ``,
    `Um abraço,`,
    `Equipe ${shopName}`,
  ];

  return lines.join('\n');
};

/** Full wa.me deep link, ready to open in a new tab. */
export const buildCancellationWhatsAppUrl = (context: CancellationContext): string => {
  const number = toWhatsAppNumber(context.booking.clientPhone);
  const text = encodeURIComponent(composeCancellationWhatsAppMessage(context));
  return `https://wa.me/${number}?text=${text}`;
};

interface BookingNotificationContext {
  booking: Booking;
  service: Service | undefined;
  shopName: string;
  /** The shop's WhatsApp number, which is the admin's — the message is addressed here. */
  adminWhatsapp: string;
}

const formatPrice = (price: number | undefined): string =>
  price === undefined ? 'a combinar' : `R$ ${price.toFixed(2).replace('.', ',')}`;

/**
 * Notifies the barbershop (admin) that a booking was just made.
 *
 * A frontend cannot send WhatsApp silently — that needs the WhatsApp Business API and a backend.
 * The realistic client-side path is Click-to-Chat: this opens a chat addressed to the admin's
 * number with the booking details pre-filled, written from the CLIENT's point of view so it reads
 * naturally for the person who taps "send". The admin then receives it on their WhatsApp.
 */
export const buildBookingNotificationWhatsAppUrl = ({
  booking,
  service,
  shopName,
  adminWhatsapp,
}: BookingNotificationContext): string => {
  const prettyDate = format(parseISO(booking.date), 'dd/MM/yyyy');
  const payment = booking.paymentMethod === 'pix' ? 'Pix antecipado' : 'Na barbearia';

  const lines = [
    `Olá, ${shopName}! ✅`,
    `Acabei de agendar um horário pelo site:`,
    ``,
    `👤 Nome: ${booking.clientName}`,
    `✂️ Serviço: ${service?.name ?? 'Serviço'}`,
    `📅 Data: ${prettyDate} às ${booking.time}`,
    `💳 Pagamento: ${payment}`,
    `💰 Valor: ${formatPrice(service?.price)}`,
    ``,
    `Podem confirmar, por favor? Obrigado! 🙏`,
  ];

  const number = toWhatsAppNumber(adminWhatsapp);
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;
};
