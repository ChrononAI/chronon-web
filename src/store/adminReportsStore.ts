import { FilterMap } from "@/pages/MyExpensesPage";
import { NewPaginationMeta, Report } from "@/types/expense";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AdminReportsState {
  pendingReports: Report[];
  pendingReportsPagination: NewPaginationMeta;
  query: FilterMap;

  processedReports: Report[];
  processedReportsPagination: NewPaginationMeta;

  // Methods

  setPendingReports: (data: Report[]) => void;
  setPendingReportsPagination: (pagination: NewPaginationMeta) => void;
  setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;

  setProcessedReports: (data: Report[]) => void;
  setProcessedReportsPagination: (pagination: NewPaginationMeta) => void;
}

export const useAdminReportsStore = create<AdminReportsState>()(
  devtools(
    persist(
      (set) => ({
        query: {},
        pendingReports: [],
        pendingReportsPagination: {
          count: 0,
          offset: 0,
        },
        processedReports: [],
        processedReportsPagination: {
          count: 0,
          offset: 0,
        },

        setPendingReports: (data) =>
          set({ pendingReports: data }, false, "adminReports/setAllReports"),

        setPendingReportsPagination: (pagination) =>
          set(
            { pendingReportsPagination: pagination },
            false,
            "adminReports/setAllReportsPagination"
          ),

        setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) =>
          set(
            (state) => ({
              query: typeof data === "function" ? data(state.query) : data,
            }),
            false,
            "adminReports/setQuery"
          ),

        setProcessedReports: (data) =>
          set(
            { processedReports: data },
            false,
            "adminReports/setSubmittedReports"
          ),

        setProcessedReportsPagination: (pagination) =>
          set(
            { processedReportsPagination: pagination },
            false,
            "adminReports/setSubmittedReportsPagination"
          ),
      }),
      {
        name: "admin-reports-storage",
      }
    ),
    {
      name: "AdminReportsStore",
    }
  )
);
