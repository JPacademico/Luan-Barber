import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { useShopStore } from '../../store/shopStore';
import { buildPlaceholderQrDataUri, buildSimulatedPixPayload } from '../../lib/pix';
import { Modal } from '../ui/Modal';

interface PixPaymentModalProps {
  isOpen: boolean;
  /** Used as the Pix reference and as the seed for the placeholder QR pattern. */
  bookingId: string;
  amount: number;
  serviceName: string;
  scheduledFor: string;
  onConfirmPayment: () => void;
  onClose: () => void;
}

const formatCurrency = (value: number): string => `R$ ${value.toFixed(2).replace('.', ',')}`;

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  bookingId,
  amount,
  serviceName,
  scheduledFor,
  onConfirmPayment,
  onClose,
}) => {
  const shopInfo = useShopStore((state) => state.shopInfo);
  const [hasCopied, setHasCopied] = useState(false);

  const reference = useMemo(() => bookingId.replace(/-/g, '').slice(0, 12).toUpperCase(), [bookingId]);

  const pixPayload = useMemo(
    () =>
      buildSimulatedPixPayload({
        pixKey: shopInfo.pixKey,
        merchantName: 'LUAN STUDIO BARBER',
        city: 'ARACAJU',
        amount,
        reference,
      }),
    [shopInfo.pixKey, amount, reference]
  );

  const qrDataUri = useMemo(() => buildPlaceholderQrDataUri(bookingId), [bookingId]);

  useEffect(() => {
    if (!hasCopied) return;
    const timeoutId = window.setTimeout(() => setHasCopied(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [hasCopied]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixPayload);
      setHasCopied(true);
      toast.success('Código Pix copiado!');
    } catch {
      toast.error('Não foi possível copiar. Selecione o código manualmente.');
    }
  };

  return (
    <Modal
      labelledBy="pix-modal-title"
      onClose={onClose}
      className="max-w-md bg-white dark:bg-brand-gray border border-gray-200 dark:border-gray-800"
    >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-brand-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-8">
          <header className="text-center mb-6">
            <h3
              id="pix-modal-title"
              className="font-display font-bold text-2xl text-brand-black dark:text-white"
            >
              Confirmar Pagamento
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {serviceName} · {scheduledFor}
            </p>
          </header>

          <div className="flex items-start gap-2 p-3 mb-6 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong>Ambiente de demonstração.</strong> Este Pix é simulado: o QR Code é
              ilustrativo e nenhuma cobrança real é gerada.
            </p>
          </div>

          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-white rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <img
                src={qrDataUri}
                alt="QR Code Pix ilustrativo (simulação)"
                className="w-44 h-44"
              />
            </div>
            <div className="mt-4 text-center">
              <span className="block text-xs uppercase tracking-widest text-gray-400">Valor</span>
              <span className="block font-display font-bold text-3xl text-brand-gold mt-1">
                {formatCurrency(amount)}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <label
              htmlFor="pix-payload"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Pix Copia e Cola
            </label>
            <div className="flex gap-2">
              <input
                id="pix-payload"
                readOnly
                value={pixPayload}
                onFocus={(event) => event.target.select()}
                className="input-field flex-1 font-mono text-xs truncate"
              />
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copiar código Pix"
                className="btn-secondary px-4 py-3 shrink-0"
              >
                {hasCopied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onConfirmPayment}
            className="btn-primary w-full py-4 text-base font-bold uppercase tracking-wider"
          >
            Já Paguei
          </button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
            Seu agendamento já está reservado. A barbearia confirmará o recebimento antes do
            atendimento.
          </p>
        </div>
    </Modal>
  );
};
