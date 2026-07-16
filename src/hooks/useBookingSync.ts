import { useEffect } from 'react';
import { useBookingStore } from '../store/bookingStore';

/**
 * Loads bookings from the repository on mount and keeps them fresh.
 *
 * The store's `hydrate` also registers the repository's own change subscription (localStorage
 * events for the local backend, polling for the cloud backend), so a single call here is all the
 * app needs to stay in sync across tabs and devices.
 */
export const useBookingSync = (): void => {
  const hydrate = useBookingStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);
};
