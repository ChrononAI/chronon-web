import api from "@/lib/api";

export const storesService = {
  async getAllStores() {
    try {
      return await api.get("/api/v1/stores?limit=100&offset=0");
    } catch (error) {
      throw error;
    }
  },
  getStoreById: async (id: string) => {
    try {
      return api.get(`/api/v1/stores?id=${id}`);
    } catch (error) {
      throw error;
    }
  },
  async getStores({ limit, offset }: { limit: number; offset: number }) {
    try {
      return await api.get(`/api/v1/stores?limit=${limit}&offset=${offset}`);
    } catch (error) {
      throw error;
    }
  },
  async getStoresByStatus({
    limit,
    offset,
    status,
  }: {
    limit: number;
    offset: number;
    status: string;
  }) {
    try {
      return await api.get(`/api/v1/stores?limit=${limit}&offset=${offset}&status=${status}`);
    } catch (error) {
      throw error;
    }
  },
  async createStore(payload: any) {
    try {
      return await api.post("/api/v1/stores", payload);
    } catch (error) {
      throw error;
    }
  },
  async submitStore(store_id: string) {
    try {
      return await api.post("/api/v1/stores/submit", { store_id });
    } catch (error) {
      throw error;
    }
  },
  getStoreWorkflow: async (id: string) => {
    try {
      return await api.get(`/api/v1/stores/${id}/approvers`);
    } catch (error) {
      throw error;
    }
  },
  getStoresToApprove: async ({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }) => {
    try {
      return await api.get(
        `/api/v1/stores/approvers?limit=${limit}&offset=${offset}`
      );
    } catch (error) {
      throw error;
    }
  },
  getStoresToApproveByStatus: async ({
    status,
    limit,
    offset,
  }: {
    status: string;
    limit: number;
    offset: number;
  }) => {
    try {
      return await api.get(
        `/api/v1/stores/approvers?status=${status}&limit=${limit}&offset=${offset}`
      );
    } catch (error) {
      throw error;
    }
  },
  processStore: async ({
    id,
    action,
    payload,
  }: {
    id: string;
    action: string;
    payload?: any;
  }) => {
    try {
      return await api.post(`/api/v1/stores/${id}/${action}`, payload);
    } catch (error) {
      throw error;
    }
  },
};
