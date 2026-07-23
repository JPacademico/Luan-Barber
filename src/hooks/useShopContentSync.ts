import { useEffect } from 'react';
import { useShopStore } from '../store/shopStore';

/**
 * Pulls the shared site content (owner, carousel, shop info) from the database on mount.
 *
 * The working hours inside `shopInfo` decide which time slots the client booking grid offers, so
 * they have to be shared state — not each device's localStorage. Without this, a client saw their
 * own device's default hours instead of the ones Luan set on his phone.
 *
 * Refetches when the tab regains focus, so a change made on another device shows up on return
 * rather than waiting for a reload — the same catch-up the services and booking syncs do.
 */
export const useShopContentSync = (): void => {
  const syncShopContentFromCloud = useShopStore((state) => state.syncShopContentFromCloud);

  useEffect(() => {
    void syncShopContentFromCloud();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void syncShopContentFromCloud();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [syncShopContentFromCloud]);
};
