import api from "@/lib/api";

export interface TDSCodeData {
  id: string;
  tds_code: string;
  tds_percentage: string;
  description: string;
  is_active: boolean;
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
  hsn_sac_code?: string;
  is_active: boolean;
  active_flag?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxCodeResponse {
  count: number;
  data: TaxCodeData[];
  offset: number;
}

export interface ItemData {
  id: string;
  item_code: string;
  description: string;
  tax_code: string;
  tds_code: string;
  hsn_sac_code: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ItemResponse {
  count: number;
  data: ItemData[];
  offset: number;
}

export const itemsCodeService = {
  // TDS Code APIs
  async getTDSCodes(limit?: number, offset?: number): Promise<TDSCodeResponse> {
    try {
      const response = await api.get("/api/v1/tds", {
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

  async searchTDSCodes(searchTerm: string, limit?: number, offset?: number): Promise<TDSCodeResponse> {
    try {
      const response = await api.get("/api/v1/tds", {
        params: {
          tds_code: `ilike.%${searchTerm}%`,
          ...(limit !== undefined && { limit }),
          ...(offset !== undefined && { offset }),
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createTDSCode(data: {
    tds_code: string;
    tds_percentage: number;
    description?: string;
    is_active?: boolean;
  }): Promise<any> {
    try {
      const response = await api.post("/api/v1/tds", data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateTDSCode(id: string, data: {
    tds_code?: string;
    tds_percentage?: number;
    description?: string;
    active_flag?: boolean;
  }): Promise<any> {
    try {
      const response = await api.put(`/api/v1/tds/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Tax Code APIs
  async getTaxCodes(limit?: number, offset?: number): Promise<TaxCodeResponse> {
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

  async searchTaxCodes(searchTerm: string, limit?: number, offset?: number): Promise<TaxCodeResponse> {
    try {
      const response = await api.get("/api/v1/tax", {
        params: {
          tax_code: `ilike.%25${encodeURIComponent(searchTerm)}%25`,
          ...(limit !== undefined && { limit }),
          ...(offset !== undefined && { offset }),
        },
      });
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
    hsn_sac_code?: string;
    is_active?: boolean;
  }): Promise<any> {
    try {
      const response = await api.post("/api/v1/tax", data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateTaxCode(id: string, data: {
    tax_code?: string;
    tax_percentage?: number;
    cgst_percentage?: number;
    sgst_percentage?: number;
    igst_percentage?: number;
    utgst_percentage?: number;
    description?: string;
    hsn_sac_code?: string;
    is_active?: boolean;
    active_flag?: boolean;
  }): Promise<any> {
    try {
      const response = await api.put(`/api/v1/tax/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Item APIs
  async getItems(limit?: number, offset?: number): Promise<ItemResponse> {
    try {
      const response = await api.get("/api/v1/items", {
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

  async searchItems(searchTerm: string, limit?: number, offset?: number): Promise<ItemResponse> {
    try {
      const response = await api.get("/api/v1/items", {
        params: {
          description: `ilike.%${searchTerm}%`,
          ...(limit !== undefined && { limit }),
          ...(offset !== undefined && { offset }),
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async searchItemsByHsn(hsnCode: string, limit?: number, offset?: number): Promise<ItemResponse> {
    try {
      const trimmedHsn = hsnCode.trim();
      const response = await api.get("/api/v1/items", {
        params: {
          hsn_sac_code: `ilike.%25${encodeURIComponent(trimmedHsn)}%25`,
          ...(limit !== undefined && { limit }),
          ...(offset !== undefined && { offset }),
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createItem(data: {
    item_code: string;
    description: string;
    tax_code: string;
    tds_code?: string;
    hsn_sac_code: string;
  }): Promise<any> {
    try {
      const response = await api.post("/api/v1/items", data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateItem(id: string, data: {
    item_code?: string;
    description?: string;
    tax_code?: string;
    tds_code?: string;
    hsn_sac_code?: string;
  }): Promise<any> {
    try {
      const response = await api.put(`/api/v1/items/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

