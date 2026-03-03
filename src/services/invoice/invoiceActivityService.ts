import { baseAPI } from "@/lib/api";

export interface Approver {
  approved_at: string | null;
  approver_note: any[];
  email: string;
  first_name: string;
  last_name: string;
  user_id: string;
  username: string;
}

export interface ApprovalStep {
  approved_at: string | null;
  approver_note: any[];
  approvers: Approver[];
  status: string;
  step_id: string;
  step_name: string;
  step_order: number;
}

export interface ApprovalWorkflow {
  approval_steps: ApprovalStep[];
  completed_at: string | null;
  created_at: string;
  current_step: number;
  total_steps: number;
  workflow_execution_id: string;
  workflow_status: string;
}

export interface GetInvoiceApproversResponse {
  data: ApprovalWorkflow[];
}

export const invoiceActivityService = {
  async getApprovers(invoiceId: string): Promise<GetInvoiceApproversResponse> {
    const response = await baseAPI.get(`/v1/invoices/${invoiceId}/approvers`);
    const payload = response.data;
    // Some responses return { data: null, message: 'No workflow execution found' }
    // Normalize that to an empty data array so UI shows 'no activity' instead of an error.
    if (payload && (payload.data === null || payload.data === undefined)) {
      return { data: [] } as GetInvoiceApproversResponse;
    }
    return payload;
  },
};
