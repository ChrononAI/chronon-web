import api from "@/lib/api";

const BULK_ACCEPT_HEADER =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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
  async downloadBulkMarkTemplate() {
    try {
      return await api.get(
        "/api/v1/bulk_upload/expense_data_template_download",
        {
          responseType: "blob",
          headers: {
            Accept: BULK_ACCEPT_HEADER,
          },
        }
      );
    } catch (error) {
      throw error;
    }
  },
  async bulkMarkExpenses() {
    try {
      // return await
    } catch (error) {
      throw error;
    }
  },
  async uploadBulkSettleExpense(file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("/api/v1/bulk_upload/expenses_paid_upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response;
    } catch (error) {
      throw error;
    }
  },
};
