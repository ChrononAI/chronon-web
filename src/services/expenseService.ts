import api from "@/lib/api";
import {
  Expense,
  ExpensesResponse,
  ReportsResponse,
  Policy,
  ExpenseComment,
} from "@/types/expense";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import { toast } from "sonner";
import { format } from "date-fns";

export interface CreateExpenseData {
  amount: number;
  category_id: string;
  description: string;
  expense_date: string;
  expense_policy_id: string;
  vendor: string;
  receipt_id?: string;
  invoice_number?: string | null;
  advance_id?: string;
  pre_approval_id?: string;
  foreign_amount?: number | null;
  foreign_currency?: string | null;
  currency?: string | null;
  api_conversion_rate?: number | null;
  user_conversion_rate?: number | null;
  custom_attributes?: Record<string, string>;
}

export interface UpdateExpenseData {
  advance_account_id?: string;
  amount?: string | number;
  category_id: string;
  description: string;
  file_ids?: string[];
  expense_date: string;
  expense_policy_id: string;
  vendor?: string;
  receipt_id?: string | null;
  invoice_number?: string | null;
  distance?: number | string | null;
  distance_unit?: string | null;
  end_location?: string | null;
  start_location?: string | null;
  mileage_rate_id?: string;
  mileage_meta?: any;
  custom_attributes?: any;
  is_round_trip?: boolean;
  foreign_amount?: number | null;
  foreign_currency?: string | null;
  currency?: string | null;
  api_conversion_rate?: number;
  user_conversion_rate?: number;
}

export interface CreateExpenseResponse {
  success: boolean;
  message: string;
  data?: any;
  policy_validation?: {
    amount: number;
    category_name: string;
    policy_details: {
      annual_limit: number | null;
      daily_limit: number;
      monthly_limit: number;
    };
    policy_name: string;
    requires_receipt: boolean;
  };
  validation_details?: {
    current_daily_total: number;
    daily_limit: number;
    date: string;
    limit_type: string;
    new_amount: number;
  };
}

export interface CreateAdvanceData {
  description: string;
  amount: number;
  currency: string;
}

