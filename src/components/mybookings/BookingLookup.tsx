import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { isPlausiblePhone } from '../../lib/myBookings';
import { lookupBookingByPhone } from '../../lib/bookingLookupApi';
import type { Booking } from '../../types';

interface BookingLookupProps {
  onFound: (bookings: Booking[]) => void;
}

/** For a client on a device that didn't make the booking — the id-based lookup has nothing to
 *  find in that case, so this is the fallback: search by the phone number typed at booking time. */
export const BookingLookup: React.FC<BookingLookupProps> = ({ onFound }) => {
  const [phone, setPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isPlausiblePhone(phone)) {
      toast.error('Telefone incompleto', { description: 'Informe DDD + número.' });
      return;
    }

    setIsSearching(true);
    try {
      const bookings = await lookupBookingByPhone(phone);
      if (bookings.length === 0) {
        toast.info('Nenhum agendamento encontrado com esse telefone.');
      } else {
        onFound(bookings);
      }
    } catch (error) {
      console.error('[BookingLookup] search failed', error);
      toast.error('Não foi possível buscar agora.', { description: 'Tente novamente em instantes.' });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-brand-darkgray rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm"
    >
      <h4 className="font-display font-bold text-lg text-brand-black dark:text-white mb-1">
        Agendou em outro aparelho?
      </h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Busque pelo telefone usado no agendamento.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Ex: (79) 99999-9999"
          aria-label="Telefone usado no agendamento"
          className="input-field flex-1"
        />
        <button type="submit" disabled={isSearching} className="btn-primary px-6 shrink-0">
          <Search size={16} className="mr-2" />
          {isSearching ? 'Buscando…' : 'Buscar'}
        </button>
      </div>
    </form>
  );
};
