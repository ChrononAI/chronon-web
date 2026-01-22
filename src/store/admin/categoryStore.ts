import { FilterMap } from "@/pages/MyExpensesPage";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface ExpenseState {
  query: FilterMap;

  // Methods
  setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;
}

export const useCaetgoryStore = create<ExpenseState>()(
  devtools(
    persist(
      (set) => ({
        query: {},

        setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) =>
          set(
            (state) => ({
              query: typeof data === "function" ? data(state.query) : data,
            }),
            false,
            "category/setQuery"
          )
      }),
      {
        name: "category-storage",
      }
    ),
    {
      name: "CategoryStore",
    }
  )
);