export const expenseService = {
  async getExpensesByStatus(
    status: string,
    page: number = 1,
    perPage: number = 10
  ): Promise<ExpensesResponse> {
    const orgId = getOrgIdFromToken();
    if (!orgId) {
      throw new Error("Organization ID not found in token");
    }
    const response = await api.get(
      `/expenses/expenses?org_id=${orgId}&status=${status}&page=${page}&per_page=${perPage}`
    );
    return response.data;
  },

  async fetchAllExpenses(page: number = 1, perPage: number = 10) {
    const orgId = getOrgIdFromToken();
    if (!orgId) {
      throw new Error("Organization ID not found in token");
    }
    try {
      const response = await api.get(
        `/expenses/expenses?org_id=${orgId}&page=${page}&per_page=${perPage}`
      );
      return response.data;
    } catch (error) {
      console.log(error);
    }
  },

  async getExpenseById(id: string | number): Promise<Expense> {
    const response = await api.get(`/api/v1/expenses/spender?id=eq.${id}`);
    return  response.data.data?.[0];
  },

  async getFilteredExpenses({
    query,
    limit,
    offset,
    signal,
  }: {
    query: string;
    limit: number;
    offset: number;
    signal: AbortSignal;
  }) {
    try {
      return await api.get(`/api/v1/expenses/spender?${query}`, {
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

  async adminUpdateExpense({
    id,
    payload,
  }: {
    id: string;
    payload: UpdateExpenseData;
  }) {
    try {
      return await api.post(`/em/expenses/admin/update/${id}`, payload);
    } catch (error) {
      throw error;
    }
  },

  async getMyReports(
    limit: number = 1,
    offset: number = 20
  ): Promise<ReportsResponse> {
    try {
      const response = await api.get(
        `/reports/reports?limit=${limit}&offset=${offset}`
      );
      const reports = response.data.data || [];
      const pagination = {
        count: response.data.count,
        offset: response.data.offset,
      };

      return {
        reports,
        pagination,
      };
    } catch (error) {
      console.error("Error fetching reports:", error);
      return {
        reports: [],
        pagination: {
          count: 0,
          offset: 0,
        },
      };
    }
  },

  async getReportsByStatus(
    status: string,
    limit: number = 1,
    offset: number = 20
  ): Promise<ReportsResponse> {
    try {
      const response = await api.get(
        `/reports/reports?status=${status}&limit=${limit}&offset=${offset}`
      );

      const reports = response.data.data || [];
      const pagination = {
        count: response.data.count,
        offset: response.data.offset,
      };

      return {
        reports,
        pagination,
      };
    } catch (error) {
      console.error("Error fetching reports by status:", error);
      return {
        reports: [],
        pagination: {
          count: 0,
          offset: 0,
        },
      };
    }
  },

  async getAllPoliciesWithCategories(): Promise<Policy[]> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        console.warn("No org_id found, returning empty policies");
        return [];
      }

      const response = await api.get(
        `/api/v1/expense-policies?org_id=${orgId}`
      );
      return response.data.data;
    } catch (error) {
      console.error("Error fetching policies:", error);
      throw error;
    }
  },

  async getPoliciesWithCategories(): Promise<Policy[]> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        console.warn("No org_id found, returning empty policies");
        return [];
      }

      const allPolicies = await this.getAllPoliciesWithCategories();

      const filteredPolicies = allPolicies.filter((policy: Policy) => {
        const policyName = policy.name?.toLowerCase() || "";
        const policyDescription = policy.description?.toLowerCase() || "";
        const policyType = policy.policy_type?.toLowerCase() || "";

        const isPerdiemPolicy =
          policyName.includes("perdiem") ||
          policyName.includes("per diem") ||
          policyDescription.includes("perdiem") ||
          policyDescription.includes("per diem") ||
          policyType.includes("perdiem") ||
          policyType.includes("per_diem");

        const isMileagePolicy =
          policyName.includes("mileage") ||
          policyName.includes("mile") ||
          policyDescription.includes("mileage") ||
          policyDescription.includes("mile") ||
          policyType.includes("mileage") ||
          policyType.includes("mile");

        const hasPerdiemMileageCategories = policy.categories?.some(
          (category) => {
            const categoryName = category.name?.toLowerCase() || "";
            const categoryType = category.category_type?.toLowerCase() || "";
            return (
              categoryName.includes("perdiem") ||
              categoryName.includes("per diem") ||
              categoryName.includes("mileage") ||
              categoryName.includes("mile") ||
              categoryType.includes("perdiem") ||
              categoryType.includes("mileage")
            );
          }
        );

        return !(
          isPerdiemPolicy ||
          isMileagePolicy ||
          hasPerdiemMileageCategories
        );
      });
      return filteredPolicies;
    } catch (error) {
      console.error("Error fetching policies:", error);
      throw error;
    }
  },

  async getAllPolicies(): Promise<Policy[]> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        console.warn("No org_id found, returning empty policies");
        return [];
      }

      const allPolicies = await this.getAllPoliciesWithCategories();
      return allPolicies;
    } catch (error) {
      console.log(error);
      throw error;
    }
  },

  async calculatePerDiemAmount({
    orgId,
    policyId,
    categoryId,
    startDate,
    endDate,
  }: {
    orgId: number | undefined;
    policyId: string;
    categoryId: string;
    startDate: string;
    endDate: string;
  }): Promise<any> {
    try {
      const response = await api.get(
        `/em/expenses/calculate_per_diem?org_id=${orgId}&policy_id=${policyId}&category_id=${categoryId}&start_date=${startDate}&end_date=${endDate}`
      );
      return response.data;
    } catch (error: any) {
      console.log("Error calculating per diem amount", error);
      toast.error(error.response?.data?.message || error.message);
      throw error;
    }
  },

  async createExpense(
    expense: CreateExpenseData
  ): Promise<CreateExpenseResponse> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }
      const response = await api.post(
        `/em/expenses/create?org_id=${orgId}`,
        expense
      );

      return {
        success: response.data.status === "success",
        message: response.data.message,
        data: response.data.data,
        policy_validation: response.data.policy_validation,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating expense:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to create expense",
        validation_details: error.response?.data?.validation_details,
      };
    }
  },

  async updateExpense(id: string, expense: UpdateExpenseData): Promise<any> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }
      const response = await api.put(
        `/em/expenses/update/${id}?org_id=${orgId}`,
        expense
      );
      return response;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw error;
    }
  },

  async fetchReceiptPreview(receiptId: string, orgId: string) {
    try {
      const response = await api.get(
        `/receipts/${receiptId}/signed-url?org_id=${orgId}`
      );
      return response;
    } catch (error) {
      console.log(error);
      throw error;
    }
  },

  async validateExpense(expense_id: string) {
    try {
      return await api.post("/api/v1/validate_expense", { expense_id });
    } catch (error) {
      throw error;
    }
  },

  async getExpenseValidation(expense_id: string) {
    try {
      return await api.get(`/api/v1/validation_messages/expense/${expense_id}`);
    } catch (error) {
      throw error;
    }
  },

  async deleteExpense(
    id: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }
      const response = await api.delete(
        `/em/expenses/delete/${id}?org_id=${orgId}`
      );
      return {
        success: true,
        message: response.data.message || "Expense deleted successfully",
      };
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      throw error;
    }
  },

  async getExpenseComments(expenseId: string): Promise<ExpenseComment[]> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }
      const response = await api.get(
        `/api/v1/expense_comments?expense_id=${expenseId}&org_id=${orgId}`
      );
      return response.data.data || [];
    } catch (error: any) {
      console.error("Error fetching expense comments:", error);
      throw error;
    }
  },

  async postExpenseComment(
    expenseId: string,
    comment: string,
    notify: boolean = false
  ): Promise<ExpenseComment> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }
      const response = await api.post(
        `/api/v1/expense_comments`,
        JSON.stringify({
          expense_id: expenseId,
          comment: comment.trim(),
          notify: notify,
        })
      );
      // Return the created comment from response.data.data if available
      // Otherwise return a minimal comment object
      return (
        response.data.data || {
          id: "",
          expense_id: expenseId,
          comment: comment.trim(),
          creator_user_id: "",
          creator_user: {
            id: "",
            email: "",
            full_name: "",
          },
          created_at: format(new Date(), "yyyy-MM-dd"),
          updated_at: format(new Date(), "yyyy-MM-dd"),
          org_id: orgId,
        }
      );
    } catch (error: any) {
      console.error("Error posting expense comment:", error);
      throw error;
    }
  },

  async getUploadUrl (payload: { type: "INVOICES" | "RECEIPT"; name: string }) {
    try {
      return await api.post('/api/v1/files/create', payload)
    } catch (error) {
      throw error;
    }
  },

  async generatePreviewUrl(fileid: string) {
    try {
      return await api.post(`/api/v1/files/generate_upload_url?id=${fileid}`)
    } catch (error) {
      throw error;
    }
  },

  async getMileageRates() {
    try {
      return await api.get("/em/expenses/mileage_rates");
    } catch (error) {
      throw error;
    }
  },

  async getCurrencyConversionRate({
    date,
    from,
    to = "INR",
  }: {
    date: string;
    from: string;
    to?: string;
  }) {
    try {
      return await api.get(
        `/api/v1/currency/exchange_rate?date=${date}&from=${from}&to=${to}`
      );
    } catch (error) {
      throw error;
    }
  },
};
