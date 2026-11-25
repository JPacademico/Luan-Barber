import React, { useMemo, useState } from 'react';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import { Calendar, DollarSign, Clock, Scissors, User } from 'lucide-react';
import { isSameMonth, parseISO } from 'date-fns';
import { YearlyLogChart } from './YearlyLogChart';
import { useAdminSession } from './adminSessionContext';
import { barberName } from '../../constants/barbers';

/** Sentinel for the owner's combined, whole-shop numbers. */
const ALL_BARBERS = 'all' as const;

export const AnalyticsPanel: React.FC = () => {
  // Each slice is subscribed to separately: a selector returning a fresh array on every render
  // would break Zustand's snapshot equality check.
  const activeBookings = useBookingStore((state) => state.bookings);
  const archivedBookings = useBookingStore((state) => state.archivedBookings);
  const services = useShopStore((state) => state.services);

  const { isOwner, barberId: ownBarberId, visibleBarbers } = useAdminSession();

  /**
   * Whose numbers these are. The owner can read the shop as a whole or one chair at a time; an
   * employee only ever sees their own, so the control isn't rendered for them and the scope is
   * forced to their id regardless of state.
   */
  const [scope, setScope] = useState<string>(() => (isOwner ? ALL_BARBERS : ownBarberId));
  const effectiveScope = isOwner ? scope : ownBarberId;

  /**
   * The barber's log: active + archived, cancellations dropped.
   * Retention keeps this to the current calendar year, so it needs no further date filtering —
   * the operational list is cleared as each month rolls over, but the history behind these
   * numbers survives until January.
   */
  const bookings = useMemo(
    () =>
      [...archivedBookings, ...activeBookings]
        .filter((b) => b.status !== 'cancelled')
        .filter((b) => effectiveScope === ALL_BARBERS || b.barberId === effectiveScope),
    [archivedBookings, activeBookings, effectiveScope]
  );

  const currentMonthBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter((b) => isSameMonth(parseISO(b.date), now));
  }, [bookings]);

  const stats = useMemo(() => {
    const totalBookings = currentMonthBookings.length;
    
    // Calculate estimated revenue
    const estimatedRevenue = currentMonthBookings.reduce((total, booking) => {
      const service = services.find(s => s.id === booking.serviceId);
      return total + (service?.price || 0);
    }, 0);

    // Find most popular time
    const timeCount: Record<string, number> = {};
    let popularTime = '-';
    let maxTimeCount = 0;
    
    // Find most popular service
    const serviceCount: Record<string, number> = {};
    let popularService = '-';
    let maxServiceCount = 0;

    currentMonthBookings.forEach(booking => {
      // Time logic
      timeCount[booking.time] = (timeCount[booking.time] || 0) + 1;
      if (timeCount[booking.time] > maxTimeCount) {
        maxTimeCount = timeCount[booking.time];
        popularTime = booking.time;
      }
      
      // Service logic
      serviceCount[booking.serviceId] = (serviceCount[booking.serviceId] || 0) + 1;
      if (serviceCount[booking.serviceId] > maxServiceCount) {
        maxServiceCount = serviceCount[booking.serviceId];
        const s = services.find(s => s.id === booking.serviceId);
        popularService = s ? s.name : '-';
      }
    });

    return {
      totalBookings,
      estimatedRevenue,
      popularTime,
      popularService
    };
  }, [currentMonthBookings, services]);

  const recentBookings = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [bookings]
  );

  const scopeLabelText =
    effectiveScope === ALL_BARBERS ? 'Toda a barbearia' : barberName(effectiveScope);

  return (
    <div className="space-y-6">
      {isOwner ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar métricas por profissional">
          {[{ id: ALL_BARBERS, label: 'Toda a barbearia' }, ...visibleBarbers.map((b) => ({ id: b.id, label: b.name }))].map(
            (option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setScope(option.id)}
                aria-pressed={effectiveScope === option.id}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  effectiveScope === option.id
                    ? 'bg-brand-gold text-brand-black border-brand-gold'
                    : 'border-gray-800 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {option.label}
              </button>
            )
          )}
        </div>
      ) : (
        // Stated explicitly: these are per-chair figures, and reading them as the shop's total
        // would badly mislead.
        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <User size={12} /> Números apenas dos seus atendimentos ({scopeLabelText}).
        </p>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Agendamentos (Mês)</h3>
            <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-lg">
              <Calendar size={20} />
            </div>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-white">
            {stats.totalBookings}
          </div>
        </div>

        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Receita Est. (Mês)</h3>
            <div className="p-2 bg-green-500/10 text-green-400 rounded-lg">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-white">
            R$ {stats.estimatedRevenue.toFixed(2).replace('.', ',')}
          </div>
        </div>

        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Horário Mais Popular</h3>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Clock size={20} />
            </div>
          </div>
          <div className="text-3xl font-semibold tracking-tight text-white">
            {stats.popularTime}
          </div>
        </div>

        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Serviço Favorito</h3>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Scissors size={20} />
            </div>
          </div>
          <div className="text-xl font-semibold tracking-tight text-white truncate" title={stats.popularService}>
            {stats.popularService}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2">
          <YearlyLogChart bookings={bookings} services={services} />
        </div>

        {/* Recent Bookings List */}
        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <h3 className="text-white font-semibold tracking-tight mb-6">Últimos Agendamentos</h3>
          
          {recentBookings.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Nenhum agendamento recente.</p>
          ) : (
            <div className="space-y-4">
              {recentBookings.map(booking => {
                const service = services.find(s => s.id === booking.serviceId);
                const [, month, day] = booking.date.split('-');
                
                return (
                  <div key={booking.id} className="pb-4 border-b border-gray-800 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-white text-sm font-medium">{booking.clientName}</span>
                      <span className="text-brand-gold text-xs font-bold">{day}/{month} às {booking.time}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{service?.name || 'Serviço Excluído'}</span>
                      <span>R$ {service?.price.toFixed(2).replace('.', ',') || '0,00'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
