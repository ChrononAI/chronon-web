import { FilterMap } from "@/pages/MyExpensesPage";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface PaginationInfo {
  has_next?: boolean;
  has_prev?: boolean;
  page?: number;
  pages?: number;
  per_page?: number;
  total: number;
}

interface SettlementState {
  query: FilterMap;

  setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;
}

export const useSettlementStore = create<SettlementState>()(
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
            "settlement/setQuery"
          ),
      }),
      {
        name: "settlement-storage",
      }
    ),
    {
      name: "SettlementStore",
    }
  )
);
