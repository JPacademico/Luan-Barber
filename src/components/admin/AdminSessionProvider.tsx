import React, { useMemo } from 'react';
import { BARBERS, findBarber } from '../../constants/barbers';
import type { AdminSession } from '../../lib/adminSession';
import { AdminSessionContext, type AdminSessionValue } from './adminSessionContext';

interface AdminSessionProviderProps {
  session: AdminSession;
  children: React.ReactNode;
}

/**
 * Carries the logged-in identity to every admin panel.
 *
 * A context rather than another zustand store: this is read-only for the whole subtree and is
 * created by the gate that authenticated it, so it cannot exist in an unauthenticated render — a
 * global store could be read (or left stale) by a panel rendered outside the gate.
 */
export const AdminSessionProvider: React.FC<AdminSessionProviderProps> = ({ session, children }) => {
  const value = useMemo<AdminSessionValue>(() => {
    const barber = findBarber(session.barberId);
    return {
      ...session,
      isOwner: session.role === 'owner',
      barber,
      visibleBarbers: session.role === 'owner' ? BARBERS : barber ? [barber] : [],
    };
  }, [session]);

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
};
