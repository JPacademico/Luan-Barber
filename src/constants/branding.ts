/**
 * Tab + install identity for the two faces of the app: the stylised storefront and the utilitarian
 * back office. Each ships its own favicon AND its own PWA manifest, so an admin can install the
 * panel to a home screen separately from the public site and tell them apart at a glance.
 */
export const PUBLIC_BRANDING = {
  title: 'Luan Studio Barber | Experiência, Estilo e Atendimento',
  favicon: '/logo.svg',
  manifest: '/manifest.webmanifest',
} as const;

export const ADMIN_BRANDING = {
  title: 'Painel Administrativo · Luan Studio',
  favicon: '/favicon-admin.svg',
  manifest: '/manifest-admin.webmanifest',
} as const;
