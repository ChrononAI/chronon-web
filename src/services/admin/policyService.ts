import api from "@/lib/api";

export interface CreatePolicyPayload {
  name: string;
  description: string;
  category_ids: string[];
  is_pre_approval_required: boolean;
}

export const policyService = {
  async createPolicy(payload: CreatePolicyPayload) {
    try {
      const response = await api.post("api/v1/expense_policies", payload);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async getPolicies({
    page = 1,
    perPage = 10,
  }: {
    page: number;
    perPage: number;
  }) {
    try {
      const response = api.get(
        `/api/v1/expense-policies?page=${page}&per_page=${perPage}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  async getFilteredPolicies({
    query,
    limit,
    offset,
    signal,
  }: {
    query: string;
    limit?: number;
    offset?: number;
    signal: AbortSignal;
  }) {
    try {
      return await api.get(`/api/v1/expense_policies_v2?${query}`, {
        params: {
          limit,
          offset,
        },
        signal,
      });
    } catch (error) {
      throw error;
    }
  },
};
