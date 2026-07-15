import { useEffect } from 'react';
import { useBookingStore } from '../store/bookingStore';

const ARCHIVE_CHECK_INTERVAL_MS = 60_000;

/**
 * Re-evaluates the 22:00 cut-off against the system clock while the app is open.
 *
 * The store already archives on rehydration, but a panel left open all evening would otherwise
 * never notice the cut-off passing, so the check is repeated on a timer and whenever the tab
 * regains focus (which also covers a machine waking from sleep).
 */
export const useAutoArchive = (): void => {
  const archiveStaleBookings = useBookingStore((state) => state.archiveStaleBookings);

  useEffect(() => {
    archiveStaleBookings();

    const intervalId = window.setInterval(archiveStaleBookings, ARCHIVE_CHECK_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') archiveStaleBookings();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [archiveStaleBookings]);
};
