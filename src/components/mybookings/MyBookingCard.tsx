import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarClock, CheckCircle2, Clock, Phone, XCircle } from 'lucide-react';
import type { Booking, Service } from '../../types';

interface MyBookingCardProps {
  booking: Booking;
  service: Service | undefined;
  onCancel: () => void;
  onReschedule: () => void;
}

const formatPrice = (price: number | undefined): string =>
  price === undefined ? '' : `R$ ${price.toFixed(2).replace('.', ',')}`;

const STATUS_APPEARANCE: Record<Booking['status'], { label: string; className: string; icon: React.ReactNode }> = {
  active: {
    label: 'Confirmado',
    className: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
    icon: <CheckCircle2 size={13} />,
  },
  completed: {
    label: 'Concluído',
    className: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30',
    icon: <CheckCircle2 size={13} />,
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
    icon: <XCircle size={13} />,
  },
};

export const MyBookingCard: React.FC<MyBookingCardProps> = ({ booking, service, onCancel, onReschedule }) => {
  const status = STATUS_APPEARANCE[booking.status];
  const isActive = booking.status === 'active';
  const wasRescheduled = Boolean(booking.rescheduledAt && booking.originalDate && booking.originalTime);

  return (
    <article className="bg-white dark:bg-brand-darkgray rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h4 className="font-display font-bold text-lg text-brand-black dark:text-white truncate">
            {service?.name ?? 'Serviço removido'}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
            <Clock size={13} className="shrink-0" />
            {format(parseISO(booking.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {booking.time}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 mt-1">
            <Phone size={11} className="shrink-0" /> {booking.clientPhone}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${status.className}`}
        >
          {status.icon}
          {status.label}
        </span>
      </div>

      {wasRescheduled && (
        <p className="flex items-center gap-1.5 text-xs text-brand-gold bg-brand-gold/10 border border-brand-gold/30 rounded-lg px-3 py-1.5 mb-3">
          <CalendarClock size={12} className="shrink-0" />
          Remarcado — era {format(parseISO(booking.originalDate as string), 'dd/MM')} às {booking.originalTime}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="font-semibold text-brand-gold tabular-nums text-sm">{formatPrice(service?.price)}</span>

        {isActive && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReschedule}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border-2 border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-black transition-colors whitespace-nowrap"
            >
              Remarcar
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
