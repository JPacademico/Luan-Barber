import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { bookingFormSchema, type BookingFormData } from '../../lib/validations';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import { isRangeAvailable } from '../../lib/timeSlots';
import { resolveWorkingHours } from '../../lib/schedule';
import type { Booking, PaymentMethod, Service } from '../../types';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PixPaymentModal } from './PixPaymentModal';

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

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    mode: 'onChange',
  });

  const onSubmit = (data: BookingFormData) => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error('Por favor, selecione o serviço, data e horário.');
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Re-check the range at submit time: between selecting the slot and confirming, another
    // device may have taken part of it. The UI already hides conflicts, but this guards the race.
    const stillAvailable = isRangeAvailable({
      startTime: selectedTime,
      durationMinutes: selectedService.duration,
      workingHours: resolveWorkingHours(shopInfo.workingHours, getDayOverride(dateStr)),
      occupied: getOccupiedSlots(dateStr),
      isToday: dateStr === format(new Date(), 'yyyy-MM-dd'),
    });

    if (!stillAvailable) {
      toast.error('Este horário acabou de ser ocupado.', {
        description: 'Escolha outro horário para continuar.',
      });
      return;
    }

    const scheduledFor = `${format(selectedDate, 'dd/MM/yyyy')} às ${selectedTime}`;

    const newBooking: Booking = {
      id: crypto.randomUUID(),
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      serviceId: selectedService.id,
      durationMinutes: selectedService.duration,
      date: dateStr,
      time: selectedTime,
      createdAt: new Date().toISOString(),
      paymentMethod,
      isPaid: false,
      paymentClaimedAt: null,
      status: 'active',
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
    };

    addBooking(newBooking);
    reset();

    // The shop (admin) is notified automatically by the backend the moment the booking is
    // created — the browser no longer opens WhatsApp on submit.
    if (paymentMethod === 'pix') {
      // The slot is already reserved; the modal only collects the (simulated) payment claim.
      setPendingPixPayment({
        bookingId: newBooking.id,
        amount: selectedService.price,
        serviceName: selectedService.name,
        scheduledFor,
      });
      return;
    }

    toast.success('Agendamento realizado com sucesso!', {
      description: `${selectedService.name} em ${scheduledFor}.`,
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
        </div>

        <div>
          <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="clientEmail"
            type="email"
            className="input-field"
            placeholder="Ex: joao@email.com"
            {...register('clientEmail')}
          />
          {errors.clientEmail && (
            <p className="mt-1 text-sm text-red-500">{errors.clientEmail.message}</p>
          )}
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
