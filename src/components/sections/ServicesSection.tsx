import React from 'react';
import { Scissors, Clock } from 'lucide-react';
import { useShopStore } from '../../store/shopStore';
import { SectionHeading } from '../ui/SectionHeading';
import type { Service } from '../../types';

interface ServicesSectionProps {
  /** Highlights the card matching the service currently chosen in the checkout below. */
  activeServiceId?: string | null;
  onSelectService: (service: Service) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  activeServiceId = null,
  onSelectService,
}) => {
  const services = useShopStore((state) => state.services);

  return (
    <section id="services" className="py-20 md:py-28 bg-white dark:bg-[#111] transition-colors scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Nossos Serviços"
          subtitle="Cortes precisos, barbas alinhadas e atendimento premium para elevar seu estilo."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
          {services.map((service) => {
            const isActive = activeServiceId === service.id;

            return (
              <div
                key={service.id}
                className={`card-glass p-8 group hover:-translate-y-2 transition-all duration-300 flex flex-col h-full relative overflow-hidden ${
                  isActive ? 'ring-2 ring-brand-gold' : ''
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/0 to-brand-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-full bg-brand-gold/20 flex items-center justify-center mb-6 text-brand-gold group-hover:bg-brand-gold group-hover:text-brand-black transition-colors">
                    <Scissors className="w-7 h-7" />
                  </div>

                  <h3 className="text-2xl font-display font-bold text-brand-black dark:text-white mb-2">
                    {service.name}
                  </h3>

                  <p className="text-gray-600 dark:text-gray-400 mb-6 flex-grow">
                    {service.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {service.duration} min
                      </span>
                      <span className="text-2xl font-bold text-brand-gold mt-1">
                        R$ {service.price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectService(service)}
                      className="text-sm font-medium text-brand-black dark:text-white hover:text-brand-gold dark:hover:text-brand-gold transition-colors flex items-center gap-1"
                    >
                      {isActive ? 'Selecionado' : 'Agendar'}
                      <span className="text-brand-gold ml-1">→</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
