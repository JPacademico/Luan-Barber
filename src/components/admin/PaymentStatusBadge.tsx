import React from 'react';
import { BadgeCheck, Clock3, Store } from 'lucide-react';
import type { Booking } from '../../types';

interface BadgeAppearance {
  label: string;
  className: string;
  icon: React.ReactNode;
}

/**
 * Payment state reads at a glance:
 * green = money confirmed by the admin, amber = needs the admin's attention,
 * slate = nothing to do until the client shows up.
 */
const describePaymentStatus = (booking: Booking): BadgeAppearance => {
  if (booking.paymentMethod === 'local') {
    return {
      label: 'Pagar na Barbearia',
      className: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
      icon: <Store size={13} />,
    };
  }

  if (booking.isPaid) {
    return {
      label: 'Pago via Pix (Simulado)',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: <BadgeCheck size={13} />,
    };
  }

  return {
    label: booking.paymentClaimedAt ? 'Pix: verificar pagamento' : 'Pix: aguardando pagamento',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    icon: <Clock3 size={13} />,
  };
};

export const PaymentStatusBadge: React.FC<{ booking: Booking }> = ({ booking }) => {
  const { label, className, icon } = describePaymentStatus(booking);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${className}`}
    >
      {icon}
      {label}
    </span>
  );
};
