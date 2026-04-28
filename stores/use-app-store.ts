import { create } from "zustand";

type Tenant = {
  id: string;
  name: string;
  currency: string;
  taxRate: number;
};

interface AppState {
  sidebarOpen: boolean;
  currentTenant: Tenant | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentTenant: (tenant: Tenant | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  sidebarOpen: false,
  currentTenant: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
}));
