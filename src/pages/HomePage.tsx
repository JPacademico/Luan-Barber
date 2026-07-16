import React from 'react';
import { HeroCarousel } from '../components/sections/HeroCarousel';
import { DailySpecials } from '../components/sections/DailySpecials';
import { OwnerSection } from '../components/sections/OwnerSection';
import { LocationSection } from '../components/sections/LocationSection';
import { BookingCallout } from '../components/sections/BookingCallout';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { PUBLIC_BRANDING } from '../constants/branding';

export const HomePage: React.FC = () => {
  // Spread the whole branding so the manifest reverts to public after visiting /admin in-app.
  useDocumentMeta({
    ...PUBLIC_BRANDING,
    title: 'Luan Studio Barber | Experiência, Estilo e Atendimento',
  });

  return (
    <>
      <HeroCarousel />
      <DailySpecials />
      <OwnerSection />
      <BookingCallout />
      <LocationSection />
    </>
  );
};
