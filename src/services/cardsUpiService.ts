import api from "@/lib/api";

export type KYCRecord = {
  customer_signature: string;
  full_kyc_completed_at: string; // ISO datetime
  full_kyc_customer_name: string | null;
  full_kyc_expires_at: string; // ISO datetime
  full_kyc_state: "COMPLETED" | string;
  full_kyc_status: number;
  id: string;
  org_id: string;
  user_email: string | null;
  user_id: string;
  user_name: string | null;
  user_phone_number: string | null;
  video_kyc_status: string | null;
};

export type Account = {
  account_number: string;
  account_type: "USER" | string;
  currency: string;
  id: string;
  is_active: boolean;
  ledger_balance: string;
  org_id: string;
  source: string;
  source_balance: string;
  user: {
    email: string;
    first_name: string;
    id: number;
    last_name: string;
    phone_number: string;
  };
  user_id: string;
};

export const cardsUpiService = {
  initiateKyc: async (payload: { user_id: string }[]) => {
    try {
      return await api.post("/api/v1/pinelabs/kyc/initiate", payload[0]);
    } catch (error) {
      throw error;
    }
  },

  refreshKycStatus: async (user_id: string) => {
    try {
      return await api.get(`/api/v1/pinelabs/kyc/sync?user_id=${user_id}`);
    } catch (error) {
      throw error;
    }
  },

  reloadAccount: async (payload: { user_id: number; amount: number }) => {
    try {
      return await api.post("/api/v1/pinelabs/accounts/reload", {
        user_id: payload.user_id.toString(),
        amount: payload.amount,
      });
    } catch (error) {
      throw error;
    }
  },

  getAccounts: async ({ limit, offset }: { limit: number; offset: number }) => {
    try {
      return await api.get(
        `/api/v1/pinelabs/accounts?limit=${limit}&offset=${offset}`,
      );
    } catch (error) {
      throw error;
    }
  },

  getAccountById: async (id: string) => {
    try {
      return await api.get(`/api/v1/pinelabs/accounts?id=eq.${id}`);
    } catch (error) {
      throw error;
    }
  },

  updateBalance: async () => {
    try {
      return await api.post("/api/v1/pinelabs/accounts/balances/sync");
    } catch (error) {
      throw error;
    }
  },

  getKycStatuses: async ({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }) => {
    try {
      return await api.get(
        `/api/v1/pinelabs/kyc_statuses?limit=${limit}&offset=${offset}`,
      );
    } catch (error) {
      throw error;
    }
  },

  getAccountTransactions: async ({
    limit,
    offset,
    userId,
  }: {
    limit: number;
    offset: number;
    userId: string | number;
  }) => {
    try {
      return await api.get(
        `/api/v1/transactions?user_account_id=eq.ac_user_${userId}&limit=${limit}&offset=${offset}`,
      );
    } catch (error) {
      throw error;
    }
  },
};
