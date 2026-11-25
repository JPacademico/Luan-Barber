import { createContext, useContext } from 'react';
import type { Barber } from '../../constants/barbers';
import type { AdminSession } from '../../lib/adminSession';

/**
 * The logged-in admin identity, as every panel reads it.
 *
 * Split from AdminSessionProvider.tsx so that file exports only a component: mixing a component
 * and a hook in one module breaks Vite's Fast Refresh for the whole module.
 */
export interface AdminSessionValue extends AdminSession {
  /** True for Luan: every agenda, every panel. */
  isOwner: boolean;
  /** The barber this login works as, or undefined if their id has left the roster. */
  barber: Barber | undefined;
  /**
   * Whose agendas this login may look at. The owner gets every barber; an employee gets exactly
   * one entry — their own — so panels can map over this instead of branching on the role.
   */
  visibleBarbers: readonly Barber[];
}

export const AdminSessionContext = createContext<AdminSessionValue | null>(null);

/** Throws outside the provider: a panel reading this without a session is a wiring bug, not a state. */
export const useAdminSession = (): AdminSessionValue => {
  const value = useContext(AdminSessionContext);
  if (!value) {
    throw new Error('useAdminSession must be used inside <AdminSessionProvider>');
  }
  return value;
};
