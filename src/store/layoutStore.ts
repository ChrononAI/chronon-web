import { create } from "zustand";

type LayoutState = {
  noPadding: boolean;
  setNoPadding: (value: boolean) => void;
};

export const useLayoutStore = create<LayoutState>((set) => ({
  noPadding: false,
  setNoPadding: (value) => set({ noPadding: value }),
}));
