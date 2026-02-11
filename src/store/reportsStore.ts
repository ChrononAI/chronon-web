import { FilterMap } from "@/pages/MyExpensesPage";
import { NewPaginationMeta, Report } from "@/types/expense";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface ReportsState {
  allReports: Report[];
  allReportsPagination: NewPaginationMeta;
  query: FilterMap;
  expenseQuery: FilterMap;
  approvalQuery: FilterMap;

  unsubmittedReports: Report[];
  unsubmittedReportsPagination: NewPaginationMeta;

  submittedReports: Report[];
  submittedReportsPagination: NewPaginationMeta;

  // Methods

  setAllReports: (data: Report[]) => void;
  setAllReportsPagination: (pagination: NewPaginationMeta) => void;
  setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;
  setExpenseQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;
  setApprovalQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) => void;

  setUnsubmittedReports: (data: Report[]) => void;
  setUnsubmittedReportsPagination: (pagination: NewPaginationMeta) => void;

  setSubmittedReports: (data: Report[]) => void;
  setSubmittedReportsPagination: (pagination: NewPaginationMeta) => void;
}

export const useReportsStore = create<ReportsState>()(
  devtools(
    persist(
      (set) => ({
        query: {},
        expenseQuery: {},
        approvalQuery: {},
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
          set({ allReports: data }, false, "reports/setAllReports"),

        setAllReportsPagination: (pagination) =>
          set(
            { allReportsPagination: pagination },
            false,
            "reports/setAllReportsPagination"
          ),

        setQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) =>
          set(
            (state) => ({
              query: typeof data === "function" ? data(state.query) : data,
            }),
            false,
            "reports/setQuery"
          ),
        
        setApprovalQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) =>
          set(
            (state) => ({
              approvalQuery: typeof data === "function" ? data(state.approvalQuery) : data,
            }),
            false,
            "reportsApproval/setQuery"
          ),

        setExpenseQuery: (data: FilterMap | ((prev: FilterMap) => FilterMap)) =>
          set(
            (state) => ({
              expenseQuery: typeof data === "function" ? data(state.expenseQuery) : data,
            }),
            false,
            "reports/setExpenseQuery"
          ),

        setUnsubmittedReports: (data) =>
          set(
            { unsubmittedReports: data },
            false,
            "reports/setUnsubmittedReports"
          ),

        setUnsubmittedReportsPagination: (pagination) =>
          set(
            { unsubmittedReportsPagination: pagination },
            false,
            "expense/setUnsubmittedReportsPagination"
          ),

        setSubmittedReports: (data) =>
          set(
            { submittedReports: data },
            false,
            "rerports/setSubmittedReports"
          ),

        setSubmittedReportsPagination: (pagination) =>
          set(
            { submittedReportsPagination: pagination },
            false,
            "expense/setSubmittedReportsPagination"
          ),
      }),
      {
        name: "reports-storage",
      }
    ),
    {
      name: "ReportsStore",
    }
  )
);
