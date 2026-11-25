import React, { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { CalendarOff, Clock } from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import {
  generateTimeSlots,
  isRangeAvailable,
  occupiedSlotsFor,
  slotsRequired,
} from '../../lib/timeSlots';
import {
  baseHoursForDate,
  formatHoursRange,
  overrideKey,
  resolveDayForBarber,
} from '../../lib/schedule';
import { barberName, SHOP_SCOPE } from '../../constants/barbers';
import type { Service } from '../../types';

interface TimeSlotGridProps {
  /** Whose agenda these slots belong to. Occupancy and days off are both per barber. */
  barberId: string;
  selectedDate: Date;
  /** Drives how many consecutive slots each candidate start must reserve. */
  selectedService: Service;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  /**
   * Slot markers to treat as free regardless of `occupied` — the booking being RESCHEDULED, so it
   * doesn't collide with the slot it currently holds. Caller is responsible for only passing this
   * when `selectedDate` is the booking's own date; on any other date these markers mean nothing.
   */
  ignoreSlots?: Set<string>;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  barberId,
  selectedDate,
  selectedService,
  selectedTime,
  onSelectTime,
  ignoreSlots,
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

  // Saturday's window differs from the weekday one, so resolve against the day-appropriate base.
  const baseHours = useMemo(
    () => baseHoursForDate(shopInfo, selectedDate),
    [shopInfo, selectedDate]
  );

  /**
   * One resolution for the whole grid: the shop's exception and this barber's own, intersected.
   * The same helper backs the calendar and the commit-time re-check, so the grid can't offer a
   * slot the booking write would then refuse.
   */
  const resolved = useMemo(
    () =>
      resolveDayForBarber({
        date: selectedDate,
        baseHours,
        shopOverride: dayOverrides[overrideKey(SHOP_SCOPE, dateStr)],
        barberOverride: dayOverrides[overrideKey(barberId, dateStr)],
      }),
    [selectedDate, baseHours, dayOverrides, dateStr, barberId]
  );

  const workingHours = resolved.hours;

  const slots = useMemo(
    () => (resolved.isClosed ? [] : generateTimeSlots(workingHours)),
    [resolved.isClosed, workingHours]
  );

  /** All 30-min markers consumed on this day BY THIS BARBER, expanded by booking duration. */
  const occupied = useMemo(() => {
    const taken = new Set<string>();
    for (const booking of allBookings) {
      if (booking.date !== dateStr || booking.barberId !== barberId) continue;
      if (booking.status === 'cancelled') continue;
      for (const slot of occupiedSlotsFor(booking.time, booking.durationMinutes)) taken.add(slot);
    }
    return taken;
  }, [allBookings, dateStr, barberId]);

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
          ignoreSlots,
        }),
        isStartTaken: occupied.has(time) && !ignoreSlots?.has(time),
      })),
    [slots, durationMinutes, workingHours, occupied, isSelectedDateToday, ignoreSlots]
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

      {resolved.isClosed ? (
        <p className="flex items-center gap-2 text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">
          <CalendarOff size={13} className="shrink-0" />
          {resolved.closedBy === 'shop'
            ? 'A barbearia está fechada nesta data.'
            : `${barberName(barberId)} não atende nesta data. Tente outro dia ou outro profissional.`}
        </p>
      ) : (
        <>
          {resolved.isCustom && (
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
        </>
      )}
    </div>
  );
};
