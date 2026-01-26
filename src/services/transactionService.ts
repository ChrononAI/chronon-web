import api from "@/lib/api";

export interface Transaction {
  additional_data: {
    category_id: string;
    policy_id: string;
  };
  amount: string;
  created_at: string;
  created_by: {
    email: string;
    org_id: string;
    user_id: string;
  };
  id: string;
  mcc_code: string | null;
  merchant_name: string;
  message: string | null;
  org_account_id: string;
  org_id: string;
  source_transaction_id: string | null;
  transaction_date: Date;
  transaction_entry_type: "CREDIT" | "DEBIT" | null;
  transaction_id: string;
  transaction_source: "DECENTRO" | string;
  transaction_status: "PENDING" | "SUCCESS" | "FAILED" | string;
  transaction_type: "UPI" | "CARD" | "BANK_TRANSFER" | string;
  updated_at: string;
  updated_by: {
    email: string;
    org_id: string;
    user_id: string;
  };
  user_account_id: string;
}

export const transactionService = {
  async getAllTransaction({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }) {
    try {
      return await api.get(`/api/v1/transactions?limit=${limit}&offset=${offset}`);
    } catch (error) {
      throw error;
    }
  },

  async getTransactionById(id: string) {
    try {
      return await api.get(`/api/v1/transactions/${id}`);
    } catch (error) {
      throw error;
    }
  },

  async getOrgTransactions() {
    try {
      return await api.get("/api/v1/transactions/org");
    } catch (error) {
      throw error;
    }
  },
};
