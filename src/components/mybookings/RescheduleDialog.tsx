import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { BookingCalendar } from '../booking/BookingCalendar';
import { TimeSlotGrid } from '../booking/TimeSlotGrid';
import { isRangeAvailable, occupiedSlotsFor } from '../../lib/timeSlots';
import { baseHoursForDate, resolveWorkingHours } from '../../lib/schedule';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import type { Booking, Service } from '../../types';

interface RescheduleDialogProps {
  booking: Booking;
  service: Service | undefined;
  onConfirm: (date: string, time: string) => void;
  onClose: () => void;
}

/** Same calendar + grid as the public booking flow, seeded on the booking's own current date. */
export const RescheduleDialog: React.FC<RescheduleDialogProps> = ({
  booking,
  service,
  onConfirm,
  onClose,
}) => {
  const shopInfo = useShopStore((state) => state.shopInfo);
  const getDayOverride = useBookingStore((state) => state.getDayOverride);
  const getOccupiedSlots = useBookingStore((state) => state.getOccupiedSlots);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(`${booking.date}T00:00:00`));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Only meaningful when the grid is showing the booking's OWN date — on any other date these
  // exact time-of-day markers could coincidentally belong to a completely different booking, and
  // masking them there would wrongly show someone else's real slot as free. See TimeSlotGrid's
  // ignoreSlots doc.
  const ignoreSlots = useMemo(
    () => (dateStr === booking.date ? new Set(occupiedSlotsFor(booking.time, booking.durationMinutes)) : undefined),
    [dateStr, booking.date, booking.time, booking.durationMinutes]
  );

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  /**
   * Re-checks availability at the moment of confirm, not just when the grid was drawn — same
   * double-check BookingForm does before writing a new booking. The grid can go stale: it's built
   * from the store's last poll/cross-tab sync (see SupabaseBookingRepository), so a slot that
   * looked free when this dialog opened may have been taken in the meantime.
   */
  const handleConfirm = () => {
    if (!selectedTime || !service) return;

    const stillAvailable = isRangeAvailable({
      startTime: selectedTime,
      durationMinutes: service.duration,
      workingHours: resolveWorkingHours(baseHoursForDate(shopInfo, selectedDate), getDayOverride(dateStr)),
      occupied: getOccupiedSlots(dateStr),
      isToday: dateStr === format(new Date(), 'yyyy-MM-dd'),
      ignoreSlots,
    });

    if (!stillAvailable) {
      toast.error('Este horário acabou de ser ocupado.', {
        description: 'Escolha outro horário para continuar.',
      });
      setSelectedTime(null);
      return;
    }

    onConfirm(dateStr, selectedTime);
  };

  return (
    <Modal
      labelledBy="reschedule-dialog-title"
      onClose={onClose}
      className="max-w-2xl bg-white dark:bg-brand-gray border border-gray-200 dark:border-gray-800"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:text-brand-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
      >
        <X size={18} />
      </button>

      <div className="p-6 sm:p-8">
        <header className="mb-6 pr-8">
          <span className="inline-flex p-2.5 rounded-xl bg-brand-gold/15 text-brand-gold mb-4">
            <CalendarClock size={22} />
          </span>
          <h3 id="reschedule-dialog-title" className="font-display font-bold text-xl text-brand-black dark:text-white">
            Escolher novo horário
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {service?.name ?? 'Serviço'} · atualmente em {format(new Date(`${booking.date}T00:00:00`), 'dd/MM/yyyy')} às{' '}
            {booking.time}
          </p>
        </header>

        {!service ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
            Este serviço não está mais disponível no catálogo — entre em contato com a barbearia
            para remarcar.
          </p>
        ) : (
          <div className="space-y-6">
            <BookingCalendar selectedDate={selectedDate} onSelectDate={handleSelectDate} />
            <TimeSlotGrid
              selectedDate={selectedDate}
              selectedService={service}
              selectedTime={selectedTime}
              onSelectTime={setSelectedTime}
              ignoreSlots={ignoreSlots}
            />
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedTime || !service}
            className="btn-primary flex-1 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar novo horário
          </button>
        </div>
      </div>
    </Modal>
  );
};
