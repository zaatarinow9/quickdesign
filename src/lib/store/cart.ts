import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LegacyConfigurationSelectedOption,
  LegacyConfigurationTextInputs,
  ServiceConfigurationSnapshot,
} from "@/lib/services/configuration/snapshot";

export type CartOption = LegacyConfigurationSelectedOption;

export type LogoDesign = {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FullDesignData = {
  model: 'tee' | 'tank' | 'hoodie' | 'pullover' | 'longsleeve' | 'jacket';
  color: string;
  frontLogos: LogoDesign[];
  backLogos: LogoDesign[];
};

export type CartItem = {
  cartItemId: string; 
  serviceId: string;
  name: string;
  image: string;
  basePrice: number;
  quantity: number;
  selectedOptions: Record<string, CartOption>;
  textInputs: LegacyConfigurationTextInputs;
  totalPrice: number;
  designData?: FullDesignData;
  configurationSnapshot?: ServiceConfigurationSnapshot;
  orderNotes?: string; 
};

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.cartItemId !== id) })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((i) => 
          i.cartItemId === id
            ? (() => {
                const nextTotalPrice = (i.totalPrice / (i.quantity || 1)) * quantity;

                return {
                  ...i,
                  quantity,
                  totalPrice: nextTotalPrice,
                  configurationSnapshot: i.configurationSnapshot
                    ? {
                        ...i.configurationSnapshot,
                        quantity,
                        calculatedPrice: {
                          ...i.configurationSnapshot.calculatedPrice,
                          quantity,
                          total: nextTotalPrice,
                        },
                      }
                    : undefined,
                };
              })()
            : i
        )
      })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'print-studio-cart' }
  )
);
