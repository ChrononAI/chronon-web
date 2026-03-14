import { FilterMap } from "@/pages/MyExpensesPage";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface FundingAccountState {
  query: FilterMap;

  setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;
}

export const useFundingAccountStore = create<FundingAccountState>()(
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
            "fundingAccount/setQuery"
          ),
      }),
      {
        name: "funding-account-storage",
      }
    ),
    {
      name: "FundingAccountStore",
    }
  )
);