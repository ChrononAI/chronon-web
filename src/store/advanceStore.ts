import { FilterMap } from "@/pages/MyExpensesPage";
import { CurrencyConversionRate } from "@/pages/ProcessPreApprovalPage";
import { ApprovalWorkflow } from "@/types/expense";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface PaginationInfo {
  has_next: boolean;
  has_prev: boolean;
  page: number;
  pages: number;
  per_page: number;
  total: number;
}

export interface AdvanceType {
  id: string;
  title: string;
  currency: string;
  description: string;
  start_date: string; // or Date, if you parse it
  end_date: string; // or Date
  sequence_number: string;
  status: string; // or an enum (see below)
  policy_id: string;
  org_id: string;
  user_id: string;
  is_active: boolean;
  amount: string;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  workflow_info: ApprovalWorkflow;
  created_by: {
    email: string;
    org_id: string;
    user_id: string;
  };
  updated_by: {
    email: string;
    org_id: string;
    user_id: string;
  };
  currency_conversion_rates?: CurrencyConversionRate[];
}

interface AdvanceState {
  selectedAdvance: AdvanceType | null;
  selectedAdvanceToApprove: AdvanceType | null;
  query: FilterMap;
  approvalQuery: FilterMap;

  // Methods
  setSelectedAdvance: (data: AdvanceType | null) => void;
  setSelectedAdvanceToApprove: (data: AdvanceType | null) => void;
  setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;
  setApprovalQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;
}

export const useAdvanceStore = create<AdvanceState>()(
  devtools(
    persist(
      (set) => ({
        selectedAdvanceToApprove: null,
        selectedAdvance: null,
        query: {},
        approvalQuery: {},

        setSelectedAdvance: (data) =>
          set({ selectedAdvance: data }, false, "advance/setSelectedAdvance"),

        setSelectedAdvanceToApprove: (data) =>
          set(
            { selectedAdvanceToApprove: data },
            false,
            "advance/setAdvanceToApprove"
          ),
        setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) =>
          set(
            (state) => ({
              query: typeof data === "function" ? data(state.query) : data,
            }),
            false,
            "advances/setQuery"
          ),
        setApprovalQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) =>
          set(
            (state) => ({
              approvalQuery: typeof data === "function" ? data(state.approvalQuery) : data,
            }),
            false,
            "advances/approval/setQuery"
          ),
      }),
      {
        name: "advance-storage",
      }
    ),
    {
      name: "AdvanceStore",
    }
  )
);
