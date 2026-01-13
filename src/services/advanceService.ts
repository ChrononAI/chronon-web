import api from "@/lib/api";
export interface AdvanceType {
  id: string;
  title: string;
  description: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "COMPLETE" | string;
  sequence_number: string;
  org_id: string;
  user_id: string;
  amount: string;
  currency?: string;
  policy_id?: string;
  custom_attributes?: Record<string, string>;
  created_at: string;
  updated_at: string;
  created_by: {
    email: string;
    org_id: string;
    user_id: string;
  };
  updated_by: {
    email: string;
    org_id: string;
    user_id: string;
  };
}

interface CreateAdvancePayloadType {
  title: string;
  description: string;
  currency: string;
  amount: string;
  policy_id?: string;
  custom_attributes?: Record<string, string>;
}

export interface AccountType {
  id: string;
  org_id: string;
  account_name: string;
  user_id: string;
  policy_id: string;
  pre_approval_id: string | null;
  balance_amount: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerType {
  id: string;
  org_id: string;
  advance_id: string;
  advance_account_id: string;
  balance_amount: string;
  credit_amount: string;
  debit_amount: string;
  conversion_rate: string | null;
  expense_id: string | null;
  foreign_amount: string | null;
  foreign_currency: string | null;
  created_at: string;
  updated_at: string;
}

export const AdvanceService = {
  getAllAdvances: async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      return await api.get(`/api/v1/advances?page=${page}&per_page=${perPage}`);
    } catch (error) {
      console.log(error);
      throw error;
    }
  },

  getAdvancesByStatus: async ({
    status,
    page,
    perPage,
  }: {
    status: string;
    page: number;
    perPage: number;
  }) => {
    try {
      return await api.get(
        `/api/v1/advances?status=${status}&page=${page}&per_page=${perPage}`
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  },

  createAdvance: async (payload: CreateAdvancePayloadType) => {
    try {
      return await api.post("/api/v1/advances", payload);
    } catch (error) {
      throw error;
    }
  },

  submitAdvance: async (advance_id: string) => {
    try {
      return await api.post("/api/v1/advances/submit", {
        advance_id,
      });
    } catch (error) {
      throw error;
    }
  },

  getAdvanceById: async (id: string) => {
    try {
      return api.get(`/api/v1/advances?id=${id}`);
    } catch (error) {
      throw error;
    }
  },

  getAdvanceWorkflow: async (id: string) => {
    try {
      return await api.get(`/api/v1/advances/${id}/approvers`);
    } catch (error) {
      throw error;
    }
  },

  getAdvanceToApprove: async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      return await api.get(
        `/api/v1/advances/approvers?page=${page}&per_page=${perPage}`
      );
    } catch (error) {
      throw error;
    }
  },

  getAdvanceToApproveByStatus: async ({
    status,
    page,
    perPage,
  }: {
    status: string;
    page: number;
    perPage: number;
  }) => {
    try {
      return await api.get(
        `/api/v1/advances/approvers?status=${status}&page=${page}&per_page=${perPage}`
      );
    } catch (error) {
      throw error;
    }
  },

  processAdvance: async ({ id, action, payload }: { id: string; action: string, payload?: any }) => {
    try {
      return await api.post(`/api/v1/advances/${id}/${action}`, payload);
    } catch (error) {
      throw error;
    }
  },

  getAccounts: async () => {
    try {
      return await api.get("/api/v1/advances/advance_accounts");
    } catch (error) {
      throw error;
    }
  },

  getAccountLedger: async (id: string) => {
    try {
      return await api.get(
        `/api/v1/advances/advance_accounts_ledger_statement/${id}`
      );
    } catch (error) {
      throw error;
    }
  },
};
