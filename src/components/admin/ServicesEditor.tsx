import React, { useMemo, useState } from 'react';
import { Clock, Plus, RotateCcw, Save, Scissors, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useShopStore } from '../../store/shopStore';
import { SLOT_INTERVAL_MINUTES } from '../../lib/timeSlots';
import { pushServicesToBackend } from '../../lib/adminApi';
import type { Service } from '../../types';

/** Editing buffer: price/duration live as strings so a half-typed value isn't coerced to 0. */
interface ServiceDraft {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
}

const toDraft = (service: Service): ServiceDraft => ({
  id: service.id,
  name: service.name,
  price: service.price.toFixed(2),
  duration: String(service.duration),
  description: service.description,
});

/** A blank draft for a brand-new service. The UUID id is what the backend upserts under. */
const emptyDraft = (): ServiceDraft => ({
  id: crypto.randomUUID(),
  name: '',
  price: '',
  duration: String(SLOT_INTERVAL_MINUTES),
  description: '',
});

const formatPrice = (price: number): string => `R$ ${price.toFixed(2).replace('.', ',')}`;

/** Accepts both "45,50" and "45.50" — a Brazilian barber will type the comma. */
const parsePrice = (raw: string): number => Number(raw.replace(',', '.'));

const isPriceValid = (raw: string): boolean => {
  const value = parsePrice(raw);
  return raw.trim() !== '' && Number.isFinite(value) && value >= 0;
};

const isDurationValid = (raw: string): boolean => {
  const value = Number(raw);
  return Number.isInteger(value) && value >= SLOT_INTERVAL_MINUTES;
};

