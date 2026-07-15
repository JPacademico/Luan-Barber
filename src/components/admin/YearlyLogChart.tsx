import React, { useMemo } from 'react';
import type { Booking, Service } from '../../types';

interface YearlyLogChartProps {
  /** Active + archived bookings for the current year, cancellations already excluded. */
  bookings: Booking[];
  services: Service[];
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatPrice = (value: number): string => `R$ ${value.toFixed(2).replace('.', ',')}`;

/**
 * The barber's year at a glance.
 *
 * History is retained for the calendar year and dropped each January, so this is the whole
 * window there is to analyse. Rendered as plain divs — a charting library would cost more
 * bundle than the twelve bars are worth.
 */
export const YearlyLogChart: React.FC<YearlyLogChartProps> = ({ bookings, services }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const months = useMemo(() => {
    const priceById = new Map(services.map((s) => [s.id, s.price]));

    const buckets = MONTH_LABELS.map((label, index) => ({
      label,
      index,
      count: 0,
      revenue: 0,
    }));

    for (const booking of bookings) {
      // Month is parsed off the key directly; the date is already known to be this year.
      const monthIndex = Number(booking.date.slice(5, 7)) - 1;
      const bucket = buckets[monthIndex];
      if (!bucket) continue;

      bucket.count += 1;
      bucket.revenue += priceById.get(booking.serviceId) ?? 0;
    }

    return buckets;
  }, [bookings, services]);

  const peakCount = Math.max(...months.map((m) => m.count), 1);
  const yearTotal = months.reduce((sum, m) => sum + m.count, 0);
  const yearRevenue = months.reduce((sum, m) => sum + m.revenue, 0);

  return (
    <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
      <header className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
        <div>
          <h3 className="text-white font-semibold tracking-tight">Histórico de {currentYear}</h3>
          <p className="text-slate-500 text-xs mt-1">
            {yearTotal} atendimento(s) · {formatPrice(yearRevenue)}
          </p>
        </div>
        <p className="text-[11px] text-slate-600">Reinicia em janeiro</p>
      </header>

      {yearTotal === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">
          Ainda não há atendimentos registrados neste ano.
        </p>
      ) : (
        <div className="flex items-end justify-between gap-1.5 h-44">
          {months.map((month) => {
            const heightPercent = (month.count / peakCount) * 100;
            const isCurrent = month.index === currentMonth;
            const isFuture = month.index > currentMonth;

            return (
              <div key={month.label} className="flex-1 flex flex-col items-center gap-2 h-full group">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className={`w-full rounded-t transition-colors ${
                      isCurrent
                        ? 'bg-brand-gold'
                        : isFuture
                          ? 'bg-gray-800'
                          : 'bg-brand-gold/30 group-hover:bg-brand-gold/60'
                    }`}
                    // Percentage heights keep the bars responsive; a 2px floor keeps empty
                    // months visible as a baseline rather than vanishing.
                    style={{ height: `${Math.max(heightPercent, month.count > 0 ? 4 : 1)}%` }}
                    title={`${month.label}: ${month.count} atendimento(s) · ${formatPrice(month.revenue)}`}
                  />
                </div>

                <span
                  className={`text-[10px] tabular-nums ${
                    isCurrent ? 'text-brand-gold font-semibold' : 'text-slate-600'
                  }`}
                >
                  {month.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
