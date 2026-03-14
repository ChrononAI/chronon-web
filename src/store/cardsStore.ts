import { FilterMap } from "@/pages/MyExpensesPage";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface SettlementState {
  query: FilterMap;

  setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;
}

export const useCardsStore = create<SettlementState>()(
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
            "cards/setQuery"
          ),
      }),
      {
        name: "cards-storage",
      }
    ),
    {
      name: "CardsStore",
    }
  )
);