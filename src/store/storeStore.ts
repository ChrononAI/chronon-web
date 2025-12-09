import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface StoreState {
  selectedStore: any | null;
  selectedStoreToApprove: any | null;

  // Methods
  setSelectedStore: (data: any | null) => void;
  setSelectedStoreToApprove: (data: any | null) => void;
}

export const useStoreStore = create<StoreState>()(
  devtools(
    persist(
      (set) => ({
        selectedStoreToApprove: null,
        selectedStore: null,

        setSelectedStore: (data) =>
          set({ selectedStore: data }, false, "store/setStoreToApprove"),

        setSelectedStoreToApprove: (data) =>
          set(
            { selectedStoreToApprove: data },
            false,
            "store/setStoreToApprove"
          ),
      }),
      {
        name: "store-storage",
      }
    ),
    {
      name: "StoreStore",
    }
  )
);
