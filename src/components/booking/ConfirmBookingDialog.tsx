import React from 'react';
import { CalendarCheck, Clock, CreditCard, Scissors, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { PaymentMethod } from '../../types';

interface ConfirmBookingDialogProps {
  serviceName: string;
  price: number;
  /** Already formatted for display, e.g. "05/08/2026". */
  dateLabel: string;
  /** Weekday shown under the question, e.g. "quarta-feira". */
  weekdayLabel: string;
  time: string;
  paymentMethod: PaymentMethod;
  clientName: string;
  onConfirm: () => void;
  onClose: () => void;
}

const formatCurrency = (value: number): string => `R$ ${value.toFixed(2).replace('.', ',')}`;

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix antecipado',
  local: 'Pagar na barbearia',
};

/**
 * Last step before a slot is actually taken: restates the booking and waits for an explicit tap.
 *
 * Nothing is written until `onConfirm` fires — closing or tapping outside leaves the form exactly
 * as the client filled it, so they can correct a wrong service or time without retyping.
 */
export const ConfirmBookingDialog: React.FC<ConfirmBookingDialogProps> = ({
  serviceName,
  price,
  dateLabel,
  weekdayLabel,
  time,
  paymentMethod,
  clientName,
  onConfirm,
  onClose,
}) => {
  const rows = [
    { icon: <Scissors size={15} />, label: 'Serviço', value: serviceName },
    { icon: <CalendarCheck size={15} />, label: 'Data', value: `${dateLabel} · ${weekdayLabel}` },
    { icon: <Clock size={15} />, label: 'Horário', value: time },
    { icon: <CreditCard size={15} />, label: 'Pagamento', value: PAYMENT_LABEL[paymentMethod] },
  ];

  return (
    <Modal
      labelledBy="confirm-booking-title"
      onClose={onClose}
      className="max-w-md bg-white dark:bg-brand-gray border border-gray-200 dark:border-gray-800"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:text-brand-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <X size={18} />
      </button>

      <div className="p-6 sm:p-8">
        <header className="mb-6 pr-8">
          <span className="inline-flex p-2.5 rounded-xl bg-brand-gold/15 text-brand-gold mb-4">
            <CalendarCheck size={22} />
          </span>

          <h3
            id="confirm-booking-title"
            className="font-display font-bold text-xl sm:text-2xl leading-snug text-brand-black dark:text-white text-balance"
          >
            Agendar {serviceName} para {dateLabel} às {time}?
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Confira os dados antes de confirmar, {clientName.split(' ')[0]}.
          </p>
        </header>

        <dl className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 overflow-hidden mb-4">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 px-4 py-3">
              <span className="text-brand-gold shrink-0">{row.icon}</span>
              <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 shrink-0">
                {row.label}
              </dt>
              <dd className="ml-auto text-sm font-medium text-brand-black dark:text-white text-right min-w-0 truncate">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex items-baseline justify-between px-4 py-3 rounded-xl bg-brand-gold/10 mb-6">
          <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Total
          </span>
          <span className="font-display font-bold text-2xl text-brand-gold tabular-nums">
            {formatCurrency(price)}
          </span>
        </div>

        {/* Reversed on mobile so the primary action sits under the thumb, not above it. */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 rounded border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className="btn-primary flex-1 py-4 text-base font-bold uppercase tracking-wider"
          >
            Confirmar
          </button>
        </div>
      </div>
    </Modal>
  );
};