export const ServicesEditor: React.FC = () => {
  const services = useShopStore((state) => state.services);
  const replaceServices = useShopStore((state) => state.replaceServices);

  const [drafts, setDrafts] = useState<ServiceDraft[]>(() => services.map(toDraft));
  const [isSaving, setIsSaving] = useState(false);

  const patchDraft = (id: string, patch: Partial<ServiceDraft>) =>
    setDrafts((current) => current.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const addDraft = () => setDrafts((current) => [...current, emptyDraft()]);

  const removeDraft = (id: string) =>
    setDrafts((current) => current.filter((d) => d.id !== id));

  const invalidCount = useMemo(
    () => drafts.filter((d) => !isPriceValid(d.price) || !isDurationValid(d.duration) || !d.name.trim()).length,
    [drafts]
  );

  const isDirty = useMemo(() => {
    // An add or a remove changes the id set, even if no existing row was edited.
    if (drafts.length !== services.length) return true;

    return drafts.some((draft) => {
      const original = services.find((s) => s.id === draft.id);
      if (!original) return true; // a new draft replacing a removed one at the same count

      return (
        draft.name.trim() !== original.name ||
        parsePrice(draft.price) !== original.price ||
        Number(draft.duration) !== original.duration ||
        draft.description !== original.description
      );
    });
  }, [drafts, services]);

  const handleSave = async () => {
    if (drafts.length === 0) {
      toast.error('Adicione ao menos um serviço antes de salvar.');
      return;
    }
    if (invalidCount > 0) {
      toast.error('Corrija os campos destacados antes de salvar.');
      return;
    }

    const updated: Service[] = drafts.map((draft) => ({
      id: draft.id,
      name: draft.name.trim(),
      price: parsePrice(draft.price),
      duration: Number(draft.duration),
      description: draft.description.trim(),
    }));

    // Replace the whole catalogue at once — this is what applies adds, edits AND removes locally.
    replaceServices(updated);

    // Re-normalise the buffer so "45" renders back as "45.00" after saving.
    setDrafts((current) =>
      current.map((d) => ({ ...d, price: parsePrice(d.price).toFixed(2), name: d.name.trim() }))
    );

    setIsSaving(true);
    const outcome = await pushServicesToBackend(updated);
    setIsSaving(false);

    if (outcome === 'synced') {
      toast.success('Serviços e preços atualizados.', {
        description: 'Vale para o site, para novos agendamentos e para a cobrança Pix.',
      });
      return;
    }

    if (outcome === 'skipped') {
      // No backend configured (local demo): the local save above is all there is.
      toast.success('Serviços e preços atualizados.', {
        description: 'As alterações já valem para novos agendamentos.',
      });
      return;
    }

    /*
     * The local edit stuck but the database did not take it. That gap matters more than a normal
     * failed request: the site would advertise the new price while Pix still charges the old one,
     * so it is reported as a warning the barber has to act on, not a silent console error.
     */
    if (outcome === 'unauthorized') {
      toast.error('Sessão expirada — preços não sincronizados.', {
        description: 'Saia e entre novamente no painel para salvar no servidor.',
        duration: 10000,
      });
    } else {
      toast.error('Preços salvos apenas neste aparelho.', {
        description:
          'O servidor não confirmou a alteração; a cobrança Pix continua com o valor antigo. Tente salvar de novo.',
        duration: 10000,
      });
    }
  };

  const handleRevert = () => {
    setDrafts(services.map(toDraft));
    toast.info('Alterações descartadas.');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold text-xl tracking-tight">Serviços & Preços</h2>
          <p className="text-slate-400 text-sm mt-1">
            Adicione, edite ou remova serviços. O site público reflete na hora.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addDraft}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 text-slate-300 text-sm font-medium hover:border-brand-gold/50 hover:text-brand-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={15} /> Adicionar serviço
          </button>
          <button
            type="button"
            onClick={handleRevert}
            disabled={!isDirty || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 text-slate-300 text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw size={15} /> Descartar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || invalidCount > 0 || drafts.length === 0 || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-gold text-brand-black text-sm font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={15} /> {isSaving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </header>

      {/*
        Historical bookings intentionally keep no price snapshot — they resolve through the
        service, so the barber must know an edit moves past figures and a removal hides them.
      */}
      <p className="text-xs text-slate-500 bg-[#1a1a1a] border border-gray-800 rounded-lg p-3">
        Atenção: o valor exibido em agendamentos já realizados acompanha o preço atual do serviço.
        Um serviço removido aparece como “Serviço removido” nos agendamentos antigos.
      </p>

      {drafts.length === 0 && (
        <p className="text-sm text-slate-400 bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 text-center">
          Nenhum serviço. Clique em <span className="text-brand-gold font-medium">Adicionar serviço</span> para começar.
        </p>
      )}

      <div className="space-y-4">
        {drafts.map((draft) => {
          const priceValid = isPriceValid(draft.price);
          const durationValid = isDurationValid(draft.duration);
          const nameValid = draft.name.trim().length > 0;

          return (
            <div key={draft.id} className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-5">
              <div className="flex justify-end mb-3">
                <button
                  type="button"
                  onClick={() => removeDraft(draft.id)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Remover este serviço"
                >
                  <Trash2 size={13} /> Remover
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5">
                  <label
                    htmlFor={`name-${draft.id}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5"
                  >
                    <Scissors size={12} /> Serviço
                  </label>
                  <input
                    id={`name-${draft.id}`}
                    type="text"
                    value={draft.name}
                    onChange={(e) => patchDraft(draft.id, { name: e.target.value })}
                    className={`w-full px-3 py-2 bg-black border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold ${
                      nameValid ? 'border-gray-800' : 'border-red-500/60'
                    }`}
                  />
                </div>

                <div className="lg:col-span-3">
                  <label
                    htmlFor={`price-${draft.id}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5"
                  >
                    <Tag size={12} /> Preço (R$)
                  </label>
                  <input
                    id={`price-${draft.id}`}
                    type="text"
                    inputMode="decimal"
                    value={draft.price}
                    onChange={(e) => patchDraft(draft.id, { price: e.target.value })}
                    aria-invalid={!priceValid}
                    className={`w-full px-3 py-2 bg-black border rounded-lg text-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-gold ${
                      priceValid ? 'border-gray-800' : 'border-red-500/60'
                    }`}
                  />
                  {!priceValid && <p className="text-[11px] text-red-400 mt-1">Valor inválido.</p>}
                </div>

                <div className="lg:col-span-4">
                  <label
                    htmlFor={`duration-${draft.id}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1.5"
                  >
                    <Clock size={12} /> Duração (min)
                  </label>
                  <input
                    id={`duration-${draft.id}`}
                    type="number"
                    min={SLOT_INTERVAL_MINUTES}
                    step={SLOT_INTERVAL_MINUTES}
                    value={draft.duration}
                    onChange={(e) => patchDraft(draft.id, { duration: e.target.value })}
                    aria-invalid={!durationValid}
                    className={`w-full px-3 py-2 bg-black border rounded-lg text-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-gold ${
                      durationValid ? 'border-gray-800' : 'border-red-500/60'
                    }`}
                  />
                  {!durationValid && (
                    <p className="text-[11px] text-red-400 mt-1">
                      Mínimo {SLOT_INTERVAL_MINUTES} min.
                    </p>
                  )}
                </div>

                <div className="lg:col-span-12">
                  <label
                    htmlFor={`description-${draft.id}`}
                    className="block text-xs font-medium text-slate-400 mb-1.5"
                  >
                    Descrição
                  </label>
                  <textarea
                    id={`description-${draft.id}`}
                    value={draft.description}
                    onChange={(e) => patchDraft(draft.id, { description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-black border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold resize-none leading-relaxed"
                  />
                </div>
              </div>

              {priceValid && (
                <p className="text-xs text-slate-500 mt-3">
                  No site: <span className="text-brand-gold font-semibold">{formatPrice(parsePrice(draft.price))}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
