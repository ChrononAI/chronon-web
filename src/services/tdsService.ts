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
  async getTDS(): Promise<TDSResponse> {
    try {
      const response = await api.get("/api/v1/tax/tds");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async searchTDSCodes(searchTerm: string): Promise<TDSResponse> {
    try {
      const response = await api.get(
        `/api/v1/tax/tds?tds_code=ilike.%25${encodeURIComponent(searchTerm)}%25`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

