import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { AdminToaster } from '../ui/BrandToaster';
import { AdminInstallButton } from '../pwa/AdminInstallButton';
import { PushToggle } from '../admin/PushToggle';
import { SyncStatusBadge } from '../admin/SyncStatusBadge';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { ADMIN_BRANDING } from '../../constants/branding';

export const AdminLayout: React.FC = () => {
  useDocumentMeta(ADMIN_BRANDING);

  // The panel's dark-only look is forced by route in useApplyTheme, which leaves the
  // visitor's own light/dark preference for the public site intact.

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    window.location.reload();
  };

  return (
    // font-admin cascades to every panel: the back office uses the corporate sans throughout.
    <div className="min-h-screen bg-brand-black text-slate-200 font-admin antialiased flex flex-col">
      <AdminToaster />

      <header className="bg-brand-gray border-b border-gray-800 py-4 px-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="text-slate-400 hover:text-brand-gold transition-colors flex items-center space-x-2"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium hidden sm:inline">Voltar ao Site</span>
          </Link>

          <div className="h-6 w-px bg-gray-700 mx-2 hidden sm:block" />

          <div className="flex flex-col">
            <span className="font-semibold text-base leading-tight tracking-tight text-white">
              Painel Administrativo
            </span>
            <span className="text-xs text-slate-500 tracking-wide">Luan Studio Barber</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SyncStatusBadge />
          <PushToggle />
          <AdminInstallButton />

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center space-x-2 text-sm font-medium text-slate-400 hover:text-red-400 transition-colors"
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
