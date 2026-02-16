import api from "@/lib/api";

export interface VendorData {
  id: number;
  vendor_code: string;
  vendor_name: string;
  gstin: string;
  pan?: string;
  email?: string;
  phone_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  pincode?: string;
  state?: string;
  country?: string;
  status: string;
  vendor_type?: string;
}

export interface CreateVendorPayload {
  vendor_name: string;
  vendor_code: string;
  is_active: boolean;
  gstin: string;
  pan?: string;
  phone_number?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  vendor_type?: string;
}

export interface UpdateVendorPayload {
  vendor_name: string;
  vendor_code: string;
  gstin: string;
  pan?: string;
  phone_number?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  vendor_type?: string;
}

export interface VendorResponse {
  count: number;
  data: VendorData[];
  offset: number;
}

export interface CreateVendorResponse {
  data: {
    id: number;
    vendor_code: string;
    vendor_name: string;
    gstin: string;
    pan?: string;
    email?: string;
    phone_number?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    pincode?: string;
    state?: string;
    country?: string;
    status: string;
    vendor_type?: string;
    org_id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    created_by: any;
    updated_by: any;
  };
}

export const vendorService = {
  async getVendors(limit?: number, offset?: number): Promise<VendorResponse> {
    try {
      const response = await api.get("/api/v1/vendors", {
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

  async searchVendorsByGst(gstNumber: string, limit?: number, offset?: number): Promise<VendorResponse> {
    try {
      const response = await api.get("/api/v1/vendors", {
        params: {
          gstin: `eq.${gstNumber}`,
          ...(limit !== undefined && { limit }),
          ...(offset !== undefined && { offset }),
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getVendorById(id: string | number, limit?: number, offset?: number): Promise<VendorResponse> {
    try {
      const response = await api.get("/api/v1/vendors", {
        params: {
          id: `eq.${id}`,
          ...(limit !== undefined && { limit }),
          ...(offset !== undefined && { offset }),
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createVendor(payload: CreateVendorPayload): Promise<CreateVendorResponse> {
    try {
      const response = await api.post("/api/v1/vendors", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateVendor(id: string | number, payload: UpdateVendorPayload) {
    try {
      const response = await api.put(`/api/v1/vendors/${id}`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

