import { useEffect } from 'react';
import { useShopStore, SHOP_STORAGE_KEY } from '../store/shopStore';

/**
 * Keeps the shop configuration (services, prices, hours, content) in sync across tabs.
 *
 * Bookings and schedule overrides no longer live here — they are owned by the booking repository,
 * which syncs itself across tabs (localStorage events) and devices (cloud polling). This hook now
 * covers only the shop store, which remains per-device localStorage config.
 */
export const useCrossTabSync = (): void => {
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SHOP_STORAGE_KEY || event.key === null) {
        void useShopStore.persist.rehydrate();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
};
