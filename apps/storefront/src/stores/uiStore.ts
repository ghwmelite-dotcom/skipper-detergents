import { create } from 'zustand';

interface UiStoreState {
  mobileNavOpen: boolean;
  cartDrawerOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

export const useUiStore = create<UiStoreState>()((set) => ({
  mobileNavOpen: false,
  cartDrawerOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  openCartDrawer: () => set({ cartDrawerOpen: true }),
  closeCartDrawer: () => set({ cartDrawerOpen: false }),
}));
