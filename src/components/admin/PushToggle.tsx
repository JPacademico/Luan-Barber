import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { enableAdminPush, isPushSupported, type PushEnableResult } from '../../lib/push';
import { IS_PUSH_ENABLED } from '../../lib/env';

const MESSAGES: Record<PushEnableResult, readonly ['success' | 'error', string, string?]> = {
  subscribed: ['success', 'Notificações ativadas neste aparelho.'],
  denied: ['error', 'Permissão negada. Ative nas configurações do navegador.'],
  unsupported: ['error', 'Este navegador não suporta notificações.'],
  'not-configured': ['error', 'Notificações ainda não configuradas no servidor.'],
  'no-service-worker': [
    'error',
    'Indisponível neste modo.',
    'O service worker só é registrado no site publicado — teste pelo deploy, não pelo servidor local.',
  ],
  'server-error': [
    'error',
    'O servidor recusou o cadastro.',
    'Verifique se as migrações do backend foram aplicadas. Detalhes no console do navegador.',
  ],
  error: ['error', 'Não foi possível ativar. Tente novamente.'],
};

/** Lets the admin opt this device into Web Push for new-booking alerts. Behind the admin gate. */
export const PushToggle: React.FC = () => {
  const [busy, setBusy] = useState(false);

  if (!IS_PUSH_ENABLED || !isPushSupported()) return null;

  const handleClick = async () => {
    setBusy(true);
    const result = await enableAdminPush();
    const [kind, message, description] = MESSAGES[result];
    if (kind === 'success') toast.success(message);
    else toast.error(message, { description, duration: description ? 9000 : 5000 });
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label="Ativar notificações"
      className="inline-flex shrink-0 items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg border border-gray-700 text-slate-400 text-xs font-medium hover:border-brand-gold/50 hover:text-brand-gold transition-colors disabled:opacity-50 whitespace-nowrap"
      title="Ativar notificações de novo agendamento neste aparelho"
    >
      <Bell size={15} className="shrink-0" />
      {/* Label only from sm up — the admin header is tight on phones. */}
      <span className="hidden sm:inline">{busy ? 'Ativando…' : 'Ativar notificações'}</span>
    </button>
  );
};
