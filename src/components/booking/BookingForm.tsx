import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { bookingFormSchema, type BookingFormData } from '../../lib/validations';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import { isRangeAvailable } from '../../lib/timeSlots';
import { baseHoursForDate, resolveWorkingHours } from '../../lib/schedule';
import { rememberBooking } from '../../lib/myBookings';
import type { Booking, PaymentMethod, Service } from '../../types';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PixPaymentModal } from './PixPaymentModal';
import { ConfirmBookingDialog } from './ConfirmBookingDialog';

interface BookingFormProps {
  selectedService: Service | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onSuccess: () => void;
}

/** The booking awaiting the simulated Pix confirmation. Already persisted — the slot is held. */
interface PendingPixPayment {
  bookingId: string;
  amount: number;
  serviceName: string;
  scheduledFor: string;
}

/**
 * Snapshot of what the confirmation dialog is asking about. Frozen on purpose: the client can
 * still change the service or slot behind the dialog, and booking anything other than the exact
 * thing they were shown would be a silent bait-and-switch.
 */
interface PendingConfirmation {
  data: BookingFormData;
  service: Service;
  date: Date;
  dateStr: string;
  time: string;
  dateLabel: string;
  weekdayLabel: string;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  selectedService,
  selectedDate,
  selectedTime,
  paymentMethod,
  onPaymentMethodChange,
  onSuccess,
}) => {
  const addBooking = useBookingStore((state) => state.addBooking);
  const claimPixPayment = useBookingStore((state) => state.claimPixPayment);
  const getOccupiedSlots = useBookingStore((state) => state.getOccupiedSlots);
  const getDayOverride = useBookingStore((state) => state.getDayOverride);
  const shopInfo = useShopStore((state) => state.shopInfo);
  const [pendingPixPayment, setPendingPixPayment] = useState<PendingPixPayment | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  // Guards against a double-booking from a double-tap. On a slow phone the browser can dispatch a
  // second queued click before React commits the unmount of the dialog, and the stale closure would
  // happily write a second booking. The latch is armed for the lifetime of one confirmation and is
  // only cleared when a *new* dialog is opened, so it survives that window.
  const isCommittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    mode: 'onChange',
  });

  /**
   * Is the whole span the service needs still free? Between picking a slot and confirming it,
   * another device may have taken part of it. The UI already hides conflicts; this guards the race.
   */
  const isSlotStillFree = (service: Service, date: Date, dateStr: string, time: string): boolean =>
    isRangeAvailable({
      startTime: time,
      durationMinutes: service.duration,
      workingHours: resolveWorkingHours(baseHoursForDate(shopInfo, date), getDayOverride(dateStr)),
      occupied: getOccupiedSlots(dateStr),
      isToday: dateStr === format(new Date(), 'yyyy-MM-dd'),
    });

  const warnSlotTaken = () =>
    toast.error('Este horário acabou de ser ocupado.', {
      description: 'Escolha outro horário para continuar.',
    });

  /**
   * Submitting no longer books anything — it opens the confirmation dialog. The slot is checked
   * here too so a client is never asked to confirm a time that is already gone.
   */
  const onSubmit = (data: BookingFormData) => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error('Por favor, selecione o serviço, data e horário.');
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    if (!isSlotStillFree(selectedService, selectedDate, dateStr, selectedTime)) {
      warnSlotTaken();
      return;
    }

    // Opening a fresh dialog is the one place the commit latch is released.
    isCommittingRef.current = false;

    setPendingConfirmation({
      data,
      service: selectedService,
      date: selectedDate,
      dateStr,
      time: selectedTime,
      dateLabel: format(selectedDate, 'dd/MM/yyyy'),
      weekdayLabel: format(selectedDate, 'EEEE', { locale: ptBR }),
    });
  };

  /** The only place a booking is actually written. Reached solely by an explicit tap on Confirmar. */
  const handleConfirmBooking = () => {
    if (!pendingConfirmation || isCommittingRef.current) return;
    isCommittingRef.current = true;

    const { data, service, date, dateStr, time } = pendingConfirmation;

    // Checked again at the real commit point: the dialog may have sat open for a while.
    if (!isSlotStillFree(service, date, dateStr, time)) {
      setPendingConfirmation(null);
      warnSlotTaken();
      return;
    }

    const scheduledFor = `${format(date, 'dd/MM/yyyy')} às ${time}`;

    const newBooking: Booking = {
      id: crypto.randomUUID(),
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      serviceId: service.id,
      durationMinutes: service.duration,
      date: dateStr,
      time,
      createdAt: new Date().toISOString(),
      paymentMethod,
      isPaid: false,
      paymentClaimedAt: null,
      status: 'active',
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      rescheduledAt: null,
      originalDate: null,
      originalTime: null,
      cancelledBy: null,
    };

    addBooking(newBooking);
    rememberBooking(newBooking.id);
    reset();
    setPendingConfirmation(null);
    // The latch stays armed here on purpose — see the ref declaration.

    // The shop (admin) is notified automatically by the backend the moment the booking is
    // created — the browser no longer opens WhatsApp on submit.
    if (paymentMethod === 'pix') {
      // The slot is already reserved; the modal only collects the (simulated) payment claim.
      setPendingPixPayment({
        bookingId: newBooking.id,
        amount: service.price,
        serviceName: service.name,
        scheduledFor,
      });
      return;
    }

    toast.success('Agendamento realizado com sucesso!', {
      description: `${service.name} em ${scheduledFor}.`,
    });
    onSuccess();
  };

  const handlePixClaimed = () => {
    if (!pendingPixPayment) return;

    claimPixPayment(pendingPixPayment.bookingId);
    setPendingPixPayment(null);

    toast.success('Agendamento confirmado!', {
      description: 'Avisamos a barbearia. O pagamento será verificado antes do atendimento.',
    });
    onSuccess();
  };

  const handlePixModalClose = () => {
    setPendingPixPayment(null);

    toast.info('Agendamento reservado sem pagamento antecipado.', {
      description: 'Você pode acertar o valor direto na barbearia.',
    });
    onSuccess();
  };

  const isFormReady = Boolean(selectedService && selectedDate && selectedTime && isValid);

  return (
    <div className="bg-white dark:bg-brand-darkgray rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-6">
        Seus Dados
      </h4>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome Completo
          </label>
          <input
            id="clientName"
            type="text"
            className="input-field"
            placeholder="Ex: João Silva"
            {...register('clientName')}
          />
          {errors.clientName && (
            <p className="mt-1 text-sm text-red-500">{errors.clientName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Telefone / WhatsApp
          </label>
          <input
            id="clientPhone"
            type="tel"
            className="input-field"
            placeholder="Ex: (79) 99999-9999"
            {...register('clientPhone')}
          />
          {errors.clientPhone && (
            <p className="mt-1 text-sm text-red-500">{errors.clientPhone.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            É por aqui que a barbearia avisa se algo mudar no seu horário.
          </p>
        </div>

        <PaymentMethodSelector value={paymentMethod} onChange={onPaymentMethodChange} />

        <div className="pt-4 mt-6 border-t border-gray-200 dark:border-gray-800">
          <button
            type="submit"
            disabled={!isFormReady || isSubmitting}
            className="btn-primary w-full py-4 text-lg font-bold uppercase tracking-wider"
          >
            {paymentMethod === 'pix' ? 'Confirmar e Pagar' : 'Confirmar Agendamento'}
          </button>

          {!isFormReady && (
            <p className="text-xs text-center text-gray-500 mt-3">
              Preencha todos os dados e selecione um horário para confirmar.
            </p>
          )}
        </div>
      </form>

      {pendingConfirmation && (
        <ConfirmBookingDialog
          serviceName={pendingConfirmation.service.name}
          price={pendingConfirmation.service.price}
          dateLabel={pendingConfirmation.dateLabel}
          weekdayLabel={pendingConfirmation.weekdayLabel}
          time={pendingConfirmation.time}
          paymentMethod={paymentMethod}
          clientName={pendingConfirmation.data.clientName}
          onConfirm={handleConfirmBooking}
          onClose={() => setPendingConfirmation(null)}
        />
      )}

      {pendingPixPayment && (
        <PixPaymentModal
          isOpen
          bookingId={pendingPixPayment.bookingId}
          amount={pendingPixPayment.amount}
          serviceName={pendingPixPayment.serviceName}
          scheduledFor={pendingPixPayment.scheduledFor}
          onConfirmPayment={handlePixClaimed}
          onClose={handlePixModalClose}
        />
      )}
    </div>
  );
};
