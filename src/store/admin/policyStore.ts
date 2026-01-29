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
// const [query, setQuery] = useState<Record<string, FieldFilter[]>>({});

interface PolicyState {
  query: FilterMap;

  // Methods
  setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;
}

export const usePolicyStore = create<PolicyState>()(
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
            "expense/setQuery"
          ),
      }),
      {
        name: "policy-storage",
      }
    ),
    {
      name: "PolicyStore",
    }
  )
);
