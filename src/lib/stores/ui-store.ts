import { create } from "zustand";

interface UIStore {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
}));
