/**
 * Tab identity for the two faces of the app: the stylised storefront and the utilitarian
 * back office. Keeping them visually distinct means an admin with both tabs open can tell
 * them apart at a glance.
 */
export const PUBLIC_BRANDING = {
  title: 'Luan Studio Barber | Experiência, Estilo e Atendimento',
  favicon: '/favicon.svg',
} as const;

export const ADMIN_BRANDING = {
  title: 'Painel Administrativo · Luan Studio',
  favicon: '/favicon-admin.svg',
} as const;
