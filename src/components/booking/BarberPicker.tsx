import React from 'react';
import { User } from 'lucide-react';
import { BARBERS, type BarberId } from '../../constants/barbers';

interface BarberPickerProps {
  selectedBarberId: BarberId | null;
  onSelectBarber: (barberId: BarberId) => void;
}

/**
 * Which chair the client wants. Comes before the date on purpose: the two barbers keep separate
 * agendas and separate days off, so neither the calendar nor the slot grid can say what is free
 * until this is answered.
 *
 * Deliberately not pre-selected. Defaulting to Luan would quietly book the owner for anyone who
 * skimmed past this step, which is exactly the mistake the step exists to prevent.
 */
export const BarberPicker: React.FC<BarberPickerProps> = ({ selectedBarberId, onSelectBarber }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="group" aria-label="Escolha o profissional">
    {BARBERS.map((barber) => {
      const isSelected = selectedBarberId === barber.id;

      return (
        <button
          key={barber.id}
          type="button"
          onClick={() => onSelectBarber(barber.id)}
          aria-pressed={isSelected}
          className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all ${
            isSelected
              ? 'border-brand-gold bg-brand-gold/5 dark:bg-brand-gold/10 ring-1 ring-brand-gold'
              : 'border-gray-200 dark:border-gray-700 hover:border-brand-gold/50 bg-white dark:bg-[#1a1a1a]'
          }`}
        >
          <span
            className={`p-2.5 rounded-full shrink-0 ${
              isSelected
                ? 'bg-brand-gold text-brand-black'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
            }`}
          >
            <User size={18} />
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-brand-black dark:text-white truncate">
              {barber.name}
            </span>
            <span className="block text-xs text-gray-500 truncate">{barber.title}</span>
          </span>
        </button>
      );
    })}
  </div>
);
