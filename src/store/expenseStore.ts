import { ParsedInvoiceData } from "@/services/fileParseService";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface ExpenseState {
  parsedData: ParsedInvoiceData | null;
  setParsedData: (data: ParsedInvoiceData | null) => void;
}

export const useExpenseStore = create<ExpenseState>()(
  devtools(
    persist(
      (set) => ({
        parsedData: null,
        setParsedData: (data) => set({ parsedData: data }, false, 'expense/setParsedData'),
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
