import type { Service, DailySpecial, OwnerProfile, ShopInfo, CarouselImage } from '../types';

/**
 * Admin gate password.
 *
 * IMPORTANT — this is not security, and cannot be. The check runs in the browser, so whatever
 * value ends up here is readable by anyone who opens devtools or greps the JS bundle. Reading it
 * from an env var only keeps it out of the git repo; it is still shipped to every visitor.
 *
 * That is acceptable for a demo whose data is per-device localStorage anyway. Do not reuse a
 * password from anywhere else, and treat /admin as public until a real backend authenticates it.
 */
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'Luan@2015';

/**
 * Canonical, geocodable address used to build the map embed.
 * Kept separate from the display address, which carries the extra suite/mall detail
 * that Google cannot resolve.
 */
export const SHOP_MAP_QUERY = 'Av. Murilo Dantas, 881 - Farolândia, Aracaju - SE, Brazil';

/**
 * Google Maps' `output=embed` endpoint renders a plain place query with no API key and no
 * "for development purposes only" watermark, unlike the /maps/embed/v1 API.
 */
export const buildMapEmbedUrl = (query: string): string =>
  `https://www.google.com/maps?q=${encodeURIComponent(query)}&hl=pt-BR&z=17&output=embed`;

export const DEFAULT_SERVICES: Service[] = [
  { id: '1', name: 'Corte Premium', price: 45, duration: 30, description: 'Corte com acabamento impecável e finalização profissional.' },
  { id: '2', name: 'Barba Alinhada', price: 30, duration: 30, description: 'Modelagem de barba com toalha quente e hidratação.' },
  { id: '3', name: 'Sobrancelha', price: 20, duration: 30, description: 'Design e alinhamento de sobrancelha.' },
  { id: '4', name: 'Combo Corte + Barba', price: 65, duration: 60, description: 'O clássico completo para renovar o visual.' },
  { id: '5', name: 'Combo Completo', price: 80, duration: 90, description: 'Corte, Barba e Sobrancelha. Visual completo, você melhor!' },
];

export const DEFAULT_SPECIALS: DailySpecial[] = [
  { id: 'seg', dayOfWeek: 1, abbreviation: 'SEG', fullDay: 'Segunda-feira', title: 'Foco na Semana!', description: 'Corte + Barba com acabamento premium. Comece a semana no estilo!' },
  { id: 'ter', dayOfWeek: 2, abbreviation: 'TER', fullDay: 'Terça-feira', title: 'Traga um Amigo!', description: 'Você e seu amigo ganham 10% de desconto em qualquer serviço.' },
  { id: 'qua', dayOfWeek: 3, abbreviation: 'QUA', fullDay: 'Quarta-feira', title: 'Dia da Barba!', description: 'Modelagem de barba com hidratação e toalha quente. Barba alinhada, confiança elevada!' },
  { id: 'qui', dayOfWeek: 4, abbreviation: 'QUI', fullDay: 'Quinta-feira', title: 'Estilo em Dobro!', description: 'Corte + Barba + Sobrancelha com preço especial. Visual completo, você melhor!' },
  { id: 'sex', dayOfWeek: 5, abbreviation: 'SEX', fullDay: 'Sexta-feira', title: 'Pronto para o Fim de Semana!', description: 'Corte + Barba com finalização e styling.' },
  { id: 'sab', dayOfWeek: 6, abbreviation: 'SÁB', fullDay: 'Sábado', title: 'Dia de Manter o Estilo!', description: 'Qualquer serviço ganha um upgrade de finalização. Saia daqui no padrão Luan!' },
];

export const DEFAULT_OWNER: OwnerProfile = {
  name: 'Luan',
  title: 'Fundador & Master Barber',
  bio: 'Especialista em visagismo e cortes clássicos/modernos, com experiência e paixão pela barbearia desde 2015. Nosso objetivo é proporcionar uma experiência única, elevando a autoestima e confiança de cada cliente.',
  since: 2015,
  clientsServed: 190,
  imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&auto=format&fit=crop', // Placeholder barber image
  certificates: [
    { id: 'c1', title: 'Visagismo Básico', year: 2016, imageUrl: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?q=80&w=400&auto=format&fit=crop' },
    { id: 'c2', title: 'Master Class Cortes Fades', year: 2018, imageUrl: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?q=80&w=400&auto=format&fit=crop' },
    { id: 'c3', title: 'Colorimetria Avançada', year: 2020, imageUrl: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?q=80&w=400&auto=format&fit=crop' },
    { id: 'c4', title: 'Gestão de Barbearia', year: 2022, imageUrl: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?q=80&w=400&auto=format&fit=crop' },
  ],
};

export const DEFAULT_SHOP_INFO: ShopInfo = {
  address: 'Av. Murilo Dantas, 881 – Sala 05 – Farol Center, Farolândia, Aracaju – SE',
  phone: '(79) 9 8817-6953',
  whatsapp: '5579988176953', // Formatted for wa.me links
  instagram: 'https://www.instagram.com/luanbarberstudio?igsh=YjY3czhiaG1zeXFx&utm_source=qr',
  instagramHandle: '@luanbarberstudio',
  mapEmbedUrl: buildMapEmbedUrl(SHOP_MAP_QUERY),
  // Placeholder key for the simulated Pix checkout. No gateway is wired up.
  pixKey: '5579988176953',
  workingHours: {
    start: 9, // 09:00
    end: 18, // 18:00
  },
};

export const DEFAULT_CAROUSEL: CarouselImage[] = [
  { id: '1', url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1920&auto=format&fit=crop', alt: 'Barbearia Ambiente', order: 1 },
  { id: '2', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1920&auto=format&fit=crop', alt: 'Corte de Cabelo Premium', order: 2 },
  { id: '3', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1920&auto=format&fit=crop', alt: 'Barba Alinhada', order: 3 },
];
