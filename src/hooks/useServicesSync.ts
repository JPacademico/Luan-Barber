import { useEffect } from 'react';
import { useShopStore } from '../store/shopStore';

/**
 * Pulls the service catalogue from the database on mount.
 *
 * Prices are shared state, not a per-device preference: the database row is what Pix charges and
 * what every visitor must see. Without this, the catalogue lived only in each browser's
 * localStorage, so a price edited in the admin panel changed nothing for anyone else.
 *
 * Refetches when the tab regains focus, matching how the booking repository catches up after the
 * device has been asleep — a price changed on another device shows up on return rather than
 * waiting for a reload.
 */
export const useServicesSync = (): void => {
  const syncServicesFromCloud = useShopStore((state) => state.syncServicesFromCloud);

  useEffect(() => {
    void syncServicesFromCloud();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void syncServicesFromCloud();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [syncServicesFromCloud]);
};
