import { create } from "zustand";

export interface InvoiceListRow {
  id: string; 
  invoiceId?: string; // 
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  status: string;
  ocrStatus?: string;
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