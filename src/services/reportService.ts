import api, { baseAPI } from "@/lib/api";
import { Expense } from "@/types/expense";
import { OrganizationMeta, CustomAttribute } from "@/types/report";

export interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  creater_id: number;
}

export interface TemplatesResponse {
  data: {
    templates: ReportTemplate[];
    pagination: {
      has_next: boolean;
      has_prev: boolean;
      page: number;
      pages: number;
      per_page: number;
      total: number;
    };
  };
  status: string;
}

export interface GeneratedReport {
  id: number;
  report_template_id: number;
  report_name: string;
  status: string;
  number_of_records: number;
  report_size: number;
  report_url: string;
  criteria: string;
  created_at: string | null;
  error: string | null;
  user_id: number;
}

export interface GeneratedReportsResponse {
  data: {
    reports: GeneratedReport[];
    total: number;
  };
  status: string;
}
import { getOrgIdFromToken } from "@/lib/jwtUtils";

export interface ReportJob {
  job_id: number;
  status: "pending" | "processing" | "completed" | "failed";
  file_name?: string;
  file_size?: number;
  created_at: string;
  downloaded_at: string | null;
  expires_at: string;
  estimated_completion?: string;
}

class ReportService {
  private pollingCallbacks = new Map<number, (report: ReportJob) => void>();

