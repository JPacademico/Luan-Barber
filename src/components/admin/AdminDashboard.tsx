import React, { useState } from 'react';
import { BarChart3, CalendarCheck, CalendarOff, Edit3, Tag } from 'lucide-react';
import { AnalyticsPanel } from './AnalyticsPanel';
import { AppointmentsPanel } from './AppointmentsPanel';
import { ContentEditor } from './ContentEditor';
import { CalendarManager } from './CalendarManager';
import { ServicesEditor } from './ServicesEditor';

type TabId = 'appointments' | 'services' | 'analytics' | 'content' | 'calendar';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  render: () => React.ReactNode;
}

const TABS: Tab[] = [
  {
    id: 'appointments',
    label: 'Agendamentos',
    icon: <CalendarCheck size={18} />,
    render: () => <AppointmentsPanel />,
  },
  {
    id: 'services',
    label: 'Serviços & Preços',
    icon: <Tag size={18} />,
    render: () => <ServicesEditor />,
  },
  { id: 'analytics', label: 'Visão Geral', icon: <BarChart3 size={18} />, render: () => <AnalyticsPanel /> },
  { id: 'content', label: 'Conteúdo', icon: <Edit3 size={18} />, render: () => <ContentEditor /> },
  {
    id: 'calendar',
    label: 'Calendário (Folgas)',
    icon: <CalendarOff size={18} />,
    render: () => <CalendarManager />,
  },
];

export const AdminDashboard: React.FC = () => {
  // The day's operational list is what the barber opens the panel for; analytics can wait.
  const [activeTabId, setActiveTabId] = useState<TabId>('appointments');

  const activeTab = TABS.find((tab) => tab.id === activeTabId) ?? TABS[0];

  return (
    <div className="flex flex-col h-full space-y-6">
      <nav className="bg-[#1a1a1a] p-2 rounded-xl border border-gray-800 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTabId(tab.id)}
            aria-current={activeTabId === tab.id ? 'page' : undefined}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 min-w-[150px] justify-center sm:flex-none sm:justify-start ${
              activeTabId === tab.id
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
