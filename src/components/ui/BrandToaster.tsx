import React from 'react';
import { Toaster, type ToasterProps } from 'sonner';

/**
 * Toast styling for both surfaces.
 *
 * Sonner's `richColors` preset ignores the design system, so toasts read as third-party UI.
 * Both toasters run `unstyled` and rebuild the visuals from the same tokens as the rest of the
 * app: the storefront gets the serif/gold treatment, the admin panel the corporate sans.
 */

const BASE_TOAST =
  'group relative flex items-start gap-3 w-full p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all';

/** Left accent bar keyed to the toast's severity, applied via a pseudo-element. */
const ACCENT_BAR =
  'before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:rounded-full';

const publicToastOptions: ToasterProps['toastOptions'] = {
  unstyled: true,
  classNames: {
    toast: `${BASE_TOAST} ${ACCENT_BAR} font-body bg-white/95 dark:bg-brand-gray/95 border-gray-200 dark:border-gray-800 before:bg-brand-gold`,
    title: 'text-sm font-bold text-brand-black dark:text-white leading-snug',
    description: 'text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed',
    icon: 'shrink-0 mt-0.5 text-brand-gold',
    success: 'before:bg-brand-gold [&_[data-icon]>svg]:text-brand-gold',
    error: 'before:bg-red-500 [&_[data-icon]>svg]:text-red-500',
    warning: 'before:bg-amber-500 [&_[data-icon]>svg]:text-amber-500',
    info: 'before:bg-sky-500 [&_[data-icon]>svg]:text-sky-500',
    actionButton:
      'shrink-0 px-3 py-1.5 rounded-md bg-brand-gold text-brand-black text-xs font-bold hover:bg-brand-gold/90 transition-colors',
    cancelButton:
      'shrink-0 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
    closeButton:
      'absolute right-2 top-2 p-1 rounded-md text-gray-400 hover:text-brand-black dark:hover:text-white transition-colors',
  },
};

const adminToastOptions: ToasterProps['toastOptions'] = {
  unstyled: true,
  classNames: {
    toast: `${BASE_TOAST} ${ACCENT_BAR} font-admin bg-[#1a1a1a] border-gray-800 before:bg-brand-gold`,
    title: 'text-sm font-semibold text-white tracking-tight leading-snug',
    description: 'text-xs text-slate-400 mt-1 leading-relaxed',
    icon: 'shrink-0 mt-0.5',
    success: 'before:bg-emerald-500 [&_[data-icon]>svg]:text-emerald-400',
    error: 'before:bg-red-500 [&_[data-icon]>svg]:text-red-400',
    warning: 'before:bg-amber-500 [&_[data-icon]>svg]:text-amber-400',
    info: 'before:bg-sky-500 [&_[data-icon]>svg]:text-sky-400',
    actionButton:
      'shrink-0 px-3 py-1.5 rounded-lg bg-brand-gold text-brand-black text-xs font-semibold hover:bg-brand-gold/90 transition-colors',
    cancelButton:
      'shrink-0 px-3 py-1.5 rounded-lg border border-gray-700 text-slate-300 text-xs font-medium hover:bg-white/5 transition-colors',
    closeButton:
      'absolute right-2 top-2 p-1 rounded-md text-slate-500 hover:text-white transition-colors',
  },
};

export const PublicToaster: React.FC = () => (
  <Toaster
    position="top-center"
    offset={96} // clears the fixed header
    gap={10}
    toastOptions={publicToastOptions}
  />
);

export const AdminToaster: React.FC = () => (
  <Toaster position="top-right" gap={10} toastOptions={adminToastOptions} />
);
