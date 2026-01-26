import api from '@/lib/api';
import { Report } from '@/types/expense';
import { getOrgIdFromToken } from '@/lib/jwtUtils';
import { AxiosResponse } from 'axios';

// Helper function to handle API responses
const handleApiResponse = async (response: AxiosResponse) => {
  return await response.data;
};

export const approvalService = {

  async getAllReports(limit: number, offset: number) {
  try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error('Organization ID not found in token');
      }
      const response = await api.get(`/reports/approvers/reports?status=APPROVED,REJECTED,IN_PROGRESS,SENT_BACK&limit=${limit}&offset=${offset}`);
      return response;
    } catch (error) {
      console.error(`Error fetching reports with status ${status}:`, error);
      throw error;
    }
  },

  async getReportsByStatus(limit: number, offset: number, status: string) {
    try {
      const response = await api.get(`/reports/approvers/reports?status=${status}&limit=${limit}&offset=${offset}`);
      return response;
    } catch (error) {
      console.error(`Error fetching reports with status ${status}:`, error);
      throw error;
    }
  },

  async getReportById(reportId: number): Promise<Report> {
    const response = await api.get(`/expense-reports/${reportId}`);
    return response.data.data;
  },

  async approveReport(reportId: string, comments: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/reports/reports/${reportId}/action`, JSON.stringify({
        action: 'approve',
        approval_notes: comments
      }))
      
      const result = await handleApiResponse(response);
      return {
        success: result.status === 'success',
        message: result.message
      };
    } catch (error) {
      console.error('Error approving report:', error);
      throw error;
    }
  },

  async rejectReport(reportId: string, comments: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/reports/reports/${reportId}/action`, JSON.stringify({
        action: 'reject',
        approval_notes: comments
      }))
      
      const result = await handleApiResponse(response);
      return {
        success: result.status === 'success',
        message: result.message
      };
    } catch (error) {
      console.error('Error rejecting report:', error);
      throw error;
    }
  },

  async sendBackReport(reportId: string, comments: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/reports/reports/${reportId}/action`, JSON.stringify({
        action: 'send_back',
        approval_notes: comments
      }))
      
      const result = await handleApiResponse(response);
      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      console.error('Error sending report back to draft:', error);
      throw error;
    }
  },

  async adminReportAction({ reportId, reason, action } : { reportId: string; reason: string; action: "approve" | "reject" | "send_back" }):
    Promise<{
      success: boolean;
      message: string
    }> {
    try {
      const response = await api.post(`/api/v1/reports/admin/${reportId}/action`, JSON.stringify({
        action,
        reason
      }))
      const result = await handleApiResponse(response);
      return {
        success: true,
        message: result.data.message
      };
    } catch (error) {
      throw error;
    }
  },

  async approveExpense(expenseId: number, comments?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/user-approvals/approve`, JSON.stringify({
        expenseId,
        approval_notes: comments
      }))
      
      const result = await handleApiResponse(response);
      
      return {
        success: result.success,
        message: result.message || 'Expense approved successfully'
      };
    } catch (error: unknown) {
      console.error('Error approving expense:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve expense'
      };
    }
  },

  async rejectExpense(expenseId: number, comments: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/user-approvals/reject`, JSON.stringify({
        expenseId,
        approval_notes: comments
      }))
      
      const result = await handleApiResponse(response);
      
      return {
        success: result.success,
        message: result.message || 'Expense rejected successfully'
      };
    } catch (error: unknown) {
      console.error('Error rejecting expense:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject expense'
      };
    }
  },

  async exportReports(reportIds: string[], includeReceipts: boolean = true): Promise<{ success: boolean; data: any }> {
    try {
      // Format report IDs for query params: id=in.(rptWPG3ivJV8I, rpttBHVeRVo9v)
      const queryParams = `id=in.(${reportIds.join(', ')})`;
      
      const response = await api.post('/api/v1/report_exports', {
        query_params: queryParams,
        config: {
          type: 'pdf',
          include_receipts: includeReceipts
        }
      });
      
      const result = await handleApiResponse(response);
      return {
        success: true,
        data: result.data
      };
    } catch (error: unknown) {
      console.error('Error exporting reports:', error);
      throw error;
    }
  },
};