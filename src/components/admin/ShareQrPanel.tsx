import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, Link2, QrCode, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  QR_QUIET_ZONE_MODULES,
  buildQrModules,
  qrModulesToPathData,
  qrModulesToPngBlob,
} from '../../lib/qrCode';

const PNG_FILE_NAME = 'luan-studio-qrcode.png';

/**
 * Small "share the shop" panel: a QR code pointing at the public landing page, ready to print or
 * send.
 *
 * The URL is taken from wherever the panel is actually being served rather than hardcoded, so the
 * code can never drift from the live address (and a staging copy prints its own link, not
 * production's).
 */
export const ShareQrPanel: React.FC = () => {
  const [hasCopied, setHasCopied] = useState(false);
  const [isPreparingFile, setIsPreparingFile] = useState(false);

  // `window` is safe at render time: this is a client-rendered SPA with no SSR pass.
  const siteUrl = useMemo(() => `${window.location.origin}/`, []);
  const modules = useMemo(() => buildQrModules(siteUrl), [siteUrl]);
  const pathData = useMemo(() => qrModulesToPathData(modules), [modules]);

  const viewBoxSize = modules.length + QR_QUIET_ZONE_MODULES * 2;

  // Feature-detected once: iOS/Android share sheets accept files, most desktop browsers don't.
  const supportsFileShare =
    typeof navigator.share === 'function' && typeof navigator.canShare === 'function';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setHasCopied(true);
      window.setTimeout(() => setHasCopied(false), 2000);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar.', { description: 'Copie o endereço manualmente.' });
    }
  };

  const handleDownload = async () => {
    setIsPreparingFile(true);
    try {
      const blob = await qrModulesToPngBlob(modules);
      const objectUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = PNG_FILE_NAME;
      anchor.click();

      // Freed on the next tick: revoking synchronously can cancel the download mid-flight.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success('QR Code baixado.');
    } catch (error) {
      console.error('[qr] download failed', error);
      toast.error('Não foi possível gerar a imagem.');
    } finally {
      setIsPreparingFile(false);
    }
  };

  const handleShare = async () => {
    setIsPreparingFile(true);
    try {
      const blob = await qrModulesToPngBlob(modules);
      const file = new File([blob], PNG_FILE_NAME, { type: 'image/png' });

      // Re-checked with the real file: support is per-payload, not just per-browser.
      if (!navigator.canShare({ files: [file] })) {
        toast.error('Este aparelho não permite compartilhar a imagem.', {
          description: 'Use "Baixar PNG" e envie o arquivo manualmente.',
        });
        return;
      }

      await navigator.share({
        files: [file],
        title: 'Luan Studio Barber',
        text: `Agende seu horário: ${siteUrl}`,
      });
    } catch (error) {
      // The user dismissing the share sheet rejects the promise — that is not a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('[qr] share failed', error);
      toast.error('Não foi possível compartilhar.');
    } finally {
      setIsPreparingFile(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-white font-semibold text-xl tracking-tight">Divulgação</h2>
        <p className="text-slate-400 text-sm mt-1">
          Imprima ou envie este código — quem escanear cai direto na página de agendamento.
        </p>
      </header>

      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6 max-w-md">
        <div className="flex items-center gap-2 text-brand-gold mb-5">
          <QrCode size={18} className="shrink-0" />
          <h3 className="font-semibold text-sm">QR Code do site</h3>
        </div>

        {/*
          Always black on solid white, never themed. A scanner needs the light/dark contrast, and
          the panel around it is near-black — a "dark mode" QR simply would not read.
        */}
        <div className="bg-white rounded-xl p-4 flex justify-center">
          <svg
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            role="img"
            aria-label={`QR Code para ${siteUrl}`}
            shapeRendering="crispEdges"
            className="w-full max-w-[260px] h-auto"
          >
            <rect width={viewBoxSize} height={viewBoxSize} fill="#FFFFFF" />
            <g transform={`translate(${QR_QUIET_ZONE_MODULES} ${QR_QUIET_ZONE_MODULES})`}>
              <path d={pathData} fill="#000000" />
            </g>
          </svg>
        </div>

        <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg bg-black border border-gray-800">
          <Link2 size={13} className="text-slate-500 shrink-0" />
          <span className="text-slate-300 text-xs font-mono truncate" title={siteUrl}>
            {siteUrl}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-700 text-slate-300 text-xs font-medium hover:border-brand-gold/50 hover:text-brand-gold transition-colors"
          >
            {hasCopied ? <Check size={14} /> : <Copy size={14} />}
            {hasCopied ? 'Copiado' : 'Copiar link'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isPreparingFile}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-brand-gold text-brand-black text-xs font-bold hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Baixar PNG
          </button>

          {supportsFileShare && (
            <button
              type="button"
              onClick={handleShare}
              disabled={isPreparingFile}
              className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-700 text-slate-300 text-xs font-medium hover:border-brand-gold/50 hover:text-brand-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Share2 size={14} />
              Compartilhar
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
          O endereço está gravado dentro do próprio código — <strong>não expira</strong> e não
          depende de nenhum serviço externo. Vale para material impresso.
        </p>
      </div>
    </div>
  );
};
