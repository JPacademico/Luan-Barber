import React from 'react';
import { ArrowUp, Scissors } from 'lucide-react';
import { SectionHeading } from '../ui/SectionHeading';
import { BookingCalendar } from '../booking/BookingCalendar';
import { TimeSlotGrid } from '../booking/TimeSlotGrid';
import { BookingForm } from '../booking/BookingForm';
import { BarberPicker } from '../booking/BarberPicker';
import { barberName } from '../../constants/barbers';
import type { BookingFlow } from '../../hooks/useBookingFlow';

interface BookingSectionProps {
  flow: BookingFlow;
  /** Sends the client back up to the service catalogue, which is the only service picker. */
  onChangeService: () => void;
}

const formatPrice = (price: number): string => `R$ ${price.toFixed(2).replace('.', ',')}`;

/**
 * Steps 1–3 of the checkout: barber, date, time. The SERVICE is chosen in the catalogue above
 * (ServicesSection) and only summarised here.
 *
 * This section used to repeat the service list as its own "1. Selecione o Serviço" step, which
 * meant tapping a service in the catalogue scrolled the client down to a second, identical service
 * picker instead of to the part they still had to fill in. There is now exactly one place to pick
 * a service, and this section starts where that choice leaves off.
 */
export const BookingSection: React.FC<BookingSectionProps> = ({ flow, onChangeService }) => {
  const { selectedService, selectedBarberId, selectedDate, selectedTime } = flow;

  const hasService = Boolean(selectedService);
  const hasBarber = Boolean(selectedBarberId);

  return (
    <section id="booking" className="py-20 md:py-28 bg-brand-cream dark:bg-brand-black transition-colors scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Agende seu Horário"
          subtitle="Garanta seu lugar. O processo é rápido, fácil e seguro."
        />

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {/* What the catalogue above chose, restated so the client never loses the thread. */}
            <div className="bg-white dark:bg-brand-darkgray rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
              {selectedService ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="p-2 rounded-full bg-brand-gold text-brand-black shrink-0">
                      <Scissors size={18} />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Serviço escolhido
                      </span>
                      <span className="block font-bold text-brand-black dark:text-white truncate">
                        {selectedService.name}
                        <span className="font-normal text-gray-500 text-sm">
                          {' '}· {selectedService.duration} min · {formatPrice(selectedService.price)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onChangeService}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-brand-gold hover:text-brand-gold transition-colors"
                  >
                    <ArrowUp size={13} /> Trocar serviço
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onChangeService}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-brand-gold transition-colors py-2"
                >
                  <ArrowUp size={15} /> Escolha um serviço na lista acima para começar
                </button>
              )}
            </div>

            <div
              className={`transition-opacity duration-300 ${
                hasService ? 'opacity-100' : 'opacity-50 pointer-events-none'
              }`}
            >
              <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-4">
                1. Escolha o Profissional
              </h4>
              <BarberPicker
                selectedBarberId={selectedBarberId}
                onSelectBarber={flow.selectBarber}
              />
            </div>

            <div
              className={`transition-opacity duration-300 ${
                hasService && hasBarber ? 'opacity-100' : 'opacity-50 pointer-events-none'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-4">
                    2. Escolha a Data
                  </h4>
                  <BookingCalendar
                    barberId={selectedBarberId}
                    selectedDate={selectedDate}
                    onSelectDate={flow.selectDate}
                  />
                </div>

                <div>
                  <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-4">
                    3. Escolha o Horário
                  </h4>
                  {selectedDate && selectedService && selectedBarberId ? (
                    <TimeSlotGrid
                      barberId={selectedBarberId}
                      selectedDate={selectedDate}
                      selectedService={selectedService}
                      selectedTime={selectedTime}
                      onSelectTime={flow.selectTime}
                    />
                  ) : (
                    <div className="bg-white dark:bg-brand-darkgray rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm h-full flex items-center justify-center text-center text-gray-500">
                      {selectedBarberId
                        ? 'Selecione uma data no calendário primeiro.'
                        : 'Escolha o profissional para ver os horários livres.'}
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
              selectedBarberId={selectedBarberId}
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
                  {selectedBarberId && (
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Profissional:</dt>
                      <dd className="font-bold">{barberName(selectedBarberId)}</dd>
                    </div>
                  )}
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
