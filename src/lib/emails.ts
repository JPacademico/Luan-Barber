import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Booking, Service, ShopInfo } from '../types';
import {
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  FORMSPREE_ENDPOINT,
  IS_EMAILJS_ENABLED,
  IS_FORMSPREE_ENABLED,
} from './env';

/**
 * Cancellation email: composition plus a best-effort client-side send.
 *
 * With no backend, "sending" means one of three channels, tried in order of how automatic they
 * are: EmailJS → Formspree → the admin's own mail client (mailto). The first two dispatch without
 * the admin leaving the app when their keys are configured; the mailto fallback always works.
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

/** Which channel actually handled the email. `mailto` means the admin's mail client was opened. */
export type EmailChannel = 'emailjs' | 'formspree' | 'mailto';

export interface EmailDispatchResult {
  channel: EmailChannel;
  ok: boolean;
}

const sendViaEmailJS = async (draft: DraftedEmail): Promise<boolean> => {
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: { to_email: draft.to, subject: draft.subject, message: draft.body },
    }),
  });
  return response.ok;
};

const sendViaFormspree = async (draft: DraftedEmail): Promise<boolean> => {
  const response = await fetch(FORMSPREE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: draft.to, _subject: draft.subject, message: draft.body }),
  });
  return response.ok;
};

/**
 * Best-effort send. Tries a configured provider first; on any failure (or none configured) falls
 * back to opening the admin's mail client, which is guaranteed to work. Never throws.
 */
export const dispatchCancellationEmail = async (
  draft: DraftedEmail
): Promise<EmailDispatchResult> => {
  if (IS_EMAILJS_ENABLED) {
    try {
      if (await sendViaEmailJS(draft)) return { channel: 'emailjs', ok: true };
    } catch {
      // fall through to the next channel
    }
  }

  if (IS_FORMSPREE_ENABLED) {
    try {
      if (await sendViaFormspree(draft)) return { channel: 'formspree', ok: true };
    } catch {
      // fall through to mailto
    }
  }

  window.open(buildMailtoUrl(draft), '_blank');
  return { channel: 'mailto', ok: true };
};
