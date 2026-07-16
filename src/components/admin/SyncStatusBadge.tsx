import React from 'react';
import { Cloud, CloudOff, Loader2, TriangleAlert } from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore';

/**
 * At-a-glance persistence health for the admin.
 *
 * Answers the two questions that matter when a booking "doesn't show up": is this device even
 * talking to the cloud, and did the last sync fail? An amber "Somente neste aparelho" means the
 * Supabase env vars aren't in effect (so nothing syncs across devices); a red state exposes the
 * actual error message on hover.
 */
export const SyncStatusBadge: React.FC = () => {
  const isCloud = useBookingStore((state) => state.isCloud);
  const status = useBookingStore((state) => state.status);
  const lastError = useBookingStore((state) => state.lastError);

  // The icon carries the meaning on mobile; the label appears from sm upward.
  if (status === 'loading' || status === 'idle') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-700 text-slate-400 text-xs font-medium">
        <Loader2 size={13} className="animate-spin" />
        <span className="hidden sm:inline">Sincronizando…</span>
      </span>
    );
  }

  if (lastError) {
    return (
      <span
        title={lastError}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-medium max-w-[220px]"
      >
        <TriangleAlert size={13} className="shrink-0" />
        <span className="hidden sm:inline truncate">Erro de sincronização</span>
      </span>
    );
  }

  if (!isCloud) {
    return (
      <span
        title="As variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não estão ativas neste deploy. Os dados ficam apenas neste aparelho."
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-medium"
      >
        <CloudOff size={13} className="shrink-0" />
        <span className="hidden sm:inline">Somente neste aparelho</span>
      </span>
    );
  }

  return (
    <span
      title="Agendamentos sincronizados na nuvem (Supabase) entre todos os aparelhos."
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-medium"
    >
      <Cloud size={13} className="shrink-0" />
      <span className="hidden sm:inline">Nuvem</span>
    </span>
  );
};
