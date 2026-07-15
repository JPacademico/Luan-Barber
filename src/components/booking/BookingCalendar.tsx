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
  getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import {
  describeDaySchedule,
  hasCustomHours,
  isEmptyWindow,
  isWeeklyClosedDay,
  resolveWorkingHours,
} from '../../lib/schedule';

interface BookingCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({ selectedDate, onSelectDate }) => {
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
      end: endOfMonth(currentMonth)
    });
  }, [currentMonth]);

  // Calculate empty cells for the first row to align days correctly (Sunday = 0, Monday = 1)
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const isDateSelectable = (date: Date) => {
    const today = startOfDay(new Date());
    const dateToRender = startOfDay(date);
    const dateStr = format(dateToRender, 'yyyy-MM-dd');

    // Past dates
    if (isBefore(dateToRender, today)) return false;

    // Beyond 7 days
    if (isBefore(maxBookingDate, dateToRender)) return false;

    // Sundays (0)
    if (isWeeklyClosedDay(dateToRender)) return false;

    const override = dayOverrides[dateStr];

    // Admin closed dates
    if (override?.isClosed) return false;

    // A custom window can be narrowed until nothing is bookable; treat that as closed.
    return !isEmptyWindow(resolveWorkingHours(shopInfo.workingHours, override));
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

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-400 uppercase py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {emptyDays.map(emptyDay => (
          <div key={`empty-${emptyDay}`} className="h-10"></div>
        ))}
        
        {daysInMonth.map(date => {
          const selectable = isDateSelectable(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const today = isToday(date);
          const dateStr = format(date, 'yyyy-MM-dd');
          const override = dayOverrides[dateStr];
          const closed = override?.isClosed ?? false;
          const isSpecialDay = selectable && hasCustomHours(shopInfo.workingHours, override);

          let btnClass = "relative h-10 w-full rounded-md flex items-center justify-center text-sm font-medium transition-all ";

          if (isSelected) {
            btnClass += "bg-brand-gold text-brand-black shadow-md font-bold";
          } else if (!selectable) {
            if (closed && !isBefore(startOfDay(date), startOfDay(new Date()))) {
              // Future closed date
              btnClass += "text-red-400 dark:text-red-500 bg-red-50 dark:bg-red-900/10 cursor-not-allowed opacity-50";
            } else {
              // Past or >7 days or Sunday
              btnClass += "text-gray-300 dark:text-gray-700 cursor-not-allowed";
            }
          } else {
            // Selectable
            btnClass += "text-brand-black dark:text-white hover:bg-brand-cream dark:hover:bg-gray-800 cursor-pointer";
          }
          
          if (today && !isSelected) {
            btnClass += " border border-brand-gold text-brand-gold";
          }

          return (
            <button
              key={date.toString()}
              onClick={() => selectable && onSelectDate(date)}
              disabled={!selectable}
              className={btnClass}
              title={
                selectable || closed
                  ? describeDaySchedule(shopInfo.workingHours, override)
                  : undefined
              }
            >
              {format(date, 'd')}

              {/* Marks a day the shop opens on reduced hours, so it reads as open-but-different. */}
              {isSpecialDay && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-gold" />
              )}
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-brand-gold"></div> Selecionado</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-brand-gold"></div> Hoje</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-400 opacity-50"></div> Fechado</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div> Horário especial</div>
      </div>
    </div>
  );
};
