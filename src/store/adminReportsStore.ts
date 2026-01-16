import { FilterMap } from "@/pages/MyExpensesPage";
import { NewPaginationMeta, Report } from "@/types/expense";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AdminReportsState {
  allReports: Report[];
  allReportsPagination: NewPaginationMeta;
  query: FilterMap;

  unsubmittedReports: Report[];
  unsubmittedReportsPagination: NewPaginationMeta;

  submittedReports: Report[];
  submittedReportsPagination: NewPaginationMeta;

  // Methods

  setAllReports: (data: Report[]) => void;
  setAllReportsPagination: (pagination: NewPaginationMeta) => void;
  setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;

  setUnsubmittedReports: (data: Report[]) => void;
  setUnsubmittedReportsPagination: (pagination: NewPaginationMeta) => void;

  setSubmittedReports: (data: Report[]) => void;
  setSubmittedReportsPagination: (pagination: NewPaginationMeta) => void;
}

export const useAdminReportsStore = create<AdminReportsState>()(
  devtools(
    persist(
      (set) => ({
        query: {},
        allReports: [],
        allReportsPagination: {
          count: 0,
          offset: 0,
        },
        unsubmittedReports: [],
        unsubmittedReportsPagination: {
          count: 0,
          offset: 0,
        },
        submittedReports: [],
        submittedReportsPagination: {
          count: 0,
          offset: 0,
        },

        setAllReports: (data) =>
          set({ allReports: data }, false, "adminReports/setAllReports"),

        setAllReportsPagination: (pagination) =>
          set(
            { allReportsPagination: pagination },
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

        setUnsubmittedReports: (data) =>
          set(
            { unsubmittedReports: data },
            false,
            "adminReports/setUnsubmittedReports"
          ),

        setUnsubmittedReportsPagination: (pagination) =>
          set(
            { unsubmittedReportsPagination: pagination },
            false,
            "adminReports/setUnsubmittedReportsPagination"
          ),

        setSubmittedReports: (data) =>
          set(
            { submittedReports: data },
            false,
            "adminReports/setSubmittedReports"
          ),

        setSubmittedReportsPagination: (pagination) =>
          set(
            { submittedReportsPagination: pagination },
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
