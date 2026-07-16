import React, { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { Clock } from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import {
  generateTimeSlots,
  isRangeAvailable,
  occupiedSlotsFor,
  slotsRequired,
} from '../../lib/timeSlots';
import { formatHoursRange, hasCustomHours, resolveWorkingHours } from '../../lib/schedule';
import type { Service } from '../../types';

interface TimeSlotGridProps {
  selectedDate: Date;
  /** Drives how many consecutive slots each candidate start must reserve. */
  selectedService: Service;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  selectedDate,
  selectedService,
  selectedTime,
  onSelectTime,
}) => {
  // Subscribing to the data rather than the `get()`-based helpers: it is the subscription that
  // makes the grid react to a booking taken on another device or a day the admin just reshaped.
  const allBookings = useBookingStore((state) => state.allBookings);
  const dayOverrides = useBookingStore((state) => state.dayOverrides);
  const shopInfo = useShopStore((state) => state.shopInfo);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isSelectedDateToday = isToday(selectedDate);
  const durationMinutes = selectedService.duration;
  const requiredSlots = slotsRequired(durationMinutes);

  const override = dayOverrides[dateStr];
  const isSpecialDay = hasCustomHours(shopInfo.workingHours, override);

  const workingHours = useMemo(
    () => resolveWorkingHours(shopInfo.workingHours, override),
    [shopInfo.workingHours, override]
  );

  const slots = useMemo(() => generateTimeSlots(workingHours), [workingHours]);

  /** All 30-min markers consumed by existing bookings on this day, expanded by their duration. */
  const occupied = useMemo(() => {
    const taken = new Set<string>();
    for (const booking of allBookings) {
      if (booking.date !== dateStr || booking.status === 'cancelled') continue;
      for (const slot of occupiedSlotsFor(booking.time, booking.durationMinutes)) taken.add(slot);
    }
    return taken;
  }, [allBookings, dateStr]);

  // A start is offered only if the WHOLE range the service needs is free and fits before closing.
  const availability = useMemo(
    () =>
      slots.map((time) => ({
        time,
        isAvailable: isRangeAvailable({
          startTime: time,
          durationMinutes,
          workingHours,
          occupied,
          isToday: isSelectedDateToday,
        }),
        isStartTaken: occupied.has(time),
      })),
    [slots, durationMinutes, workingHours, occupied, isSelectedDateToday]
  );

  const hasAvailableSlot = availability.some(({ isAvailable }) => isAvailable);

  return (
    <div className="bg-white dark:bg-brand-darkgray rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-1">
        Horários Disponíveis
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {requiredSlots > 1
          ? `Este serviço ocupa ${requiredSlots} horários seguidos (${durationMinutes} min).`
          : 'Intervalos de 30 minutos.'}
      </p>

      {isSpecialDay && (
        <p className="flex items-center gap-2 text-xs font-medium text-brand-gold bg-brand-gold/10 border border-brand-gold/30 rounded-lg px-3 py-2 mb-4">
          <Clock size={13} className="shrink-0" />
          Horário especial neste dia: {formatHoursRange(workingHours)}
        </p>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {availability.map(({ time, isAvailable, isStartTaken }) => {
          const isSelected = selectedTime === time;

          let btnClass =
            'py-2 px-1 rounded-md text-sm font-medium transition-all text-center border ';

          if (isSelected) {
            btnClass += 'bg-brand-gold text-brand-black shadow-md border-brand-gold';
          } else if (!isAvailable) {
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
              disabled={!isAvailable}
              className={btnClass}
              title={
                isStartTaken
                  ? `${time} — já reservado`
                  : !isAvailable
                    ? `${time} — sem tempo suficiente para este serviço`
                    : undefined
              }
            >
              {isStartTaken ? <span className="line-through text-xs opacity-70">{time}</span> : time}
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
