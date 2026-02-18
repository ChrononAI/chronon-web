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
  hsn_sac_code?: string | null;
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
  async getTaxes(limit?: number, offset?: number): Promise<TaxResponse> {
    try {
      const response = await api.get("/api/v1/tax", {
        params: {
          ...(limit !== undefined && { limit }),
          ...(offset !== undefined && { offset }),
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async searchTaxCodes(searchTerm: string, limit?: number, offset?: number): Promise<TaxResponse> {
    try {
      let url = `/api/v1/tax?tax_code=ilike.%${searchTerm}%`;
      if (limit !== undefined) url += `&limit=${limit}`;
      if (offset !== undefined) url += `&offset=${offset}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async searchTaxCodesByHsn(hsnCode: string, limit?: number, offset?: number): Promise<TaxResponse> {
    try {
      let url = `/api/v1/tax?hsn_sac_code=ilike.%${hsnCode}%`;
      if (limit !== undefined) url += `&limit=${limit}`;
      if (offset !== undefined) url += `&offset=${offset}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

