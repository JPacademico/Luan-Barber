import React from 'react';
import { Scissors } from 'lucide-react';
import { SectionHeading } from '../ui/SectionHeading';
import { useShopStore } from '../../store/shopStore';
import { BookingCalendar } from '../booking/BookingCalendar';
import { TimeSlotGrid } from '../booking/TimeSlotGrid';
import { BookingForm } from '../booking/BookingForm';
import type { BookingFlow } from '../../hooks/useBookingFlow';

interface BookingSectionProps {
  flow: BookingFlow;
}

const formatPrice = (price: number): string => `R$ ${price.toFixed(2).replace('.', ',')}`;

export const BookingSection: React.FC<BookingSectionProps> = ({ flow }) => {
  const services = useShopStore((state) => state.services);
  const { selectedService, selectedDate, selectedTime } = flow;

  return (
    <section id="booking" className="py-20 md:py-28 bg-brand-cream dark:bg-brand-black transition-colors scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Agende seu Horário"
          subtitle="Garanta seu lugar. O processo é rápido, fácil e seguro."
        />

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white dark:bg-brand-darkgray rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-4">
                1. Selecione o Serviço
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => {
                  const isSelected = selectedService?.id === service.id;

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => flow.selectService(service)}
                      aria-pressed={isSelected}
                      className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-brand-gold bg-brand-gold/5 dark:bg-brand-gold/10 ring-1 ring-brand-gold'
                          : 'border-gray-200 dark:border-gray-700 hover:border-brand-gold/50 bg-white dark:bg-[#1a1a1a]'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`p-2 rounded-full ${
                            isSelected
                              ? 'bg-brand-gold text-brand-black'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          }`}
                        >
                          <Scissors size={18} />
                        </span>
                        <span>
                          <span className="block font-bold text-brand-black dark:text-white">
                            {service.name}
                          </span>
                          <span className="block text-xs text-gray-500">{service.duration} min</span>
                        </span>
                      </span>
                      <span className="font-bold text-brand-gold">{formatPrice(service.price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={`transition-opacity duration-300 ${
                selectedService ? 'opacity-100' : 'opacity-50 pointer-events-none'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-4">
                    2. Escolha a Data
                  </h4>
                  <BookingCalendar selectedDate={selectedDate} onSelectDate={flow.selectDate} />
                </div>

                <div>
                  <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-4">
                    3. Escolha o Horário
                  </h4>
                  {selectedDate && selectedService ? (
                    <TimeSlotGrid
                      selectedDate={selectedDate}
                      selectedService={selectedService}
                      selectedTime={selectedTime}
                      onSelectTime={flow.selectTime}
                    />
                  ) : (
                    <div className="bg-white dark:bg-brand-darkgray rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm h-full flex items-center justify-center text-center text-gray-500">
                      Selecione uma data no calendário primeiro.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className={`lg:col-span-4 transition-opacity duration-300 ${
              selectedTime ? 'opacity-100' : 'opacity-50 pointer-events-none'
            }`}
          >
            <BookingForm
              selectedService={selectedService}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              paymentMethod={flow.paymentMethod}
              onPaymentMethodChange={flow.selectPaymentMethod}
              onSuccess={flow.reset}
            />

            {selectedService && (
              <div className="mt-6 bg-brand-black p-6 rounded-xl border border-brand-gold/30 text-white shadow-lg">
                <h5 className="font-display font-bold text-lg text-brand-gold mb-4 border-b border-gray-800 pb-2">
                  Resumo
                </h5>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Serviço:</dt>
                    <dd className="font-bold">{selectedService.name}</dd>
                  </div>
                  {selectedDate && (
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Data:</dt>
                      <dd className="font-bold">{selectedDate.toLocaleDateString('pt-BR')}</dd>
                    </div>
                  )}
                  {selectedTime && (
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Horário:</dt>
                      <dd className="font-bold">{selectedTime}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Pagamento:</dt>
                    <dd className="font-bold">
                      {flow.paymentMethod === 'pix' ? 'Pix antecipado' : 'Na barbearia'}
                    </dd>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-800 mt-3">
                    <dt className="text-gray-400">Total:</dt>
                    <dd className="font-bold text-brand-gold text-lg">
                      {formatPrice(selectedService.price)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