  // Generate a unique request ID for idempotency
  private generateRequestId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getUnassignedExpenses(): Promise<Expense[]> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }
      const response = await api.get(
        `/expenses/expenses?org_id=${orgId}&page=1&per_page=100`
      );

      if (response.data.data && Array.isArray(response.data.data)) {
        // Filter expenses: only show COMPLETE status and not assigned to any report
        const availableExpenses = response.data.data.filter(
          (expense: Expense) =>
            expense.status === "COMPLETE" && !expense.report_id
        );
        return availableExpenses;
      }

      console.log("No expenses found or invalid response structure");
      return [];
    } catch (error) {
      console.error("Error fetching unassigned expenses:", error);
      return [];
    }
  }

  async getOrganizationMeta(orgId: number): Promise<OrganizationMeta | null> {
    try {
      const response = await api.get(`/organizations/${orgId}/additional-meta`);

      if (response.data.success && response.data.data) {
        return response.data.data as OrganizationMeta;
      }

      return null;
    } catch (error) {
      console.error("Error fetching organization metadata:", error);
      return null;
    }
  }

  async getCustomAttributes(orgId: string): Promise<CustomAttribute[]> {
    try {
      const response = await api.get(
        `/reports/custom-attributes?org_id=${orgId}`
      );

      if (
        response.data.status === "success" &&
        response.data.data?.custom_attributes
      ) {
        return response.data.data.custom_attributes as CustomAttribute[];
      }

      return [];
    } catch (error) {
      console.error("Error fetching custom attributes:", error);
      return [];
    }
  }

  async generateReport(data: {
    name: string;
    from_date: string;
    to_date: string;
    format: "excel" | "csv";
  }) {
    try {
      // Generate a unique request ID for idempotency
      const requestId = this.generateRequestId();

      const response = await baseAPI.post(
        "/reports/expenses/generate",
        {
          name: data.name,
          fromDate: data.from_date,
          toDate: data.to_date,
          format: data.format,
          filters: {},
        },
        {
          headers: {
            "X-Request-ID": requestId,
          },
        }
      );

      return {
        success: true,
        jobId: response.data.jobId,
        status: response.data.status,
        message: response.data.message,
        requestId,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error generating report:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to generate report",
        error: error,
      };
    }
  }

  async getReportStatus(jobId: number) {
    try {
      const response = await baseAPI.get(`/reports/jobs/${jobId}`);
      return {
        success: true,
        status: response.data.status,
        fileName: response.data.file_name,
        estimatedCompletion: response.data.estimated_completion,
        data: response.data,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error getting report status:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to get report status",
        error: error,
      };
    }
  }

  // Background polling methods
  startBackgroundPolling(
    jobId: number,
    callback: (report: ReportJob) => void
  ): void {
    this.pollingCallbacks.set(jobId, callback);
    this.pollReportStatus(jobId);
  }

  stopBackgroundPolling(jobId: number): void {
    this.pollingCallbacks.delete(jobId);
  }

  private async pollReportStatus(jobId: number): Promise<void> {
    try {
      const statusResponse = await this.getReportStatus(jobId);
      const callback = this.pollingCallbacks.get(jobId);

      if (!callback) {
        // Polling was stopped, exit
        return;
      }

      if (statusResponse.success) {
        const reportJob: ReportJob = {
          job_id: jobId,
          status: statusResponse.status as
            | "pending"
            | "processing"
            | "completed"
            | "failed",
          file_name: statusResponse.fileName,
          estimated_completion: statusResponse.estimatedCompletion,
          created_at: statusResponse.data?.created_at || "",
          downloaded_at: statusResponse.data?.downloaded_at || null,
          expires_at: statusResponse.data?.expires_at || "",
          file_size: statusResponse.data?.file_size,
        };

        // Call the callback with the report data
        callback(reportJob);

        // If report is still processing, continue polling
        if (
          statusResponse.status === "pending" ||
          statusResponse.status === "processing"
        ) {
          setTimeout(() => this.pollReportStatus(jobId), 5000); // Poll every 5 seconds
        } else {
          // Report completed or failed, stop polling
          this.stopBackgroundPolling(jobId);
        }
      } else {
        // Error getting status, stop polling
        this.stopBackgroundPolling(jobId);
      }
    } catch (error) {
      console.error("Error polling report status:", error);
      this.stopBackgroundPolling(jobId);
    }
  }

  async listUserReports(
    params: {
      status?: string;
      downloaded?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      const response = await baseAPI.get("/reports/jobs", { params });
      return {
        success: true,
        jobs: response.data.jobs,
        total: response.data.total,
        hasMore: response.data.hasMore,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error listing user reports:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to list user reports",
        error: error,
      };
    }
  }

  async downloadReport(jobId: string) {
    try {
      const response = await baseAPI.get(`/reports/jobs/${jobId}/download`);

      // Check if we got the expected response format
      if (response.data.downloadUrl && response.data.fileName) {
        // Create a download link using the S3 URL
        const link = document.createElement("a");
        link.href = response.data.downloadUrl;
        link.setAttribute("download", response.data.fileName);
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        link.remove();

        return {
          success: true,
          message: response.data.message || "Download started successfully",
        };
      } else {
        return {
          success: false,
          message: "Invalid response format from download endpoint",
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error downloading report:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to download report",
        error: error,
      };
    }
  }

  // Report Generation Methods
  async createReport(report: {
    reportName: string;
    description: string;
    additionalFields: Record<string, string>;
    customAttributes: Record<string, string>;
    expenseIds: string[];
  }): Promise<{ success: boolean; message: string; reportId?: string }> {
    try {
      const requestBody = {
        title: report.reportName,
        description: report.description,
        org_id: getOrgIdFromToken() || "5",
        expense_ids: report.expenseIds || [],
        custom_attributes: report.customAttributes,
      };

      const response = await api.post("/reports/reports", requestBody);
      console.log("Report creation response:", response.data);

      if (response.data.status === "success") {
        return {
          success: true,
          message: response.data.message || "Report created successfully!",
          reportId: response.data.data?.id,
        };
      }

      return {
        success: false,
        message: "Failed to create report. Please try again.",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating report:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to create report",
      };
    }
  }

  // New methods for enhanced report API
  async getReportWithExpenses(reportId: string): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    try {
      const response = await api.get(`/reports/reports/${reportId}`);
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Error fetching report with expenses:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch report details",
      };
    }
  }

  async getReportApprovalWorkflow(reportId: string): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    try {
      const response = await api.get(`/reports/reports/${reportId}/approvers`);
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Error fetching report approval workflow:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch approval workflow",
      };
    }
  }

  async submitReport(
    reportId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/reports/reports/${reportId}/submit`);
      return {
        success: true,
        message: response.data.message || "Report submitted successfully",
      };
    } catch (error: any) {
      console.error("Error submitting report:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to submit report",
      };
    }
  }

  async getReportTemplates(): Promise<{
    success: boolean;
    data?: ReportTemplate[];
    total?: number;
    message?: string;
  }> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }

      const response = await api.get(`/reports/templates?org_id=${orgId}`);
      return {
        success: true,
        data: response.data.data.templates,
        total: response.data.data.pagination.total,
      };
    } catch (error: any) {
      console.error("Error fetching report templates:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch report templates",
      };
    }
  }

  async generateReportWithTemplate(data: {
    report_template_id: number;
    start_date: string;
    end_date: string;
    report_name: string;
  }): Promise<{
    success: boolean;
    data?: {
      download_url: string;
      filename: string;
      file_size: number;
      records_count: number;
      report_id: number;
    };
    message?: string;
  }> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }

      const response = await api.post("/reports/generate", {
        org_id: parseInt(orgId),
        report_template_id: data.report_template_id,
        criteria: {
          start_date: data.start_date,
          end_date: data.end_date,
        },
        report_name: data.report_name,
      });

      if (response.data.status === "success") {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message,
        };
      }

      return {
        success: false,
        message: "Failed to generate report",
      };
    } catch (error: any) {
      console.error("Error generating report with template:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to generate report",
      };
    }
  }

  async getGeneratedReports(): Promise<{
    success: boolean;
    data?: GeneratedReport[];
    total?: number;
    message?: string;
  }> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }

      const response = await api.get(`/reports/generated?org_id=${orgId}`);

      if (response.data.status === "success") {
        return {
          success: true,
          data: response.data.data.reports,
          total: response.data.data.total,
        };
      }

      return {
        success: false,
        message: "Failed to fetch generated reports",
      };
    } catch (error: any) {
      console.error("Error fetching generated reports:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch generated reports",
      };
    }
  }

  async downloadGeneratedReport(id: number): Promise<void> {
    try {
      const res = await api.get(`/reports/${id}/signed_url`);
      console.log(res);

      // Using window.open is more reliable than creating an <a> tag for cross-origin URLs
      window.open(res.data.data.signed_url, "_blank");
    } catch (error) {
      console.error("Error downloading report:", error);
      throw error;
    }
  }

  async updateReport(
    reportId: string,
    updateData: {
      title?: string;
      description?: string;
      custom_attributes?: Record<string, string>;
      expense_ids?: string[];
    }
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await api.put(
        `/reports/reports/${reportId}`,
        updateData
      );

      return {
        success: response.data.status === "success",
        message: response.data.message || "Report updated successfully",
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Error updating report:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update report",
      };
    }
  }

  async addExpensesToReport(
    reportId: string,
    expenseIds: string[]
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await api.post(`/reports/reports/${reportId}/expenses`, {
        expense_ids: expenseIds,
      });

      return {
        success: response.data.status === "success",
        message:
          response.data.message || "Expenses added to report successfully",
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Error adding expenses to report:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to add expenses to report",
      };
    }
  }

  async removeExpensesFromReport(
    reportId: string,
    expenseIds: string[]
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await api.delete(
        `/reports/reports/${reportId}/expenses`,
        {
          data: {
            expense_ids: expenseIds,
          },
        }
      );

      return {
        success: response.data.status === "success",
        message:
          response.data.message || "Expenses removed from report successfully",
        data: response.data.data,
      };
    } catch (error: any) {
      console.error("Error removing expenses from report:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to remove expenses from report",
      };
    }
  }

  async deleteReport(
    reportId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/reports/reports/${reportId}`);

      return {
        success: response.data.status === "success",
        message: response.data.message || "Report deleted successfully",
      };
    } catch (error: any) {
      console.error("Error deleting report:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete report",
      };
    }
  }
}

export const reportService = new ReportService();
