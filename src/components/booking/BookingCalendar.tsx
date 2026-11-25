import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  addDays,
  getDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import {
  baseHoursForDate,
  describeResolvedDay,
  overrideKey,
  resolveDayForBarber,
} from '../../lib/schedule';
import { barberName, SHOP_SCOPE } from '../../constants/barbers';

interface BookingCalendarProps {
  /**
   * Whose agenda to show. Null before the client has picked a chair — the grid then renders every
   * day as unselectable rather than guessing, because "is this day open?" has no answer until a
   * barber is named (one may be off while the other works).
   */
  barberId: string | null;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  barberId,
  selectedDate,
  onSelectDate,
}) => {
  const [currentMonth, setCurrentMonth] = React.useState(startOfMonth(new Date()));
  // Read the slice itself rather than the `get()`-based helpers: subscribing to the data is what
  // makes the calendar repaint when the admin closes a day in another tab.
  const dayOverrides = useBookingStore((state) => state.dayOverrides);
  const shopInfo = useShopStore((state) => state.shopInfo);

  // Rule: Max 7 days in advance
  const maxBookingDate = addDays(startOfDay(new Date()), 7);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  // Calculate empty cells for the first row to align days correctly (Sunday = 0, Monday = 1)
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const barberLabel = barberId ? barberName(barberId) : 'O profissional';

  /** This barber's day, with the shop's own exception already folded in. */
  const resolveDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return resolveDayForBarber({
      date,
      baseHours: baseHoursForDate(shopInfo, date),
      shopOverride: dayOverrides[overrideKey(SHOP_SCOPE, dateStr)],
      barberOverride: barberId ? dayOverrides[overrideKey(barberId, dateStr)] : undefined,
    });
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-white dark:bg-brand-darkgray rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-display font-bold text-lg text-brand-black dark:text-white capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h4>
        <div className="flex space-x-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
            disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), startOfDay(new Date()))}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
            disabled={isBefore(maxBookingDate, startOfMonth(addMonths(currentMonth, 1)))}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {barberId && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 -mt-2">
          Agenda de <strong className="text-brand-gold">{barberName(barberId)}</strong>.
        </p>
      )}

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-400 uppercase py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map((emptyDay) => (
          <div key={`empty-${emptyDay}`} className="h-10"></div>
        ))}

        {daysInMonth.map((date) => {
          const dateToRender = startOfDay(date);
          const isPast = isBefore(dateToRender, startOfDay(new Date()));
          const isTooFar = isBefore(maxBookingDate, dateToRender);
          const resolved = resolveDay(date);

          const selectable = Boolean(barberId) && !isPast && !isTooFar && !resolved.isClosed;
          const isSelected = Boolean(selectedDate && isSameDay(date, selectedDate) && selectable);
          const today = isToday(date);
          // Sunday is simply "not a working day" and needs no red flag; an exception does.
          const isException = resolved.closedBy === 'shop' || resolved.closedBy === 'barber';

          let btnClass =
            'relative h-10 w-full rounded-md flex items-center justify-center text-sm font-medium transition-all ';

          if (isSelected) {
            btnClass += 'bg-brand-gold text-brand-black shadow-md font-bold';
          } else if (!selectable) {
            if (isException && !isPast && !isTooFar) {
              // A day off or a shop closure, inside the bookable window.
              btnClass +=
                'text-red-400 dark:text-red-500 bg-red-50 dark:bg-red-900/10 cursor-not-allowed opacity-50';
            } else {
              // Past, beyond 7 days, Sunday, or no barber chosen yet.
              btnClass += 'text-gray-300 dark:text-gray-700 cursor-not-allowed';
            }
          } else {
            btnClass +=
              'text-brand-black dark:text-white hover:bg-brand-cream dark:hover:bg-gray-800 cursor-pointer';
          }

          if (today && !isSelected) {
            btnClass += ' border border-brand-gold text-brand-gold';
          }

          return (
            <button
              key={date.toString()}
              onClick={() => selectable && onSelectDate(date)}
              disabled={!selectable}
              className={btnClass}
              title={
                barberId && !isPast && !isTooFar
                  ? describeResolvedDay(resolved, barberLabel)
                  : undefined
              }
            >
              {format(date, 'd')}

              {/* Marks a day the barber works on reduced hours, so it reads as open-but-different. */}
              {selectable && resolved.isCustom && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-gold" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-brand-gold"></div> Selecionado</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-brand-gold"></div> Hoje</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-400 opacity-50"></div> Indisponível</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div> Horário especial</div>
      </div>
    </div>
  );
};
