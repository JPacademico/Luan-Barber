import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Service, DailySpecial, OwnerProfile, ShopInfo, CarouselImage } from '../types';
import { DEFAULT_OWNER, DEFAULT_SERVICES, DEFAULT_SPECIALS, DEFAULT_SHOP_INFO, DEFAULT_CAROUSEL } from '../constants/defaults';
import { IS_CLOUD_ENABLED } from '../lib/env';
import { supabaseApi } from '../lib/supabaseClient';

/** Exported so the cross-tab sync hook can recognise this store's `storage` events. */
export const SHOP_STORAGE_KEY = 'luan-studio-shop';

interface ShopState {
  owner: OwnerProfile;
  services: Service[];
  specials: DailySpecial[];
  shopInfo: ShopInfo;
  carouselImages: CarouselImage[];
  
  updateOwner: (data: Partial<OwnerProfile>) => void;
  updateOwnerCertificate: (index: number, data: Partial<OwnerProfile['certificates'][0]>) => void;
  updateService: (id: string, data: Partial<Service>) => void;
  updateShopInfo: (data: Partial<ShopInfo>) => void;
  updateCarouselImage: (index: number, data: Partial<CarouselImage>) => void;
  resetToDefaults: () => void;
  /** Replaces the local catalogue with the database's, when cloud sync is configured. */
  syncServicesFromCloud: () => Promise<void>;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      owner: DEFAULT_OWNER,
      services: DEFAULT_SERVICES,
      specials: DEFAULT_SPECIALS,
      shopInfo: DEFAULT_SHOP_INFO,
      carouselImages: DEFAULT_CAROUSEL,

      updateOwner: (data) =>
        set((state) => ({ owner: { ...state.owner, ...data } })),
        
      updateOwnerCertificate: (index, data) =>
        set((state) => {
          const newCertificates = [...state.owner.certificates];
          newCertificates[index] = { ...newCertificates[index], ...data };
          return { owner: { ...state.owner, certificates: newCertificates } };
        }),

      updateService: (id, data) =>
        set((state) => ({
          services: state.services.map((s) => (s.id === id ? { ...s, ...data } : s)),
        })),

      updateShopInfo: (data) =>
        set((state) => ({ shopInfo: { ...state.shopInfo, ...data } })),
        
      updateCarouselImage: (index, data) =>
        set((state) => {
          const newImages = [...state.carouselImages];
          newImages[index] = { ...newImages[index], ...data };
          return { carouselImages: newImages };
        }),

      resetToDefaults: () =>
        set({
          owner: DEFAULT_OWNER,
          services: DEFAULT_SERVICES,
          specials: DEFAULT_SPECIALS,
          shopInfo: DEFAULT_SHOP_INFO,
          carouselImages: DEFAULT_CAROUSEL,
        }),

      /**
       * The database is the source of truth for prices — it is what Pix charges from, and it is
       * shared, unlike this store's per-device localStorage. Without this, a price Luan edits on
       * his phone stays on his phone while every other visitor keeps seeing the old one.
       *
       * Failure is deliberately silent: the persisted catalogue stays on screen so the site still
       * works offline or before the backend is configured.
       */
      syncServicesFromCloud: async () => {
        if (!IS_CLOUD_ENABLED) return;

        try {
          const services = await supabaseApi.fetchServices();
          if (services.length > 0) set({ services });
        } catch (error) {
          console.error('[shop] failed to load services from cloud', error);
        }
      },
    }),
    {
      name: SHOP_STORAGE_KEY,
      version: 5,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<ShopState>;

        /**
         * v1 persisted an OpenStreetMap embed, an outdated Instagram URL and no Pix key.
         * Those are corrections rather than preferences, so they are reset to the current
         * defaults while any admin-edited copy (address, phone, hours) is preserved.
         */
        const shopInfo =
          version >= 2
            ? { ...DEFAULT_SHOP_INFO, ...state.shopInfo }
            : {
                ...DEFAULT_SHOP_INFO,
                ...state.shopInfo,
                instagram: DEFAULT_SHOP_INFO.instagram,
                instagramHandle: DEFAULT_SHOP_INFO.instagramHandle,
                mapEmbedUrl: DEFAULT_SHOP_INFO.mapEmbedUrl,
                pixKey: state.shopInfo?.pixKey ?? DEFAULT_SHOP_INFO.pixKey,
              };

        /**
         * v5 swapped the first slide from an Unsplash stock shot to the real shop photo. Only a
         * slide still holding that exact placeholder is replaced — an admin who uploaded their own
         * image keeps it, unlike the blunt v4 portrait reset.
         */
        const carouselImages = (state.carouselImages ?? DEFAULT_CAROUSEL).map((image) => {
          const replacement = DEFAULT_CAROUSEL.find((d) => d.id === image.id);
          const isStalePlaceholder = image.url.includes('photo-1585747860715-2ba37e788b70');
          return replacement && isStalePlaceholder ? { ...image, ...replacement } : image;
        });

        return {
          ...state,
          shopInfo,
          carouselImages,
          // v3 added the client counter; without a backfill the About section renders "undefined+".
          // v4 replaced the Unsplash placeholder portrait with the real /owner.jpg — a persisted
          // old URL would keep showing the stranger, so the portrait resets to the default.
          owner: {
            ...DEFAULT_OWNER,
            ...state.owner,
            clientsServed: state.owner?.clientsServed ?? DEFAULT_OWNER.clientsServed,
            imageUrl: version >= 4 ? state.owner?.imageUrl ?? DEFAULT_OWNER.imageUrl : DEFAULT_OWNER.imageUrl,
          },
        } as ShopState;
      },
    }
  )
);
