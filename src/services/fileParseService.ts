import { api } from '@/lib/api';
import { getOrgIdFromToken } from '@/lib/jwtUtils';

export interface ParsedInvoiceData {
  id: string;
  extracted_amount: string | null;
  extracted_date: string | null;
  extracted_vendor: string;
  file_key: string;
  invoice_number?: string | null;
  ocr_result: {
    amount: string;
    date: string;
    vendor: string;
    invoice_number: string;
  };
  is_invoice_flagged: boolean;
  is_duplicate_receipt: boolean;
  original_expense_id: string | null;
}

export const fileParseService = {
  async parseInvoiceFile(file: File): Promise<ParsedInvoiceData> {
    const orgId = getOrgIdFromToken();
    if (!orgId) {
      throw new Error('Organization ID not found. Please login again.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/em/expenses/receipt/parse?org_id=${orgId}`, formData, {
      timeout: 120000,
    });

    return response.data.data;
  },
}; 