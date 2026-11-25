import React, { useMemo, useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isBefore,
  isSameDay,
  startOfDay,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CalendarOff,
  Clock,
  MousePointerClick,
  Store,
} from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import { DayScheduleEditor } from './DayScheduleEditor';
import { useAdminSession } from './adminSessionContext';
import {
  SHOP_SCOPE,
  scopeLabel,
  type ScheduleScope,
} from '../../constants/barbers';
import {
  baseHoursForDate,
  formatHoursRange,
  hasCustomHours,
  isWeeklyClosedDay,
  overrideKey,
  resolveDayForBarber,
  resolveWorkingHours,
  toDateKey,
} from '../../lib/schedule';

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CalendarManager: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dayOverrides = useBookingStore((state) => state.dayOverrides);
  const getBookingsForDate = useBookingStore((state) => state.getBookingsForDate);
  const shopInfo = useShopStore((state) => state.shopInfo);

  const { isOwner, barberId: ownBarberId, visibleBarbers } = useAdminSession();

  /**
   * What the calendar is editing.
   *
   * The owner may close the whole shop (`'shop'`) or give either barber a day off; an employee
   * only ever edits their OWN scope — the switcher is not rendered for them and `scope` is pinned
   * below, so neither a shop-wide closure nor the owner's agenda is reachable from their login.
   */
  const [scope, setScope] = useState<ScheduleScope>(() => (isOwner ? SHOP_SCOPE : ownBarberId));
  const effectiveScope: ScheduleScope = isOwner ? scope : ownBarberId;
  const isShopScope = effectiveScope === SHOP_SCOPE;

  const scopeOptions = useMemo<ScheduleScope[]>(
    () => (isOwner ? [SHOP_SCOPE, ...visibleBarbers.map((b) => b.id)] : [ownBarberId]),
    [isOwner, visibleBarbers, ownBarberId]
  );

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const emptyDays = Array.from({ length: startOfMonth(currentMonth).getDay() }, (_, i) => i);

  /**
   * Exceptions this login may see, upcoming only — past ones are noise. An employee sees their own
   * plus the shop's (they need to know the shop is shut on the 7th, they just can't change it).
   */
  const upcomingExceptions = useMemo(() => {
    const today = startOfDay(new Date());

    return Object.values(dayOverrides)
      .filter((override) => !isBefore(parseISO(override.date), today))
      .filter(
        (override) =>
          isOwner || override.barberId === SHOP_SCOPE || override.barberId === ownBarberId
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.barberId.localeCompare(b.barberId));
  }, [dayOverrides, isOwner, ownBarberId]);

  /** Can this login open the editor on that exception? Shop-wide ones are the owner's alone. */
  const canEditScope = (candidate: string): boolean =>
    isOwner || candidate === ownBarberId;

  /** How a date looks under the currently selected scope. */
  const describeCell = (date: Date) => {
    const dateStr = toDateKey(date);
    const shopOverride = dayOverrides[overrideKey(SHOP_SCOPE, dateStr)];
    const scopeOverride = dayOverrides[overrideKey(effectiveScope, dateStr)];

    if (isShopScope) {
      const base = baseHoursForDate(shopInfo, date);
      return {
        dateStr,
        isClosed: shopOverride?.isClosed ?? false,
        isSpecial: hasCustomHours(base, shopOverride),
        // The shop closure is what this scope sets, so nothing blocks editing it.
        isLockedByShop: false,
        hours: resolveWorkingHours(base, shopOverride),
      };
    }

    const resolved = resolveDayForBarber({
      date,
      baseHours: baseHoursForDate(shopInfo, date),
      shopOverride,
      barberOverride: scopeOverride,
    });

    return {
      dateStr,
      isClosed: resolved.isClosed,
      isSpecial: !resolved.isClosed && resolved.isCustom,
      // The shop being shut outranks anything a barber can set, so there is nothing to edit.
      isLockedByShop: resolved.closedBy === 'shop',
      hours: resolved.hours,
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
        <header className="mb-6">
          <h3 className="text-white font-semibold text-lg tracking-tight">Gestão de Agenda</h3>
          <p className="text-slate-400 text-sm mt-1">
            {isShopScope
              ? 'Fechar a barbearia inteira ou reduzir o horário de funcionamento.'
              : 'Marcar folgas e horários reduzidos — somente para esta agenda.'}
          </p>
        </header>

        {isOwner ? (
          <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Escolher agenda">
            {scopeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setScope(option);
                  // The editor is bound to a scope+date pair; keeping the date open across a
                  // scope switch would show the previous scope's state under the new heading.
                  setSelectedDate(null);
                }}
                aria-pressed={effectiveScope === option}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  effectiveScope === option
                    ? 'bg-brand-gold text-brand-black border-brand-gold'
                    : 'border-gray-800 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {option === SHOP_SCOPE && <Store size={13} />}
                {scopeLabel(option)}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 mb-6 flex items-center gap-1.5">
            <CalendarOff size={12} /> Você está editando a sua própria agenda (
            {scopeLabel(effectiveScope)}).
          </p>
        )}

        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-6 bg-black p-3 rounded-lg border border-gray-800">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              aria-label="Mês anterior"
              className="text-slate-400 hover:text-white p-1"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-white font-medium capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              aria-label="Próximo mês"
              className="text-slate-400 hover:text-white p-1"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-slate-500 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {emptyDays.map((emptyDay) => (
              <div key={`empty-${emptyDay}`} className="h-12" />
            ))}

            {daysInMonth.map((date) => {
              const cell = describeCell(date);
              const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
              const isSunday = isWeeklyClosedDay(date);
              const isSelected = selectedDate === cell.dateStr;
              // Counted for the scope on screen: how many appointments a closure would affect.
              const bookingsCount = getBookingsForDate(
                cell.dateStr,
                isShopScope ? undefined : effectiveScope
              ).length;
              const isDisabled = isPast || isSunday || cell.isLockedByShop;

              let btnClass =
                'relative h-12 w-full rounded-md flex items-center justify-center text-sm font-medium transition-all border ';

              if (isPast) {
                btnClass += 'text-slate-700 bg-black/50 cursor-not-allowed border-transparent';
              } else if (isSunday) {
                btnClass += 'text-slate-600 bg-black/80 cursor-not-allowed border-transparent';
              } else if (isSelected) {
                btnClass += 'bg-brand-gold text-brand-black border-brand-gold shadow-md';
              } else if (cell.isLockedByShop) {
                // Shut by the shop: shown so it reads as unavailable, but not yours to change.
                btnClass +=
                  'bg-red-500/10 text-red-500/60 border-red-500/20 cursor-not-allowed';
              } else if (cell.isClosed) {
                btnClass +=
                  'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30 cursor-pointer';
              } else if (cell.isSpecial) {
                btnClass +=
                  'bg-brand-gold/10 text-brand-gold border-brand-gold/50 hover:bg-brand-gold/20 cursor-pointer';
              } else {
                btnClass +=
                  'bg-[#2a2a2a] text-white hover:bg-white/10 cursor-pointer border-transparent';
              }

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => !isDisabled && setSelectedDate(cell.dateStr)}
                  disabled={isDisabled}
                  className={btnClass}
                  title={
                    cell.isLockedByShop
                      ? 'Barbearia fechada neste dia'
                      : cell.isSpecial
                        ? formatHoursRange(cell.hours)
                        : undefined
                  }
                >
                  {format(date, 'd')}

                  {bookingsCount > 0 && !isPast && (
                    <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-sky-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-4 mt-6 text-xs text-slate-400 justify-center">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded-sm" />
              {isShopScope ? 'Fechado' : 'Folga'}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 bg-brand-gold/10 border border-brand-gold/50 rounded-sm" />
              Horário reduzido
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" /> Tem agendamento
            </span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 space-y-6">
        {selectedDate ? (
          // Remounting per scope+date keeps the editor's hour inputs in sync with what's selected.
          <DayScheduleEditor
            key={`${effectiveScope}:${selectedDate}`}
            scope={effectiveScope}
            date={selectedDate}
            onClose={() => setSelectedDate(null)}
          />
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 border-dashed p-8 flex flex-col items-center justify-center text-center text-slate-500">
            <MousePointerClick size={32} className="mb-3 opacity-20" />
            <p className="text-sm">Selecione uma data no calendário para ajustar o horário.</p>
          </div>
        )}

        <div className="bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
          <h3 className="text-white font-semibold tracking-tight mb-5 border-b border-gray-800 pb-3">
            Próximas Exceções
          </h3>

          {upcomingExceptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm">
              <CalendarOff size={32} className="mb-3 opacity-20" />
              <p>Nenhuma folga ou horário especial.</p>
            </div>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {upcomingExceptions.map((override) => {
                const date = parseISO(override.date);
                const isSelected =
                  selectedDate === override.date && effectiveScope === override.barberId;
                const editable = canEditScope(override.barberId);
                const isShopWide = override.barberId === SHOP_SCOPE;

                const body = (
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={`p-2 rounded shrink-0 ${
                        override.isClosed
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-brand-gold/10 text-brand-gold'
                      }`}
                    >
                      {override.isClosed ? <AlertCircle size={14} /> : <Clock size={14} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-white font-medium text-sm">
                        {format(date, 'dd/MM/yyyy')}
                        {isSameDay(date, new Date()) && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-brand-gold">
                            hoje
                          </span>
                        )}
                      </span>
                      <span className="block text-slate-500 text-xs truncate">
                        {/* The scope is named on every row: "fechado" means something different
                            for the shop than for one chair. */}
                        <span
                          className={`${isShopWide ? 'text-red-300' : 'text-slate-400'} font-medium`}
                        >
                          {scopeLabel(override.barberId as ScheduleScope)}
                        </span>
                        {' · '}
                        {override.isClosed
                          ? isShopWide
                            ? 'Fechado o dia todo'
                            : 'Folga o dia todo'
                          : formatHoursRange(
                              resolveWorkingHours(baseHoursForDate(shopInfo, date), override)
                            )}
                      </span>
                    </span>
                  </span>
                );

                const frameClass = isSelected
                  ? 'border-brand-gold'
                  : override.isClosed
                    ? 'border-red-900/40'
                    : 'border-brand-gold/20';

                return (
                  <li key={`${override.barberId}:${override.date}`}>
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (isOwner) setScope(override.barberId as ScheduleScope);
                          setSelectedDate(override.date);
                        }}
                        className={`w-full flex justify-between items-center gap-3 bg-black p-3 rounded-lg border text-left transition-colors ${frameClass} ${
                          override.isClosed
                            ? 'hover:border-red-500/50'
                            : 'hover:border-brand-gold/50'
                        }`}
                      >
                        {body}
                      </button>
                    ) : (
                      // An employee can read a shop-wide closure but has nothing to open on it.
                      <div
                        className={`w-full flex justify-between items-center gap-3 bg-black p-3 rounded-lg border text-left opacity-70 ${frameClass}`}
                      >
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
