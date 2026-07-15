import React from 'react';
import { QrCode, Store } from 'lucide-react';
import type { PaymentMethod } from '../../types';

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'local',
    label: 'Pagar na Barbearia',
    description: 'Acerte no balcão no dia do atendimento.',
    icon: <Store size={18} />,
  },
  {
    id: 'pix',
    label: 'Pagar Antecipado via Pix',
    description: 'Garanta seu horário pagando agora.',
    icon: <QrCode size={18} />,
  },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ value, onChange }) => (
  <fieldset className="pt-4 mt-6 border-t border-gray-200 dark:border-gray-800">
    <legend className="font-display font-bold text-base text-brand-black dark:text-white mb-3">
      Forma de Pagamento
    </legend>

    <div className="space-y-3">
      {PAYMENT_OPTIONS.map((option) => {
        const isSelected = value === option.id;

        return (
          <label
            key={option.id}
            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
              isSelected
                ? 'border-brand-gold bg-brand-gold/5 dark:bg-brand-gold/10 ring-1 ring-brand-gold'
                : 'border-gray-200 dark:border-gray-700 hover:border-brand-gold/50'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={option.id}
              checked={isSelected}
              onChange={() => onChange(option.id)}
              className="sr-only"
            />

            <span
              className={`p-2 rounded-full shrink-0 ${
                isSelected
                  ? 'bg-brand-gold text-brand-black'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}
            >
              {option.icon}
            </span>

            <span className="flex-1">
              <span className="block font-bold text-sm text-brand-black dark:text-white">
                {option.label}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {option.description}
              </span>
            </span>

            <span
              className={`w-4 h-4 rounded-full border-2 shrink-0 mt-1 transition-colors ${
                isSelected ? 'border-brand-gold bg-brand-gold' : 'border-gray-300 dark:border-gray-600'
              }`}
              aria-hidden="true"
            />
          </label>
        );
      })}
    </div>
  </fieldset>
);
