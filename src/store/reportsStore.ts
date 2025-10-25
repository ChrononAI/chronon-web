import { Report } from "@/types/expense";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface PaginationInfo {
  has_next: boolean;
  has_prev: boolean;
  page: number;
  pages: number;
  per_page: number;
  total: number;
}

interface ReportsState {

  allReports: Report[];
  allReportsPagination: PaginationInfo;

  unsubmittedReports: Report[];
  unsubmittedReportsPagination: PaginationInfo;

  submittedReports: Report[];
  submittedReportsPagination: PaginationInfo;

  // Methods

  setAllReports: (data: Report[]) => void;
  setAllReportsPagination: (pagination: PaginationInfo) => void;

  setUnsubmittedReports: (data: Report[]) => void;
  setUnsubmittedReportsPagination: (pagination: PaginationInfo) => void;

  setSubmittedReports: (data: Report[]) => void;
  setSubmittedReportsPagination: (pagination: PaginationInfo) => void;
}

export const useReportsStore = create<ReportsState>()(
  devtools(
    persist(
      (set) => ({
        allReports: [],
        allReportsPagination: {
          has_next: false,
          has_prev: false,
          page: 1,
          pages: 1,
          per_page: 10,
          total: 0,
        },
        unsubmittedReports: [],
        unsubmittedReportsPagination: {
          has_next: false,
          has_prev: false,
          page: 1,
          pages: 1,
          per_page: 10,
          total: 0,
        },
        submittedReports: [],
        submittedReportsPagination: {
          has_next: false,
          has_prev: false,
          page: 1,
          pages: 1,
          per_page: 10,
          total: 0,
        },

        setAllReports: (data) =>
          set({ allReports: data }, false, 'reports/setAllReports'),

        setAllReportsPagination: (pagination) =>
          set(
            { allReportsPagination: pagination },
            false,
            "reports/setAllReportsPagination"
          ),

        setUnsubmittedReports: (data) =>
          set({ unsubmittedReports: data }, false, 'reports/setUnsubmittedReports'),

        setUnsubmittedReportsPagination: (pagination) =>
          set(
            { unsubmittedReportsPagination: pagination },
            false,
            "expense/setUnsubmittedReportsPagination"
          ),

        setSubmittedReports: (data) =>
          set({ submittedReports: data }, false, 'rerports/setSubmittedReports'),

        setSubmittedReportsPagination: (pagination) =>
          set(
            { submittedReportsPagination: pagination },
            false,
            "expense/setSubmittedReportsPagination"
          ),
      }),
      {
        name: 'reports-storage',
      }
    ),
    {
      name: 'ReportsStore',
    }
  )
);
