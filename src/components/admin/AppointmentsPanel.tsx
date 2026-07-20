import React, { useMemo, useState } from 'react';
import { addDays, format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Inbox,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import { DAILY_PURGE_HOUR, timeToMinutes } from '../../lib/timeSlots';
import { toDateKey } from '../../lib/schedule';
import { buildCancellationWhatsAppUrl } from '../../lib/whatsapp';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { CancelAppointmentDialog } from './CancelAppointmentDialog';
import type { Booking, Service } from '../../types';

const SHOP_NAME = 'Luan Studio Barber';

interface AppointmentRow {
  booking: Booking;
  service: Service | undefined;
}

const formatPrice = (price: number | undefined): string =>
  price === undefined ? '—' : `R$ ${price.toFixed(2).replace('.', ',')}`;

export const AppointmentsPanel: React.FC = () => {
  // Narrow selectors: this panel re-renders on any booking change, and subscribing to the whole
  // store would also re-render it on unrelated writes.
  const bookings = useBookingStore((state) => state.bookings);
  const verifyPixPayment = useBookingStore((state) => state.verifyPixPayment);
  const markAsCompleted = useBookingStore((state) => state.markAsCompleted);
  const cancelBooking = useBookingStore((state) => state.cancelBooking);
  const services = useShopStore((state) => state.services);

  const [cancelTarget, setCancelTarget] = useState<AppointmentRow | null>(null);

  // The day's list is the default view, but the admin can walk the agenda:
  // bookings are taken up to 7 days ahead, and they were previously unreachable here.
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateKey(new Date()));

  const rows = useMemo<AppointmentRow[]>(
    () =>
      bookings
        .filter((booking) => booking.date === selectedDate && booking.status !== 'cancelled')
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
        .map((booking) => ({
          booking,
          service: services.find((s) => s.id === booking.serviceId),
        })),
    [bookings, selectedDate, services]
  );

  /** Days with bookings, so the admin can see at a glance where the work is. */
  const upcomingDays = useMemo(() => {
    const counts = new Map<string, number>();
    for (const booking of bookings) {
      if (booking.status === 'cancelled') continue;
      counts.set(booking.date, (counts.get(booking.date) ?? 0) + 1);
    }
    return counts;
  }, [bookings]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      completed: rows.filter(({ booking }) => booking.status === 'completed').length,
      pendingVerification: rows.filter(
        ({ booking }) => booking.paymentMethod === 'pix' && !booking.isPaid
      ).length,
      expectedRevenue: rows.reduce((total, { service }) => total + (service?.price ?? 0), 0),
    }),
    [rows]
  );

  const shiftDay = (days: number) =>
    setSelectedDate((current) => toDateKey(addDays(parseISO(current), days)));

  const handleVerifyPayment = (booking: Booking) => {
    verifyPixPayment(booking.id);
    toast.success(`Pagamento de ${booking.clientName} confirmado.`, {
      description: 'Baixa registrada manualmente (fluxo Pix simulado).',
    });
  };

  const handleComplete = (booking: Booking) => {
    markAsCompleted(booking.id);
    toast.success(`Atendimento de ${booking.clientName} concluído.`);
  };

  const serviceFor = (booking: Booking) => services.find((s) => s.id === booking.serviceId);

  /**
   * Opens WhatsApp Click-to-Chat with an editable cancellation draft pre-filled. This is the
   * only outbound message the app sends — nothing goes out automatically; the admin reviews the
   * draft and taps send in WhatsApp themselves.
   */
  const openCancellationWhatsApp = (booking: Booking) => {
    const url = buildCancellationWhatsAppUrl({
      booking,
      service: serviceFor(booking),
      shopName: SHOP_NAME,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCancel = (row: AppointmentRow, reason: string | null) => {
    cancelBooking(row.booking.id, reason);
    setCancelTarget(null);

    // Compose from the post-cancellation booking so the reason reaches the draft.
    const cancelled: Booking = {
      ...row.booking,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason,
    };

    // Opens WhatsApp on the client's number with the message pre-filled. The admin can edit it
    // before sending — nothing is sent until they tap send. Must stay synchronous (no await/then
    // before it) or the popup blocker eats the tab and the admin thinks the client was notified.
    openCancellationWhatsApp(cancelled);

    toast.success(`Agendamento de ${row.booking.clientName} cancelado.`, {
      description: 'Horário liberado. Revise e envie a mensagem no WhatsApp que abriu.',
      duration: 7000,
    });
  };

  const selectedDateObj = parseISO(selectedDate);
  const isViewingToday = isToday(selectedDateObj);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-white font-semibold text-xl tracking-tight">
            {isViewingToday ? 'Agendamentos de Hoje' : 'Agendamentos'}
          </h2>
          <p className="text-slate-400 text-sm mt-1 capitalize">
            {format(selectedDateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* Grows to the full row on narrow screens rather than squeezing the date input. */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => shiftDay(-1)}
            aria-label="Dia anterior"
            className="p-2 shrink-0 rounded-lg border border-gray-800 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(toDateKey(new Date()))}
            disabled={isViewingToday}
            className="px-3 py-2 shrink-0 rounded-lg border border-gray-800 text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Hoje
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(event) => event.target.value && setSelectedDate(event.target.value)}
            aria-label="Selecionar data"
            className="flex-1 sm:flex-none min-w-0 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-gray-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-gold [color-scheme:dark]"
          />

          <button
            type="button"
            onClick={() => shiftDay(1)}
            aria-label="Próximo dia"
            className="p-2 shrink-0 rounded-lg border border-gray-800 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Agendamentos', value: summary.total, icon: <CalendarDays size={18} />, tone: 'text-brand-gold bg-brand-gold/10' },
          { label: 'Concluídos', value: summary.completed, icon: <CheckCircle2 size={18} />, tone: 'text-emerald-400 bg-emerald-500/10' },
          { label: 'Pix a verificar', value: summary.pendingVerification, icon: <CircleDollarSign size={18} />, tone: 'text-amber-400 bg-amber-500/10' },
          { label: 'Previsto', value: formatPrice(summary.expectedRevenue), icon: <CircleDollarSign size={18} />, tone: 'text-sky-400 bg-sky-500/10' },
        ].map((card) => (
          <div key={card.label} className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium">{card.label}</span>
              <span className={`p-1.5 rounded-lg ${card.tone}`}>{card.icon}</span>
            </div>
            <div className="text-2xl font-semibold text-white tracking-tight">{card.value}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 py-16 px-6 flex flex-col items-center justify-center text-slate-500">
          <Inbox size={40} className="mb-3 opacity-20" />
          <p className="text-sm">
            Nenhum agendamento ativo para {isViewingToday ? 'hoje' : format(selectedDateObj, 'dd/MM')}.
          </p>

          <UpcomingDaysHint
            counts={upcomingDays}
            selectedDate={selectedDate}
            onPick={setSelectedDate}
          />
        </div>
      ) : (
        <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden">
          {/* Table on desktop, stacked cards on mobile — same data, one source. */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 font-medium">Horário</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Serviço</th>
                  <th className="px-6 py-4 font-medium">Valor</th>
                  <th className="px-6 py-4 font-medium">Pagamento</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ booking, service }) => (
                  <tr
                    key={booking.id}
                    className={`border-b border-gray-800/60 last:border-0 transition-colors hover:bg-white/[0.02] ${
                      booking.status !== 'active' ? 'opacity-50' : ''
                    }`}
                  >
                    <td
                      className={`px-6 py-4 font-semibold text-white tabular-nums ${
                        booking.status === 'cancelled' ? 'line-through' : ''
                      }`}
                    >
                      {booking.time}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{booking.clientName}</div>
                      <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                        <Phone size={11} /> {booking.clientPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{service?.name ?? 'Serviço removido'}</td>
                    <td className="px-6 py-4 font-semibold text-brand-gold tabular-nums">
                      {formatPrice(service?.price)}
                    </td>
                    <td className="px-6 py-4">
                      <PaymentStatusBadge booking={booking} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <AppointmentActions
                          booking={booking}
                          onVerify={() => handleVerifyPayment(booking)}
                          onComplete={() => handleComplete(booking)}
                          onCancel={() => setCancelTarget({ booking, service })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden divide-y divide-gray-800">
            {rows.map(({ booking, service }) => (
              <article
                key={booking.id}
                className={`p-5 ${booking.status !== 'active' ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-white font-medium">{booking.clientName}</div>
                    <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                      <Phone size={11} /> {booking.clientPhone}
                    </div>
                  </div>
                  <span
                    className={`text-white font-semibold tabular-nums ${
                      booking.status === 'cancelled' ? 'line-through' : ''
                    }`}
                  >
                    {booking.time}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-slate-300">{service?.name ?? 'Serviço removido'}</span>
                  <span className="font-semibold text-brand-gold tabular-nums">
                    {formatPrice(service?.price)}
                  </span>
                </div>

                <PaymentStatusBadge booking={booking} />

                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <AppointmentActions
                    booking={booking}
                    onVerify={() => handleVerifyPayment(booking)}
                    onComplete={() => handleComplete(booking)}
                    onCancel={() => setCancelTarget({ booking, service })}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Agendamentos cancelados saem da lista imediatamente. Os concluídos saem a partir das{' '}
        {DAILY_PURGE_HOUR}:00.
      </p>

      {cancelTarget && (
        <CancelAppointmentDialog
          booking={cancelTarget.booking}
          service={cancelTarget.service}
          onConfirm={(reason) => handleCancel(cancelTarget, reason)}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
};

interface UpcomingDaysHintProps {
  counts: Map<string, number>;
  selectedDate: string;
  onPick: (date: string) => void;
}

/** Empty-state shortcut to the days that actually have bookings. */
const UpcomingDaysHint: React.FC<UpcomingDaysHintProps> = ({ counts, selectedDate, onPick }) => {
  const otherDays = useMemo(
    () =>
      [...counts.entries()]
        .filter(([date]) => date !== selectedDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 4),
    [counts, selectedDate]
  );

  if (otherDays.length === 0) return null;

  return (
    <div className="mt-6 text-center">
      <p className="text-xs text-slate-500 mb-3">Há agendamentos em outros dias:</p>
      <div className="flex flex-wrap justify-center gap-2">
        {otherDays.map(([date, count]) => (
          <button
            key={date}
            type="button"
            onClick={() => onPick(date)}
            className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs font-medium text-slate-300 hover:border-brand-gold hover:text-brand-gold transition-colors"
          >
            {format(parseISO(date), 'dd/MM')} · {count}
          </button>
        ))}
      </div>
    </div>
  );
};

interface AppointmentActionsProps {
  booking: Booking;
  onVerify: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

const AppointmentActions: React.FC<AppointmentActionsProps> = ({
  booking,
  onVerify,
  onComplete,
  onCancel,
}) => {
  if (booking.status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
        <CheckCircle2 size={14} /> Concluído
      </span>
    );
  }

  // Cancelled bookings never reach here — they're filtered out of `rows` entirely.

  const needsPixVerification = booking.paymentMethod === 'pix' && !booking.isPaid;

  return (
    <>
      {needsPixVerification && (
        <button
          type="button"
          onClick={onVerify}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors whitespace-nowrap"
        >
          Verificar Pix
        </button>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-slate-400 hover:border-red-500/50 hover:text-red-400 transition-colors whitespace-nowrap"
      >
        Cancelar
      </button>

      <button
        type="button"
        onClick={onComplete}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-gold text-brand-black hover:bg-brand-gold/90 transition-colors whitespace-nowrap"
      >
        Concluir
      </button>
    </>
  );
};
