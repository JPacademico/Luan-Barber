import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarOff, Clock, RotateCcw, Store, X } from 'lucide-react';
import { toast } from 'sonner';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import { SHOP_SCOPE, scopeLabel, type ScheduleScope } from '../../constants/barbers';
import {
  baseHoursForDate,
  formatHour,
  formatHoursRange,
  isEmptyWindow,
  overrideKey,
  resolveWorkingHours,
} from '../../lib/schedule';

interface DayScheduleEditorProps {
  /** Whose day this edits: `'shop'` (everyone) or one barber. */
  scope: ScheduleScope;
  /** YYYY-MM-DD of the day being edited. */
  date: string;
  onClose: () => void;
}

/** Hour options span the shop's regular window, since an override can only narrow the day. */
const buildHourOptions = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

export const DayScheduleEditor: React.FC<DayScheduleEditorProps> = ({ scope, date, onClose }) => {
  const dayOverrides = useBookingStore((state) => state.dayOverrides);
  const closeDay = useBookingStore((state) => state.closeDay);
  const resetDay = useBookingStore((state) => state.resetDay);
  const setDayHours = useBookingStore((state) => state.setDayHours);
  const getBookingsForDate = useBookingStore((state) => state.getBookingsForDate);
  const shopInfo = useShopStore((state) => state.shopInfo);

  const parsedDate = parseISO(date);
  const isShopScope = scope === SHOP_SCOPE;

  const override = dayOverrides[overrideKey(scope, date)];
  const shopOverride = dayOverrides[overrideKey(SHOP_SCOPE, date)];

  /**
   * The window this scope is being narrowed from.
   *
   * A Saturday's override is relative to Saturday's own hours, not the weekday window. And for a
   * BARBER the ceiling is the shop's hours for that date, not the shop's default: if the owner
   * already shortened the day to 09:00–12:00, offering the barber a 20:00 closing hour would let
   * them "open" during hours the shop is shut.
   */
  const defaultHours = useMemo(() => {
    const base = baseHoursForDate(shopInfo, parsedDate);
    return isShopScope ? base : resolveWorkingHours(base, shopOverride);
  }, [shopInfo, parsedDate, isShopScope, shopOverride]);

  const resolved = resolveWorkingHours(defaultHours, override);

  // Clamped into `defaultHours`, which for a barber is the shop's window for THIS date. A stored
  // barber override can fall outside it — the owner may have shortened the day afterwards — and
  // an out-of-range value has no matching <option>, leaving the select with nothing selected.
  const clamp = (hour: number, lowest: number, highest: number): number =>
    Math.min(Math.max(hour, lowest), highest);

  const [startHour, setStartHour] = useState(() =>
    clamp(resolved.start, defaultHours.start, defaultHours.end - 1)
  );
  const [endHour, setEndHour] = useState(() =>
    clamp(resolved.end, defaultHours.start + 1, defaultHours.end)
  );

  /** Only the appointments a change here would actually affect. */
  const bookingsCount = getBookingsForDate(date, isShopScope ? undefined : scope).length;

  const startOptions = useMemo(
    () => buildHourOptions(defaultHours.start, defaultHours.end - 1),
    [defaultHours]
  );
  const endOptions = useMemo(
    () => buildHourOptions(defaultHours.start + 1, defaultHours.end),
    [defaultHours]
  );

  const isWindowInvalid = isEmptyWindow({ start: startHour, end: endHour });

  const handleApplyHours = () => {
    if (isWindowInvalid) return;

    // Store only the edges that actually differ, so later changes to the shop's default hours
    // still flow through to days this scope never explicitly narrowed.
    setDayHours(
      scope,
      date,
      startHour === defaultHours.start ? null : startHour,
      endHour === defaultHours.end ? null : endHour
    );

    const isBackToDefault = startHour === defaultHours.start && endHour === defaultHours.end;
    toast.success(
      isBackToDefault
        ? `${format(parsedDate, 'dd/MM')} voltou ao horário normal (${scopeLabel(scope)}).`
        : `${format(parsedDate, 'dd/MM')}: ${scopeLabel(scope)} das ${formatHoursRange({ start: startHour, end: endHour })}.`
    );
    onClose();
  };

  const handleCloseDay = () => {
    if (bookingsCount > 0) {
      const what = isShopScope ? 'Fechar o dia' : 'Marcar folga';
      const confirmed = confirm(
        `Existem ${bookingsCount} agendamento(s) nesta agenda neste dia. ${what} NÃO cancela os agendamentos existentes. Deseja continuar?`
      );
      if (!confirmed) return;
    }

    closeDay(scope, date);
    toast.error(
      isShopScope
        ? `Barbearia fechada em ${format(parsedDate, 'dd/MM/yyyy')}. Bloqueado para todos.`
        : `Folga de ${scopeLabel(scope)} em ${format(parsedDate, 'dd/MM/yyyy')}.`
    );
    onClose();
  };

  const handleReset = () => {
    resetDay(scope, date);
    toast.success(
      `${format(parsedDate, 'dd/MM/yyyy')}: ${scopeLabel(scope)} voltou ao horário normal.`
    );
    onClose();
  };

  return (
    <div className="bg-black rounded-xl border border-gray-800 p-5">
      <header className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h4 className="text-white font-semibold tracking-tight capitalize">
            {format(parsedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h4>
          <p className="text-xs mt-1 flex items-center gap-1.5 text-brand-gold">
            {isShopScope ? <Store size={11} /> : <CalendarOff size={11} />}
            {scopeLabel(scope)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Horário padrão: {formatHoursRange(defaultHours)}
            {bookingsCount > 0 && ` · ${bookingsCount} agendamento(s)`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar editor"
          className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={16} />
        </button>
      </header>

      {override?.isClosed ? (
        <div className="flex items-center gap-2 p-3 mb-5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <CalendarOff size={14} className="shrink-0" />
          {isShopScope
            ? 'A barbearia está fechada neste dia. Reabra para definir um horário.'
            : `${scopeLabel(scope)} está de folga neste dia. Desfaça para definir um horário.`}
        </div>
      ) : (
        <div className="space-y-4 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-400 mb-1.5">Abre às</span>
              <select
                value={startHour}
                onChange={(event) => setStartHour(Number(event.target.value))}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
              >
                {startOptions.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-slate-400 mb-1.5">Fecha às</span>
              <select
                value={endHour}
                onChange={(event) => setEndHour(Number(event.target.value))}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
              >
                {endOptions.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {isWindowInvalid && (
            <p className="text-xs text-red-400">
              O horário de fechamento deve ser depois do horário de abertura.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <QuickPreset
              label="Só de manhã"
              hint={`${formatHour(defaultHours.start)}–12:00`}
              onClick={() => {
                setStartHour(defaultHours.start);
                setEndHour(12);
              }}
              disabled={defaultHours.end <= 12 || defaultHours.start >= 12}
            />
            <QuickPreset
              label="Só à tarde"
              hint={`12:00–${formatHour(defaultHours.end)}`}
              onClick={() => {
                setStartHour(12);
                setEndHour(defaultHours.end);
              }}
              disabled={defaultHours.end <= 12 || defaultHours.start >= 12}
            />
          </div>

          <button
            type="button"
            onClick={handleApplyHours}
            disabled={isWindowInvalid}
            className="w-full py-2.5 rounded-lg bg-brand-gold text-brand-black text-sm font-semibold hover:bg-brand-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Salvar horário do dia
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-4 border-t border-gray-800">
        {!override?.isClosed && (
          <button
            type="button"
            onClick={handleCloseDay}
            className="flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/40 text-red-400 text-xs font-medium hover:bg-red-500/10 transition-colors"
          >
            <CalendarOff size={14} />
            {isShopScope ? 'Fechar a barbearia o dia todo' : 'Folga o dia todo'}
          </button>
        )}

        {override && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-700 text-slate-300 text-xs font-medium hover:bg-white/5 transition-colors"
          >
            <RotateCcw size={14} /> Voltar ao horário normal
          </button>
        )}
      </div>
    </div>
  );
};

interface QuickPresetProps {
  label: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}

const QuickPreset: React.FC<QuickPresetProps> = ({ label, hint, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-slate-300 text-xs font-medium hover:border-brand-gold hover:text-brand-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    title={hint}
  >
    <Clock size={12} /> {label}
  </button>
);
