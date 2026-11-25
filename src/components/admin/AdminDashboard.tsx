import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarCheck, CalendarOff, Edit3, QrCode, Tag, User } from 'lucide-react';
import { AnalyticsPanel } from './AnalyticsPanel';
import { AppointmentsPanel } from './AppointmentsPanel';
import { ContentEditor } from './ContentEditor';
import { CalendarManager } from './CalendarManager';
import { ServicesEditor } from './ServicesEditor';
import { ShareQrPanel } from './ShareQrPanel';
import { useAdminSession } from './adminSessionContext';
import { barberName } from '../../constants/barbers';

type TabId = 'appointments' | 'services' | 'analytics' | 'content' | 'calendar' | 'share';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  /**
   * False for the panels an employee has no business in: prices (the amount Pix charges), the
   * public site's content, and the QR/divulgação material. Those are the shop's, not a chair's.
   */
  ownerOnly: boolean;
  render: () => React.ReactNode;
}

const TABS: Tab[] = [
  {
    id: 'appointments',
    label: 'Agendamentos',
    icon: <CalendarCheck size={18} />,
    ownerOnly: false,
    render: () => <AppointmentsPanel />,
  },
  {
    id: 'services',
    label: 'Serviços & Preços',
    icon: <Tag size={18} />,
    ownerOnly: true,
    render: () => <ServicesEditor />,
  },
  {
    id: 'analytics',
    label: 'Visão Geral',
    icon: <BarChart3 size={18} />,
    ownerOnly: false,
    render: () => <AnalyticsPanel />,
  },
  {
    id: 'content',
    label: 'Conteúdo',
    icon: <Edit3 size={18} />,
    ownerOnly: true,
    render: () => <ContentEditor />,
  },
  {
    id: 'calendar',
    label: 'Calendário (Folgas)',
    icon: <CalendarOff size={18} />,
    ownerOnly: false,
    render: () => <CalendarManager />,
  },
  {
    id: 'share',
    label: 'Divulgação',
    icon: <QrCode size={18} />,
    ownerOnly: true,
    render: () => <ShareQrPanel />,
  },
];

export const AdminDashboard: React.FC = () => {
  const { isOwner, barberId } = useAdminSession();

  /**
   * An employee's tabs are filtered out of the list rather than disabled: a greyed-out "Serviços
   * & Preços" would invite them to try, and the panel behind it would fail server-side anyway.
   */
  const tabs = useMemo(() => TABS.filter((tab) => isOwner || !tab.ownerOnly), [isOwner]);

  // The day's operational list is what the barber opens the panel for; analytics can wait.
  const [activeTabId, setActiveTabId] = useState<TabId>('appointments');

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  return (
    <div className="flex flex-col h-full space-y-6">
      {/*
        Who is logged in, stated plainly. The two logins see different data under identical
        headings, so leaving it implicit is how an employee ends up believing the shop had three
        bookings today when it had eight.
      */}
      <div className="flex items-center gap-2.5 text-sm">
        <span className="p-1.5 rounded-lg bg-brand-gold/10 text-brand-gold">
          <User size={15} />
        </span>
        <span className="text-slate-300">
          <strong className="text-white font-semibold">{barberName(barberId)}</strong>
          <span className="text-slate-500">
            {' '}
            · {isOwner ? 'proprietário — vê todas as agendas' : 'vê somente a sua agenda'}
          </span>
        </span>
      </div>

      <nav className="bg-[#1a1a1a] p-2 rounded-xl border border-gray-800 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTabId(tab.id)}
            aria-current={activeTab.id === tab.id ? 'page' : undefined}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 min-w-[150px] justify-center sm:flex-none sm:justify-start ${
              activeTab.id === tab.id
                ? 'bg-brand-gold text-brand-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="flex-grow">{activeTab.render()}</div>
    </div>
  );
};
