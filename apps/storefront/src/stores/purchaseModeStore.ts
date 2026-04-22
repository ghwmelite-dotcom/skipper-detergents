import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PurchaseMode = 'single' | 'bulk';

interface PurchaseModeState {
  mode: PurchaseMode;
  setMode: (mode: PurchaseMode) => void;
  toggle: () => void;
}

export const usePurchaseModeStore = create<PurchaseModeState>()(
  persist(
    (set, get) => ({
      mode: 'single',
      setMode: (mode) => set({ mode }),
      toggle: () => set({ mode: get().mode === 'single' ? 'bulk' : 'single' }),
    }),
    {
      name: 'skipper-purchase-mode',
      version: 1,
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
);
