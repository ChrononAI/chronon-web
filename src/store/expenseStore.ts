import { ParsedInvoiceData } from "@/services/fileParseService";
import { Expense } from "@/types/expense";
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

interface ExpenseState {
  parsedData: ParsedInvoiceData | null;

  allExpenses: Expense[];
  allExpensesPagination: PaginationInfo;

  draftExpenses: Expense[];
  draftExpensesPagination: PaginationInfo;

  reportedExpenses: Expense[];
  reportedExpensesPagination: PaginationInfo;

  // Methods
  setParsedData: (data: ParsedInvoiceData | null) => void;

  setAllExpenses: (data: Expense[]) => void;
  setAllExpensesPagination: (pagination: PaginationInfo) => void;

  setDraftExpenses: (data: Expense[]) => void;
  setDraftExpensesPagination: (pagination: PaginationInfo) => void;

  setReportedExpenses: (data: Expense[]) => void;
  setReportedExpensesPagination: (pagination: PaginationInfo) => void;
}

export const useExpenseStore = create<ExpenseState>()(
  devtools(
    persist(
      (set) => ({
        parsedData: null,
        allExpenses: [],
        allExpensesPagination: {
          has_next: false,
          has_prev: false,
          page: 1,
          pages: 1,
          per_page: 10,
          total: 0,
        },
        draftExpenses: [],
        draftExpensesPagination: {
          has_next: false,
          has_prev: false,
          page: 1,
          pages: 1,
          per_page: 10,
          total: 0,
        },
        reportedExpenses: [],
        reportedExpensesPagination: {
          has_next: false,
          has_prev: false,
          page: 1,
          pages: 1,
          per_page: 10,
          total: 0,
        },

        setParsedData: (data) =>
          set({ parsedData: data }, false, 'expense/setParsedData'),

        setAllExpenses: (data) =>
          set({ allExpenses: data }, false, 'expense/setAllExpenses'),

        setAllExpensesPagination: (pagination) =>
          set(
            { allExpensesPagination: pagination },
            false,
            "expense/setAllExpensesPagination"
          ),

        setDraftExpenses: (data) =>
          set({ draftExpenses: data }, false, 'expense/setDraftExpenses'),

        setDraftExpensesPagination: (pagination) =>
          set(
            { draftExpensesPagination: pagination },
            false,
            "expense/setDraftExpensesPagination"
          ),

        setReportedExpenses: (data) =>
          set({ reportedExpenses: data }, false, 'expense/setCompletedExpenses'),

        setReportedExpensesPagination: (pagination) =>
          set(
            { reportedExpensesPagination: pagination },
            false,
            "expense/setCompletedExpensesPagination"
          ),
      }),
      {
        name: 'expense-storage',
      }
    ),
    {
      name: 'ExpenseStore',
    }
  )
);
