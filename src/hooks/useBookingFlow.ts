import { useCallback, useState } from 'react';
import type { BarberId } from '../constants/barbers';
import type { PaymentMethod, Service } from '../types';

export interface BookingFlow {
  selectedService: Service | null;
  /** Null until the client picks a chair — availability can't be computed without it. */
  selectedBarberId: BarberId | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  paymentMethod: PaymentMethod;
  selectService: (service: Service) => void;
  selectBarber: (barberId: BarberId) => void;
  selectDate: (date: Date) => void;
  selectTime: (time: string) => void;
  selectPaymentMethod: (method: PaymentMethod) => void;
  reset: () => void;
}

/**
 * Owns the public checkout's selection state.
 *
 * Changing an earlier step clears the later ones: availability is per barber AND per date, so a
 * time picked for Luan on Tuesday must not survive a switch to Augusto or to Wednesday. The date
 * deliberately SURVIVES a barber change — the client is usually shopping for the same day across
 * both chairs, and the calendar immediately repaints to show whether that barber works it.
 */
export const useBookingFlow = (): BookingFlow => {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<BarberId | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('local');

  const selectService = useCallback((service: Service) => {
    setSelectedService(service);
    // A longer service needs more consecutive slots, so the chosen time may no longer fit.
    setSelectedTime(null);
  }, []);

  const selectBarber = useCallback((barberId: BarberId) => {
    setSelectedBarberId(barberId);
    setSelectedTime(null);
  }, []);

  const selectDate = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  }, []);

  const reset = useCallback(() => {
    setSelectedService(null);
    setSelectedBarberId(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setPaymentMethod('local');
  }, []);

  return {
    selectedService,
    selectedBarberId,
    selectedDate,
    selectedTime,
    paymentMethod,
    selectService,
    selectBarber,
    selectDate,
    selectTime: setSelectedTime,
    selectPaymentMethod: setPaymentMethod,
    reset,
  };
};
