import api from '@/lib/api';
import { Report } from '@/types/expense';
import { getOrgIdFromToken } from '@/lib/jwtUtils';
import { AxiosResponse } from 'axios';

// Helper function to handle API responses
const handleApiResponse = async (response: AxiosResponse) => {
  return await response.data;
};

export const approvalService = {

  async getAllReports(page: number, perPage: number) {
  try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error('Organization ID not found in token');
      }
      const response = await api.get(`/reports/approvers/reports?org_id=${orgId}&status=APPROVED,REJECTED,IN_PROGRESS&page=${page}&per_page=${perPage}`);
      // const reports = response.data.data.data || [];
      return response.data.data
    } catch (error) {
      console.error(`Error fetching reports with status ${status}:`, error);
    }
  },

  async getReportsByStatus(page: number, perPage: number, status: string) {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error('Organization ID not found in token');
      }
      const response = await api.get(`/reports/approvers/reports?org_id=${orgId}&status=${status}&page=${page}&per_page=${perPage}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching reports with status ${status}:`, error);
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
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve report'
      };
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
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject report'
      };
    }
  },

  async draftBackReport(reportId: string, comments: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/reports/reports/${reportId}/action`, JSON.stringify({
        action: 'draft_back',
        approval_notes: comments
      }))
      
      const result = await handleApiResponse(response);
      return {
        success: result.status === 'success',
        message: result.message
      };
    } catch (error) {
      console.error('Error sending report back to draft:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send report back to draft'
      };
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
};