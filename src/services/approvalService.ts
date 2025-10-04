import api from '@/lib/api';
import { Report } from '@/types/expense';
import { getOrgIdFromToken } from '@/lib/jwtUtils';

const API_BASE_URL = 'https://staging-api.chronon.com.chronon.co.in';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth-storage');
  if (token) {
    const authData = JSON.parse(token);
    return {
      'Content-Type': 'application/json',
      'Authorization': authData.state.token ? `Bearer ${authData.state.token}` : ''
    };
  }
  return {
    'Content-Type': 'application/json',
    // Remove Authorization key entirely if not present
  } as Record<string, string>;
};

// Helper function to handle API responses
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

export const approvalService = {

  async getReportsByStatus(status: string): Promise<Report[]> {
    try {
      const orgId = getOrgIdFromToken();
      if (!orgId) {
        throw new Error('Organization ID not found in token');
      }
      const response = await api.get(`/reports/approvers/reports?org_id=${orgId}&status=${status}`);
      const reports = response.data.data.data || [];
      return Array.isArray(reports) ? reports : [];
    } catch (error) {
      console.error(`Error fetching reports with status ${status}:`, error);
      return [];
    }
  },

  async getReportById(reportId: number): Promise<Report> {
    const response = await api.get(`/expense-reports/${reportId}`);
    return response.data.data;
  },

  async approveReport(reportId: string, comments: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/reports/${reportId}/action`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'approve',
          approval_notes: comments
        }),
      });
      
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
      const response = await fetch(`${API_BASE_URL}/reports/reports/${reportId}/action`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'reject',
          approval_notes: comments
        }),
      });
      
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
      const response = await fetch(`${API_BASE_URL}/reports/reports/${reportId}/action`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'draft_back',
          approval_notes: comments
        }),
      });
      
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
      const response = await fetch(`${API_BASE_URL}/user-approvals/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          expenseId: expenseId,
          comments: comments || 'Approved'
        }),
      });
      
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
      const response = await fetch(`${API_BASE_URL}/user-approvals/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          expenseId: expenseId,
          comments: comments
        }),
      });
      
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