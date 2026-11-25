import React, { useCallback } from 'react';
import { ServicesSection } from '../components/sections/ServicesSection';
import { BookingSection } from '../components/sections/BookingSection';
import { useBookingFlow } from '../hooks/useBookingFlow';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PUBLIC_BRANDING } from '../constants/branding';
import type { Service } from '../types';

export const BookingPage: React.FC = () => {
  const flow = useBookingFlow();
  const { selectService } = flow;

  useDocumentMeta({
    ...PUBLIC_BRANDING,
    title: 'Agendamento e Preços | Luan Studio Barber',
  });

  /**
   * Picking from the catalogue is step zero, so it scrolls down to the checkout — which now
   * opens on the barber step rather than on a second copy of this very list.
   */
  const handleSelectFromCatalogue = useCallback(
    (service: Service) => {
      selectService(service);
      document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
    },
    [selectService]
  );

  /** "Trocar serviço" in the checkout sends the client back up to the one service picker. */
  const handleChangeService = useCallback(() => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <>
      <header className="pt-32 pb-16 bg-brand-black text-center px-4">
        <span className="inline-block text-xs uppercase tracking-[0.3em] text-brand-gold mb-4">
          Luan Studio Barber
        </span>
        <h1 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
          Serviços & Agendamento
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Escolha o serviço, o profissional, veja os horários livres e confirme sua reserva.
        </p>
      </header>

      <ServicesSection
        activeServiceId={flow.selectedService?.id ?? null}
        onSelectService={handleSelectFromCatalogue}
      />

      <BookingSection flow={flow} onChangeService={handleChangeService} />
    </>
  );
};
