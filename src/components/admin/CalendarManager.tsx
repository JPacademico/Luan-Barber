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
import { ChevronLeft, ChevronRight, AlertCircle, CalendarOff, Clock, MousePointerClick } from 'lucide-react';
import { useBookingStore } from '../../store/bookingStore';
import { useShopStore } from '../../store/shopStore';
import { DayScheduleEditor } from './DayScheduleEditor';
import {
  formatHoursRange,
  hasCustomHours,
  isWeeklyClosedDay,
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

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const emptyDays = Array.from({ length: startOfMonth(currentMonth).getDay() }, (_, i) => i);

  // Only upcoming exceptions are actionable; past ones are noise.
  const upcomingExceptions = useMemo(() => {
    const today = startOfDay(new Date());

    return Object.values(dayOverrides)
      .filter((override) => !isBefore(parseISO(override.date), today))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dayOverrides]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 bg-[#1a1a1a] p-6 rounded-xl border border-gray-800">
        <header className="mb-6">
          <h3 className="text-white font-semibold text-lg tracking-tight">Gestão de Agenda</h3>
          <p className="text-slate-400 text-sm mt-1">
            Clique em uma data para fechá-la ou definir um horário reduzido.
          </p>
        </header>

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
              const dateStr = toDateKey(date);
              const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
              const isSunday = isWeeklyClosedDay(date);
              const override = dayOverrides[dateStr];
              const isClosed = override?.isClosed ?? false;
              const isSpecial = hasCustomHours(shopInfo.workingHours, override);
              const isSelected = selectedDate === dateStr;
              const bookingsCount = getBookingsForDate(dateStr).length;
              const isDisabled = isPast || isSunday;

              let btnClass =
                'relative h-12 w-full rounded-md flex items-center justify-center text-sm font-medium transition-all border ';

              if (isPast) {
                btnClass += 'text-slate-700 bg-black/50 cursor-not-allowed border-transparent';
              } else if (isSunday) {
                btnClass += 'text-slate-600 bg-black/80 cursor-not-allowed border-transparent';
              } else if (isSelected) {
                btnClass += 'bg-brand-gold text-brand-black border-brand-gold shadow-md';
              } else if (isClosed) {
                btnClass +=
                  'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30 cursor-pointer';
              } else if (isSpecial) {
                btnClass +=
                  'bg-brand-gold/10 text-brand-gold border-brand-gold/50 hover:bg-brand-gold/20 cursor-pointer';
              } else {
                btnClass +=
                  'bg-[#2a2a2a] text-white hover:bg-white/10 cursor-pointer border-transparent';
              }

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => !isDisabled && setSelectedDate(dateStr)}
                  disabled={isDisabled}
                  className={btnClass}
                  title={
                    isSpecial
                      ? formatHoursRange(resolveWorkingHours(shopInfo.workingHours, override))
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
              <span className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded-sm" /> Fechado
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
          // Remounting per date keeps the editor's hour inputs in sync with the day being edited.
          <DayScheduleEditor
            key={selectedDate}
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
                const isSelected = selectedDate === override.date;

                return (
                  <li key={override.date}>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(override.date)}
                      className={`w-full flex justify-between items-center gap-3 bg-black p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-brand-gold'
                          : override.isClosed
                            ? 'border-red-900/40 hover:border-red-500/50'
                            : 'border-brand-gold/20 hover:border-brand-gold/50'
                      }`}
                    >
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
                            {override.isClosed
                              ? 'Fechado o dia todo'
                              : formatHoursRange(resolveWorkingHours(shopInfo.workingHours, override))}
                          </span>
                        </span>
                      </span>
                    </button>
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
