import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Service, DailySpecial, OwnerProfile, ShopInfo, CarouselImage } from '../types';
import { DEFAULT_OWNER, DEFAULT_SERVICES, DEFAULT_SPECIALS, DEFAULT_SHOP_INFO, DEFAULT_CAROUSEL } from '../constants/defaults';

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
    }),
    {
      name: SHOP_STORAGE_KEY,
      version: 3,
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

        return {
          ...state,
          shopInfo,
          // v3 added the client counter; without a backfill the About section renders "undefined+".
          owner: {
            ...DEFAULT_OWNER,
            ...state.owner,
            clientsServed: state.owner?.clientsServed ?? DEFAULT_OWNER.clientsServed,
          },
        } as ShopState;
      },
    }
  )
);
