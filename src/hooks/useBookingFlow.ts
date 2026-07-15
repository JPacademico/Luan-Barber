import { useCallback, useState } from 'react';
import type { PaymentMethod, Service } from '../types';

export interface BookingFlow {
  selectedService: Service | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  paymentMethod: PaymentMethod;
  selectService: (service: Service) => void;
  selectDate: (date: Date) => void;
  selectTime: (time: string) => void;
  selectPaymentMethod: (method: PaymentMethod) => void;
  reset: () => void;
}

/**
 * Owns the public checkout's selection state.
 *
 * Changing an earlier step clears the later ones: availability is per-date, so a time picked
 * for Tuesday must not survive a switch to Wednesday.
 */
export const useBookingFlow = (): BookingFlow => {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('local');

  const selectService = useCallback((service: Service) => {
    setSelectedService(service);
    setSelectedTime(null);
  }, []);

  const selectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  }, []);

  const reset = useCallback(() => {
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setPaymentMethod('local');
  }, []);

  return {
    selectedService,
    selectedDate,
    selectedTime,
    paymentMethod,
    selectService,
    selectDate,
    selectTime: setSelectedTime,
    selectPaymentMethod: setPaymentMethod,
    reset,
  };
};
