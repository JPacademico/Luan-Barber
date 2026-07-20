import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { enableAdminPush, isPushSupported, type PushEnableResult } from '../../lib/push';
import { IS_PUSH_ENABLED } from '../../lib/env';

const MESSAGES: Record<PushEnableResult, readonly ['success' | 'error', string]> = {
  subscribed: ['success', 'Notificações ativadas neste aparelho.'],
  denied: ['error', 'Permissão negada. Ative nas configurações do navegador.'],
  unsupported: ['error', 'Este navegador não suporta notificações.'],
  'not-configured': ['error', 'Notificações ainda não configuradas no servidor.'],
  error: ['error', 'Não foi possível ativar. Tente novamente.'],
};

/** Lets the admin opt this device into Web Push for new-booking alerts. Behind the admin gate. */
export const PushToggle: React.FC = () => {
  const [busy, setBusy] = useState(false);

  if (!IS_PUSH_ENABLED || !isPushSupported()) return null;

  const handleClick = async () => {
    setBusy(true);
    const result = await enableAdminPush();
    const [kind, message] = MESSAGES[result];
    if (kind === 'success') toast.success(message);
    else toast.error(message);
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 text-slate-400 text-xs font-medium hover:border-brand-gold/50 hover:text-brand-gold transition-colors disabled:opacity-50 whitespace-nowrap"
      title="Ativar notificações de novo agendamento neste aparelho"
    >
      <Bell size={14} /> {busy ? 'Ativando…' : 'Ativar notificações'}
    </button>
  );
};
