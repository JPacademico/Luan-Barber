import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { Booking, Service } from '../../types';

interface ClientCancelDialogProps {
  booking: Booking;
  service: Service | undefined;
  onConfirm: (reason: string | null) => void;
  onClose: () => void;
}

/** Client-facing mirror of admin/CancelAppointmentDialog.tsx, styled for the public site instead
 *  of the dark admin panel. No quick-reason chips — those were written from the barber's point of
 *  view ("Barbeiro indisponível"), which doesn't make sense coming from the client. */
export const ClientCancelDialog: React.FC<ClientCancelDialogProps> = ({
  booking,
  service,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');

  const isPaidPix = booking.paymentMethod === 'pix' && booking.isPaid;

  return (
    <Modal
      labelledBy="client-cancel-dialog-title"
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
          <span className="inline-flex p-2.5 rounded-xl bg-red-500/10 text-red-500 mb-4">
            <AlertTriangle size={22} />
          </span>
          <h3
            id="client-cancel-dialog-title"
            className="font-display font-bold text-xl text-brand-black dark:text-white text-balance"
          >
            Cancelar seu agendamento?
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {service?.name ?? 'Serviço'} · {format(parseISO(booking.date), 'dd/MM/yyyy')} às{' '}
            {booking.time}
          </p>
        </header>

        {isPaidPix && (
          <p className="flex items-start gap-2 p-3 mb-5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            O pagamento via Pix já foi confirmado. O estorno é feito diretamente pela barbearia —
            entre em contato para combinar.
          </p>
        )}

        <div className="mb-6">
          <label
            htmlFor="client-cancel-reason"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Motivo (opcional)
          </label>
          <textarea
            id="client-cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Conte pra gente o que houve, se quiser"
            className="w-full px-3 py-2 bg-white dark:bg-brand-darkgray border border-gray-300 dark:border-gray-700 rounded text-sm text-brand-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold resize-none"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim() || null)}
            className="flex-1 py-3 rounded bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            Cancelar agendamento
          </button>
        </div>
      </div>
    </Modal>
  );
};
