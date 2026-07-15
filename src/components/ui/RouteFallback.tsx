import React from 'react';

/**
 * Shown while a lazily-loaded route chunk arrives.
 *
 * Deliberately minimal and neutral-dark: it must not flash a light panel in front of a visitor
 * using the dark theme, and it is typically on screen for only a frame or two.
 */
export const RouteFallback: React.FC = () => (
  <div
    role="status"
    aria-label="Carregando"
    className="min-h-screen flex items-center justify-center bg-brand-cream dark:bg-brand-black"
  >
    <span className="w-8 h-8 rounded-full border-2 border-brand-gold/30 border-t-brand-gold animate-spin" />
  </div>
);
