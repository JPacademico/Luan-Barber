import { useEffect } from 'react';
import { useBookingStore, BOOKINGS_STORAGE_KEY } from '../store/bookingStore';
import { useShopStore, SHOP_STORAGE_KEY } from '../store/shopStore';

/**
 * Keeps every open tab on the same data.
 *
 * Zustand's `persist` writes to localStorage but never reads it back after boot, so a booking
 * taken on the public site is invisible to an `/admin` tab that was already open — the panel
 * looks broken until a manual reload. The `storage` event fires in *other* tabs on write, which
 * is exactly the signal needed to re-hydrate.
 */
export const useCrossTabSync = (): void => {
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      // A null key means the whole store was cleared; re-hydrate both to be safe.
      if (event.key !== null && event.key !== BOOKINGS_STORAGE_KEY && event.key !== SHOP_STORAGE_KEY) {
        return;
      }

      if (event.key === null || event.key === BOOKINGS_STORAGE_KEY) {
        void useBookingStore.persist.rehydrate();
      }

      if (event.key === null || event.key === SHOP_STORAGE_KEY) {
        void useShopStore.persist.rehydrate();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
};
