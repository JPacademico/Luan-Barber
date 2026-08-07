import React, { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarSearch } from 'lucide-react';
import { toast } from 'sonner';
import { useShopStore } from '../store/shopStore';
import { useBookingStore } from '../store/bookingStore';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PUBLIC_BRANDING } from '../constants/branding';
import { readRememberedIds, forgetBooking } from '../lib/myBookings';
import { lookupBookingsByIds } from '../lib/bookingLookupApi';
import { MyBookingCard } from '../components/mybookings/MyBookingCard';
import { BookingLookup } from '../components/mybookings/BookingLookup';
import { ClientCancelDialog } from '../components/mybookings/ClientCancelDialog';
import { RescheduleDialog } from '../components/mybookings/RescheduleDialog';
import type { Booking, Service } from '../types';

/** Soonest-first for what's still coming, most-recent-first for what's done — the order a client
 *  actually cares about, rather than a single chronological sort that buries upcoming bookings
 *  under old ones. */
const sortForDisplay = (bookings: Booking[]): Booking[] =>
  [...bookings].sort((a, b) => {
    const aActive = a.status === 'active';
    const bActive = b.status === 'active';
    if (aActive !== bActive) return aActive ? -1 : 1;
    const aKey = `${a.date}T${a.time}`;
    const bKey = `${b.date}T${b.time}`;
    return aActive ? aKey.localeCompare(bKey) : bKey.localeCompare(aKey);
  });

export const MyBookingsPage: React.FC = () => {
  const services = useShopStore((state) => state.services);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);

  useDocumentMeta({
    ...PUBLIC_BRANDING,
    title: 'Meus Agendamentos | Luan Studio Barber',
  });

  const mergeBookings = useCallback((incoming: Booking[]) => {
    setBookings((current) => {
      const byId = new Map(current.map((b) => [b.id, b]));
      for (const booking of incoming) byId.set(booking.id, booking);
      return [...byId.values()];
    });
  }, []);

  // Loads whatever this device remembered booking. A client who only ever used the phone search
  // (a different device made the booking) starts with an empty list here — that's expected, not
  // an error state.
  useEffect(() => {
    const ids = readRememberedIds();
    if (ids.length === 0) {
      setIsLoading(false);
      return;
    }
    lookupBookingsByIds(ids)
      .then(mergeBookings)
      .catch((error: unknown) => console.error('[MyBookingsPage] initial load failed', error))
      .finally(() => setIsLoading(false));
  }, [mergeBookings]);

  const serviceFor = (booking: Booking): Service | undefined =>
    services.find((s) => s.id === booking.serviceId);

  const handleConfirmCancel = (reason: string | null) => {
    if (!cancelTarget) return;
    const { id } = cancelTarget;

    useBookingStore.getState().cancelBookingByClient(id, reason);
    forgetBooking(id);

    setBookings((current) =>
      current.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'cancelled',
              cancelledAt: new Date().toISOString(),
              cancellationReason: reason,
              cancelledBy: 'client',
            }
          : b
      )
    );
    setCancelTarget(null);
    toast.success('Agendamento cancelado.', {
      description: 'O horário foi liberado.',
    });
  };

  const handleConfirmReschedule = (date: string, time: string) => {
    if (!rescheduleTarget) return;
    const { id } = rescheduleTarget;

    useBookingStore.getState().rescheduleBooking(id, date, time);

    setBookings((current) =>
      current.map((b) =>
        b.id === id
          ? {
              ...b,
              date,
              time,
              rescheduledAt: new Date().toISOString(),
              originalDate: b.originalDate ?? b.date,
              originalTime: b.originalTime ?? b.time,
            }
          : b
      )
    );
    setRescheduleTarget(null);
    toast.success('Agendamento remarcado!', {
      description: `Novo horário: ${format(parseISO(date), 'dd/MM/yyyy')} às ${time}.`,
    });
  };

  const sorted = sortForDisplay(bookings);

  return (
    <>
      <header className="pt-32 pb-16 bg-brand-black text-center px-4">
        <span className="inline-block text-xs uppercase tracking-[0.3em] text-brand-gold mb-4">
          Luan Studio Barber
        </span>
        <h1 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
          Meus Agendamentos
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Cancele ou remarque seu horário — sem precisar ligar.
        </p>
      </header>

      <section className="py-16 px-4 bg-white dark:bg-brand-black">
        <div className="max-w-2xl mx-auto space-y-6">
          {isLoading ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Carregando…</p>
          ) : sorted.length === 0 ? (
            <div className="bg-white dark:bg-brand-darkgray rounded-xl border border-gray-200 dark:border-gray-800 py-12 px-6 flex flex-col items-center text-center">
              <CalendarSearch size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Nenhum agendamento encontrado neste aparelho ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map((booking) => (
                <MyBookingCard
                  key={booking.id}
                  booking={booking}
                  service={serviceFor(booking)}
                  onCancel={() => setCancelTarget(booking)}
                  onReschedule={() => setRescheduleTarget(booking)}
                />
              ))}
            </div>
          )}

          <BookingLookup onFound={mergeBookings} />
        </div>
      </section>

      {cancelTarget && (
        <ClientCancelDialog
          booking={cancelTarget}
          service={serviceFor(cancelTarget)}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {rescheduleTarget && (
        <RescheduleDialog
          booking={rescheduleTarget}
          service={serviceFor(rescheduleTarget)}
          onConfirm={handleConfirmReschedule}
          onClose={() => setRescheduleTarget(null)}
        />
      )}
    </>
  );
};
