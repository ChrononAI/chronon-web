import api from "@/lib/api";

export interface PlaceSuggestion {
  description: string;
  main_text: string;
  place_id: string;
  secondary_text: string;
  types: string[];
}

export interface MileageCostData {
  cost: number;
  distance: {
    distance: number;
    distance_unit: string;
    meters: number;
    text: string;
  };
  mileage_info: {
    created_at: string;
    distance_unit: string;
    id: number;
    org_id: number;
    price: number;
    updated_at: string;
    vehicle_type: string;
  };
  status: string;
}

export const placesService = {
  async getSuggestions(keyword: string): Promise<PlaceSuggestion[]> {
    if (!keyword.trim()) return [];

    try {
      const response = await api.get(
        `/api/v1/places/autocomplete?keyword=${encodeURIComponent(
          keyword
        )}&radius=50`
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      return [];
    }
  },

  async getMileageCost({
    originPlaceId,
    destinationPlaceIds,
    vehicle,
    orgId,
    isRoundTrip,
  }: {
    originPlaceId: string;
    destinationPlaceIds: string;
    vehicle: string;
    orgId: string;
    isRoundTrip: boolean;
  }): Promise<MileageCostData | null> {
    try {
      const response = await api.get(
        `/em/expenses/mileage/cost?origin_placeid=${originPlaceId}&destination_placeids=${destinationPlaceIds}&vehicle=${vehicle}&org_id=${orgId}&is_round_trip=${isRoundTrip}`
      );
      return response.data.data || null;
    } catch (error) {
      console.error("Error fetching mileage cost:", error);
      return null;
    }
  },

  async createMileageExpense(expenseData: any, orgId: string): Promise<any> {
    try {
      const response = await api.post(
        `/em/expenses/create/mileage?org_id=${orgId}`,
        expenseData
      );
      return response.data;
    } catch (error) {
      console.error("Error creating mileage expense:", error);
      throw error;
    }
  },

  async createPerDiemExpense(expenseData: any, orgId: string): Promise<any> {
    try {
      const response = await api.post(
        `/em/expenses/create?org_id=${orgId}`,
        expenseData
      );
      return response.data;
    } catch (error) {
      console.error("Error creating per diem expense:", error);
      throw error;
    }
  },
};
