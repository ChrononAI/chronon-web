import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface CategoryLimitState {
  selectedLimit: any | null;

  // Methods
  setSelectedLimit: (data: any | null) => void;
}

export const useCategoryLimitStore = create<CategoryLimitState>()(
  devtools(
    persist(
      (set) => ({
        selectedLimit: null,
        setSelectedLimit: (data) =>
          set(
            { selectedLimit: data },
            false,
            "category-limit/setSelectedLimit"
          ),
      }),
      {
        name: "category-limit-storage",
      }
    ),
    {
      name: "CategoryLimitStore",
    }
  )
);
