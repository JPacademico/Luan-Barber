import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Clock, QrCode } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: <Clock size={18} />, label: 'Horários a cada 30 minutos' },
  { icon: <CalendarCheck size={18} />, label: 'Agenda aberta com 7 dias de antecedência' },
  { icon: <QrCode size={18} />, label: 'Pague na barbearia ou via Pix' },
];

/**
 * Home-page entry point into the checkout, which now lives at /booking together with the
 * full price catalogue.
 */
export const BookingCallout: React.FC = () => (
  <section className="py-20 md:py-28 bg-brand-cream dark:bg-brand-black transition-colors">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl bg-brand-black border border-brand-gold/30 px-6 py-12 md:px-14 md:py-16 text-center shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/10 to-transparent" aria-hidden="true" />

        <div className="relative z-10">
          <span className="inline-block text-xs uppercase tracking-[0.3em] text-brand-gold mb-4">
            Reserve seu horário
          </span>

          <h2 className="font-display font-bold text-3xl md:text-4xl text-white mb-4">
            Seu próximo corte começa aqui
          </h2>

          <p className="text-gray-400 max-w-xl mx-auto mb-10">
            Consulte todos os serviços, valores e horários livres e confirme seu agendamento em
            poucos cliques.
          </p>

          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-10 text-sm text-gray-300">
            {HIGHLIGHTS.map(({ icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <span className="text-brand-gold">{icon}</span>
                {label}
              </li>
            ))}
          </ul>

          <Link to="/booking" className="btn-primary py-4 px-10 text-base font-bold uppercase tracking-wider">
            Ver Serviços e Agendar
          </Link>
        </div>
      </div>
    </div>
  </section>
);
