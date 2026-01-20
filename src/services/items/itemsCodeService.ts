import api from "@/lib/api";

export interface TDSCodeData {
  id: string;
  tds_code: string;
  tds_percentage: string;
  description: string;
  active_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface TDSCodeResponse {
  count: number;
  data: TDSCodeData[];
  offset: number;
}

export interface TaxCodeData {
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

export interface TaxCodeResponse {
  count: number;
  data: TaxCodeData[];
  offset: number;
}

export const itemsCodeService = {
  // TDS Code APIs
  async getTDSCodes(): Promise<TDSCodeResponse> {
    try {
      const response = await api.get("/api/v1/tds");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async searchTDSCodes(searchTerm: string): Promise<TDSCodeResponse> {
    try {
      const response = await api.get(
        `/api/v1/tds?tds_code=ilike.%25${encodeURIComponent(searchTerm)}%25`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createTDSCode(data: {
    tds_code: string;
    tds_percentage: number;
    description?: string;
  }): Promise<any> {
    try {
      const response = await api.post("/api/v1/tds", data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Tax Code APIs
  async getTaxCodes(): Promise<TaxCodeResponse> {
    try {
      const response = await api.get("/api/v1/tax");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async searchTaxCodes(searchTerm: string): Promise<TaxCodeResponse> {
    try {
      const response = await api.get(
        `/api/v1/tax?tax_code=ilike.%25${encodeURIComponent(searchTerm)}%25`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createTaxCode(data: {
    tax_code: string;
    tax_percentage: number;
    cgst_percentage?: number;
    sgst_percentage?: number;
    igst_percentage?: number;
    utgst_percentage?: number;
    description?: string;
  }): Promise<any> {
    try {
      const response = await api.post("/api/v1/tax", data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

