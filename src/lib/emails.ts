import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Booking, Service, ShopInfo } from '../types';

/**
 * Cancellation notice composition.
 *
 * Sending is deliberately manual: the app has no backend, and the admin decides case by case
 * whether an email is even warranted (often the client is told by WhatsApp instead). This module
 * only drafts the text; `buildMailtoUrl` hands it to the admin's own mail client on request.
 */

interface EmailContext {
  booking: Booking;
  service: Service | undefined;
  shopInfo: ShopInfo;
  shopName: string;
}

export interface DraftedEmail {
  to: string;
  subject: string;
  body: string;
}

const formatPrice = (price: number | undefined): string =>
  price === undefined ? 'o valor pago' : `R$ ${price.toFixed(2).replace('.', ',')}`;

const formatLongDate = (date: string): string =>
  format(parseISO(date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

export const composeCancellationEmail = ({
  booking,
  service,
  shopInfo,
  shopName,
}: EmailContext): DraftedEmail => ({
  to: booking.clientEmail,
  subject: `Agendamento cancelado — ${format(parseISO(booking.date), 'dd/MM')} às ${booking.time}`,
  body: [
    `Olá, ${booking.clientName}.`,
    ``,
    `Infelizmente precisamos cancelar o seu agendamento na ${shopName}:`,
    ``,
    `Serviço: ${service?.name ?? 'Serviço'}`,
    `Data: ${formatLongDate(booking.date)}`,
    `Horário: ${booking.time}`,
    ``,
    booking.cancellationReason
      ? `Motivo: ${booking.cancellationReason}`
      : `Sentimos muito pelo transtorno.`,
    ``,
    booking.paymentMethod === 'pix' && booking.isPaid
      ? `Como o pagamento via Pix já havia sido confirmado, entraremos em contato para combinar a devolução de ${formatPrice(service?.price)}.`
      : `Nenhum valor foi cobrado.`,
    ``,
    `Queremos muito atender você: entre em contato pelo ${shopInfo.phone} para escolher um novo horário.`,
    ``,
    `Obrigado pela compreensão,`,
    `${shopName}`,
  ].join('\n'),
});

/** Hands the drafted message to the admin's default mail client. */
export const buildMailtoUrl = ({ to, subject, body }: DraftedEmail): string =>
  `mailto:${encodeURIComponent(to)}` +
  `?subject=${encodeURIComponent(subject)}` +
  `&body=${encodeURIComponent(body)}`;
