import { create } from "zustand";

export interface InvoiceListRow {
  id: string; // Stable ID for DataGrid (never changes)
  invoiceId?: string; // Real invoice ID from API (set after upload completes)
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  poNumber: string;
  status: string;
  totalAmount: string;
  uploadState?: "uploading" | "done";
  uploadStartedAt?: number;
}

interface InvoiceFlowState {
  invoices: InvoiceListRow[];
  prependInvoices: (rows: InvoiceListRow[]) => void;
  updateInvoice: (id: string, patch: Partial<InvoiceListRow>) => void;
  clearInvoices: () => void;
}

export const useInvoiceFlowStore = create<InvoiceFlowState>()((set) => ({
  invoices: [],
  
  prependInvoices: (rows) =>
    set((state) => ({ invoices: [...rows, ...state.invoices] })),
  
  updateInvoice: (id, patch) =>
    set((state) => ({
      invoices: state.invoices.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)),
    })),
  
  clearInvoices: () => set({ invoices: [] }),
}));