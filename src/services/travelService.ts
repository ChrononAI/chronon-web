import api from "@/lib/api";


export interface TravelDetails {
  id?: string;
  mode_of_travel: "FLIGHT" | "BUS" | "TRAIN";
  trip_type: "SINGLE_TRIP" | "ROUND_TRIP";
  bus_travel_type?: "AC_BUS" | "NON_AC_BUS" | "PERSONAL_VEHICLE" | "TAXI";
  train_travel_type?: "TIER_1" | "TIER_2" | "TIER_3" | "SLEEPER";
  source: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  accommodation_required?: boolean;
  special_instruction?: string;
  advance_required?: boolean;
  advance_amount?: number;
  file_ids?: string[];
  custom_attributes?: Record<string, any>;
  admin_amount?: number;
  admin_notes?: string;
  admin_file_ids?: string[];
}

export interface CreateTravelData {
  employee_id: string;
  trip_name: string;
  traveller_name_as_id_proof: string;
  source: string;
  destination: string;
  description?: string;
  custom_attributes?: Record<string, any>;
  trip_details: TravelDetails[];
}

export interface TravelRequest {
  id: string;
  employee_id: string;
  trip_name: string;
  traveller_name_as_id_proof: string;
  source: string;
  destination: string;
  description?: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  created_at: string;
  trip_details: TravelDetails[];
  admin_amount?: number;
  admin_notes?: string;
  file_ids?: string[];
}

export interface TravelResponse {
  data: TravelRequest[];
  count: number;
  offset: number;
}

export const travelService = {
  createTravel: async (data: CreateTravelData) => {
    try {
      const response = await api.post("/api/v1/travel", data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  submitTravel: async (travelId: string) => {
    try {
      const response = await api.post("/api/v1/travel/submit", { travel_id: travelId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTravels: async (params: { page?: number; per_page?: number; status?: string; q?: string }) => {
    try {

      const limit = params.per_page || 10;
      const offset = params.page ? (params.page - 1) * limit : 0;

      const queryParams = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
        ...(params.status && { status: params.status }),
        ...(params.q && { q: params.q }),
      });

      const response = await api.get(`/api/v1/travel?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTravel: async (id: string) => {
    try {
      const response = await api.get(`/api/v1/travel/${id}`);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  updateTravel: async (id: string, data: Partial<CreateTravelData>) => {
    try {
      const response = await api.put(`/api/v1/travel/${id}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getApprovals: async (params: { status?: string; page?: number; limit?: number }) => {
    try {
      const queryParams = new URLSearchParams({
        ...(params.status && { status: params.status }),
        ...(params.page && { offset: ((params.page - 1) * (params.limit || 10)).toString() }),
        ...(params.limit && { limit: params.limit.toString() }),
      });
      const response = await api.get(`/api/v1/travel/approvals?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  performAction: async (id: string, action: "approve" | "reject", data: any) => {
    try {
      const response = await api.post(`/api/v1/travel/${id}/action`, { action, ...data });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getApprovers: async (id: string) => {
    try {
      const response = await api.get(`/api/v1/travel/${id}/approvers`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  adminUpdate: async (id: string, data: { admin_amount?: number; admin_notes?: string; file_ids?: string[] }) => {
    try {
      const response = await api.put(`/api/v1/travel/${id}/admin_update`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateTripDetailAdmin: async (detailId: string, data: { admin_amount?: number; admin_notes?: string; admin_file_ids?: string[] }) => {
    try {
      const response = await api.put(`/api/v1/travel/details/${detailId}/admin_update`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createExpenseForTravel: async (travelId: string, expenseData: any) => {
    try {
      const response = await api.post(`/api/v1/travel/${travelId}/expenses`, expenseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  addExpensesToTravel: async (travelId: string, expenseIds: string[]) => {
    try {
      const response = await api.post(`/api/v1/travel/${travelId}/add_expenses`, { expense_ids: expenseIds });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  unlinkTripFromReport: async (travelId: string, reportId: string) => {
    try {
      const response = await api.patch(`/api/v1/travel/${travelId}/report`, {
        action: "remove",
        report_id: reportId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
