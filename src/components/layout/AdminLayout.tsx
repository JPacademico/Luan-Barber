import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { AdminToaster } from '../ui/BrandToaster';
import { AdminInstallButton } from '../pwa/AdminInstallButton';
import { PushToggle } from '../admin/PushToggle';
import { SyncStatusBadge } from '../admin/SyncStatusBadge';
import { forgetAdminPassword } from '../../lib/adminApi';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { ADMIN_BRANDING } from '../../constants/branding';

export const AdminLayout: React.FC = () => {
  useDocumentMeta(ADMIN_BRANDING);

  // The panel's dark-only look is forced by route in useApplyTheme, which leaves the
  // visitor's own light/dark preference for the public site intact.

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    // The password is held for the session so price saves can re-authenticate; drop it too.
    forgetAdminPassword();
    window.location.reload();
  };

  return (
    // font-admin cascades to every panel: the back office uses the corporate sans throughout.
    <div className="min-h-screen bg-brand-black text-slate-200 font-admin antialiased flex flex-col">
      <AdminToaster />

      {/*
        Two clusters that must not collide on a phone: the identity block (shrinkable, truncating)
        and the action cluster (fixed-size icons, never shrinks). On mobile every action collapses
        to an icon and the title drops to one line, so nothing overlaps at 360px.
      */}
      <header className="bg-brand-gray border-b border-gray-800 py-3 sm:py-4 px-4 sm:px-6 flex justify-between items-center gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/"
            aria-label="Voltar ao site"
            className="text-slate-400 hover:text-brand-gold transition-colors flex shrink-0 items-center gap-2"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium hidden lg:inline">Voltar ao Site</span>
          </Link>

          <div className="h-6 w-px bg-gray-700 hidden lg:block" />

          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm sm:text-base leading-tight tracking-tight text-white truncate">
              Painel Administrativo
            </span>
            {/* The shop name is redundant on a phone once space is tight. */}
            <span className="text-xs text-slate-500 tracking-wide hidden sm:block">
              Luan Studio Barber
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <SyncStatusBadge />
          <PushToggle />
          <AdminInstallButton />

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sair"
            className="flex shrink-0 items-center gap-2 p-2 sm:p-0 text-sm font-medium text-slate-400 hover:text-red-400 transition-colors"
          >
            <span className="hidden sm:inline">Sair</span>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};
