import api from "@/lib/api";

export const settlementsService = {
  async getSettlementsByStatus({
    state,
    limit,
    offset,
    status,
  }: {
    state: string;
    status?: string;
    limit: number;
    offset: number;
  }) {
    try {
      if (status) {
        return await api.get(
          `/em/expenses/admin/expenses?status=${status}&payment_state=${state}&limit=${limit}&offset=${offset}`
        );
      }
      return await api.get(
        `/em/expenses/admin/expenses?payment_state=${state}&limit=${limit}&offset=${offset}`
      );
    } catch (error) {
      throw error;
    }
  },
  async markAsPaid(expense_ids: string[]) {
    try {
      return await api.post("/em/expenses/bulk_mark_paid", { expense_ids });
    } catch (error) {
      throw error;
    }
  },
};
