import api from "@/lib/api";

export interface TaxData {
  id: string;
  tax_code: string;
  tax_percentage: string;
  cgst_percentage: string;
  sgst_percentage: string;
  igst_percentage: string;
  utgst_percentage: string;
  description: string;
  active_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxResponse {
  count: number;
  data: TaxData[];
  offset: number;
}

export const taxService = {
  async getTaxes(): Promise<TaxResponse> {
    try {
      const response = await api.get("/api/v1/tax");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async searchTaxCodes(searchTerm: string): Promise<TaxResponse> {
    try {
      const response = await api.get(
        `/api/v1/tax?tax_code=ilike.%25${encodeURIComponent(searchTerm)}%25`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

