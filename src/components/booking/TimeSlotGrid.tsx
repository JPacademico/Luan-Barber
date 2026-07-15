import React, { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { Clock } from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import { generateTimeSlots, isSlotInPast } from '../../lib/timeSlots';
import { formatHoursRange, hasCustomHours, resolveWorkingHours } from '../../lib/schedule';

interface TimeSlotGridProps {
  selectedDate: Date;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  selectedDate,
  selectedTime,
  onSelectTime,
}) => {
  // Subscribing to the data rather than the `get()`-based helpers: it is the subscription that
  // makes the grid react to a booking taken in another tab or a day the admin just reshaped.
  const bookings = useBookingStore((state) => state.bookings);
  const dayOverrides = useBookingStore((state) => state.dayOverrides);
  const shopInfo = useShopStore((state) => state.shopInfo);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isSelectedDateToday = isToday(selectedDate);

  const override = dayOverrides[dateStr];
  const isSpecialDay = hasCustomHours(shopInfo.workingHours, override);

  // Memoised on the store's own references so the resolved object stays stable across renders.
  const workingHours = useMemo(
    () => resolveWorkingHours(shopInfo.workingHours, override),
    [shopInfo.workingHours, override]
  );

  // Slots follow the day's effective window, so an afternoon-only day starts at its custom hour.
  const slots = useMemo(() => generateTimeSlots(workingHours), [workingHours]);

  /** One pass over the day's bookings instead of a scan per slot. Cancelled slots stay free. */
  const takenTimes = useMemo(() => {
    const taken = new Set<string>();
    for (const booking of bookings) {
      if (booking.date === dateStr && booking.status !== 'cancelled') taken.add(booking.time);
    }
    return taken;
  }, [bookings, dateStr]);

  const availability = useMemo(
    () =>
      slots.map((time) => ({
        time,
        isTaken: takenTimes.has(time),
        isPast: isSelectedDateToday && isSlotInPast(time),
      })),
    [slots, takenTimes, isSelectedDateToday]
  );

  const hasAvailableSlot = availability.some(({ isTaken, isPast }) => !isTaken && !isPast);

  return (
    <div className="bg-white dark:bg-brand-darkgray rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-1">
        Horários Disponíveis
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Intervalos de 30 minutos.</p>

      {isSpecialDay && (
        <p className="flex items-center gap-2 text-xs font-medium text-brand-gold bg-brand-gold/10 border border-brand-gold/30 rounded-lg px-3 py-2 mb-4">
          <Clock size={13} className="shrink-0" />
          Horário especial neste dia: {formatHoursRange(workingHours)}
        </p>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {availability.map(({ time, isTaken, isPast }) => {
          const isDisabled = isTaken || isPast;
          const isSelected = selectedTime === time;

          let btnClass =
            'py-2 px-1 rounded-md text-sm font-medium transition-all text-center border ';

          if (isSelected) {
            btnClass += 'bg-brand-gold text-brand-black shadow-md border-brand-gold';
          } else if (isDisabled) {
            btnClass +=
              'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed border-transparent';
          } else {
            btnClass +=
              'bg-white dark:bg-brand-black border-gray-200 dark:border-gray-700 text-brand-black dark:text-white hover:border-brand-gold hover:text-brand-gold cursor-pointer';
          }

          return (
            <button
              key={time}
              type="button"
              onClick={() => onSelectTime(time)}
              disabled={isDisabled}
              className={btnClass}
              title={isTaken ? `${time} — já reservado` : undefined}
            >
              {isTaken ? <span className="line-through text-xs opacity-70">{time}</span> : time}
            </button>
          );
        })}
      </div>

      {!hasAvailableSlot && (
        <div className="text-center py-6 text-gray-500 text-sm">
          Nenhum horário disponível para esta data.
        </div>
      )}
    </div>
  );
};
