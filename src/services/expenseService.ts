import api from "@/lib/api";
import {
  Expense,
  Report,
  Advance,
  ExpensesResponse,
  ReportsResponse,
  Policy,
} from "@/types/expense";
import { getOrgIdFromToken } from "@/lib/jwtUtils";
import { toast } from "sonner";

export interface CreateExpenseData {
  amount: number;
  category_id: string;
  description: string;
  expense_date: string;
  expense_policy_id: string;
  vendor: string;
  receipt_id?: string;
  invoice_number?: string | null;
}

export interface UpdateExpenseData {
  amount?: string | number;
  category_id: string;
  description: string;
  expense_date: string;
  expense_policy_id: string;
  vendor?: string;
  receipt_id?: string | null;
  invoice_number?: string | null;
  distance?: number | string | null;
  distance_unit?: string | null;
  end_location?: string | null;
  start_location?: string | null;
  vehicle_type?: string | null;
  mileage_meta?: any;
  custom_attributes?: any;
  is_round_trip?: boolean;
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
  async getMyExpenses(
    page: number = 4,
    perPage: number = 1
  ): Promise<ExpensesResponse> {
    const orgId = getOrgIdFromToken();
    if (!orgId) {
      throw new Error("Organization ID not found in token");
    }
    const response = await api.get(
      `/expenses/expenses?org_id=${orgId}&page=${page}&per_page=${perPage}`
    );
    return response.data;
  },

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

  async fetchAllExpenses(
    page: number = 1,
    perPage: number = 10) {
    const orgId = getOrgIdFromToken();
    if (!orgId) {
      throw new Error("Organization ID not found in token");
    }
    try {
      const response = await api.get(`/expenses/expenses?org_id=${orgId}&page=${page}&per_page=${perPage}`)
      return response.data
    } catch (error) {
      console.log(error);
    }
  },

  async getExpenseById(id: string | number): Promise<Expense> {
    const response = await api.get(`/expenses/${id}`);
    return response.data.data;
  },

  async getMyReports(
    page: number = 1,
    perPage: number = 20
  ): Promise<ReportsResponse> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }
      const response = await api.get(
        `/reports/reports?org_id=${orgId}&page=${page}&per_page=${perPage}`
      );

      const reports = response.data.data.data || [];
      const pagination = response.data.data.pagination || {
        has_next: false,
        has_prev: false,
        page: 1,
        pages: 0,
        per_page: 20,
        total: 0,
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
          has_next: false,
          has_prev: false,
          page: 1,
          pages: 0,
          per_page: 20,
          total: 0,
        },
      };
    }
  },

  async getReportsByStatus(
    status: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<ReportsResponse> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }
      const response = await api.get(
        `/reports/reports?org_id=${orgId}&status=${status}&page=${page}&per_page=${perPage}`
      );

      const reports = response.data.data.data || [];
      const pagination = response.data.data.pagination || {
        has_next: false,
        has_prev: false,
        page: 1,
        pages: 0,
        per_page: 20,
        total: 0,
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
          has_next: false,
          has_prev: false,
          page: 1,
          pages: 0,
          per_page: 20,
          total: 0,
        },
      };
    }
  },

  async getReportById(id: number): Promise<Report> {
    const response = await api.get(`/reports/reports/${id}`);
    return response.data.data;
  },

  async getMyAdvances(): Promise<Advance[]> {
    try {
      // Fetch advances with different statuses
      const [pendingResponse, approvedResponse] = await Promise.all([
        api.get("/advance/status/PENDING_APPROVAL"),
        api.get("/advance/status/APPROVED"),
      ]);

      const pendingAdvances = pendingResponse.data.success
        ? pendingResponse.data.data
        : [];
      const approvedAdvances = approvedResponse.data.success
        ? approvedResponse.data.data
        : [];

      // Combine all advances
      return [...pendingAdvances, ...approvedAdvances];
    } catch (error) {
      console.error("Error fetching advances:", error);
      return [];
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
      return [];
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
      return [];
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
      toast.error(error.response?.data?.message || error.message)
      return {
        success: false,
        message:
          error?.response?.data?.message ||
          error.message ||
          "Failed to create advance request",
      };
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

  async createAdvance(
    advance: CreateAdvanceData
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post("/advance", advance);

      return {
        success: response.data.success,
        message:
          response.data.message ||
          (response.data.success
            ? "Advance request created successfully"
            : "Failed to create advance request"),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating advance:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to create advance request",
      };
    }
  },

  async updateExpense(
    id: string,
    expense: UpdateExpenseData
  ): Promise<CreateExpenseResponse> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }
      const response = await api.put(
        `/em/expenses/update/${id}?org_id=${orgId}`,
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
      console.error("Error updating expense:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to update expense",
        validation_details: error.response?.data?.validation_details,
      };
    }
  },

  async fetchReceiptPreview(receiptId: string, orgId: string) {
    try {
      const response = await api.get(`/receipts/${receiptId}/signed-url?org_id=${orgId}`);
      return response;
    } catch (error) {
      console.log(error);
      return error;
    }
  }
};
