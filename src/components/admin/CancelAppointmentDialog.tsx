import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { Booking, Service } from '../../types';

interface CancelAppointmentDialogProps {
  booking: Booking;
  service: Service | undefined;
  onConfirm: (reason: string | null) => void;
  onClose: () => void;
}

const QUICK_REASONS = ['Imprevisto na barbearia', 'Barbeiro indisponível', 'Solicitação do cliente'];

export const CancelAppointmentDialog: React.FC<CancelAppointmentDialogProps> = ({
  booking,
  service,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');

  const shouldWarnAboutRefund = booking.paymentMethod === 'pix' && booking.isPaid;

  return (
    <Modal
      labelledBy="cancel-dialog-title"
      onClose={onClose}
      className="max-w-md bg-[#1a1a1a] border border-gray-800 font-admin"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-4 right-4 p-1.5 rounded-full text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
      >
        <X size={18} />
      </button>

      <div className="p-6">
        <div className="flex items-start gap-3 mb-5">
          <span className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
            <AlertTriangle size={18} />
          </span>
          <div className="min-w-0">
            <h3 id="cancel-dialog-title" className="text-white font-semibold tracking-tight">
              Cancelar agendamento
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              {booking.clientName} · {service?.name ?? 'Serviço'} ·{' '}
              {format(parseISO(booking.date), 'dd/MM')} às {booking.time}
            </p>
          </div>
        </div>

        {shouldWarnAboutRefund && (
          <p className="flex items-start gap-2 p-3 mb-5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            O pagamento via Pix deste cliente já foi confirmado. O estorno precisa ser feito por
            fora.
          </p>
        )}

        <div className="mb-5">
          <label htmlFor="cancel-reason" className="block text-xs font-medium text-slate-400 mb-2">
            Motivo (opcional)
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Ex: Imprevisto na barbearia"
            className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-gold resize-none"
          />

          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_REASONS.map((quickReason) => (
              <button
                key={quickReason}
                type="button"
                onClick={() => setReason(quickReason)}
                className="px-2.5 py-1 rounded-md border border-gray-700 text-slate-400 text-xs hover:border-brand-gold hover:text-brand-gold transition-colors"
              >
                {quickReason}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-5">
          O horário volta a ficar disponível. Avisar o cliente fica a seu critério — o botão de
          e-mail aparece no agendamento depois do cancelamento.
        </p>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim() || null)}
            className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            Cancelar agendamento
          </button>
        </div>
      </div>
    </Modal>
  );
};
