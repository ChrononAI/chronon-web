import api from "@/lib/api";

export interface TDSData {
  id: string;
  tds_code: string;
  tds_percentage: string;
  description: string;
  active_flag: boolean;
  created_at: string;
  updated_at: string;
}

export interface TDSResponse {
  count: number;
  data: TDSData[];
  offset: number;
}

export const tdsService = {
  async getTDS(limit?: number, offset?: number): Promise<TDSResponse> {
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

  async searchTDSCodes(searchTerm: string, limit?: number, offset?: number): Promise<TDSResponse> {
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
};

