export interface Expense {
  id: string;
  amount: number;
  category: string;
  category_id: string;
  expense_policy_id: string;
  created_at: string;
  created_by: {
    email: string;
    org_id: string;
    user_id: string;
  };
  description: string;
  expense_date: string;
  expense_type: string;
  invoice_number: string | null;
  policy: {
    annual_limit: string | null;
    auto_approve_under_amount: string | null;
    created_at: string;
    created_by: string;
    daily_limit: string;
    description: string;
    id: string;
    monthly_limit: string | null;
    name: string;
    org_id: string;
    policy_type: "APPROVAL" | string; // could narrow if enum known
    requires_receipt: boolean;
    status: "ACTIVE" | "INACTIVE" | string;
    updated_at: string;
    workflow_config_id: string | null;
  };
  receipt_id: string | null;
  report_id: string | null;
  is_round_trip: boolean;
  status: string;
  sequence_number: string;
  store_id: string | null;
  updated_at: string;
  vendor: string;
  // Mileage-specific fields
  distance?: number | string;
  distance_unit?: string;
  start_location?: string;
  end_location?: string;
  vehicle_type?: "FOUR_WHEELERS" | "TWO_WHEELERS" | "PUBLIC_TRANSPORT";
  mileage_meta?: {
    trip_purpose?: string;
    notes?: string;
  };
  // Per diem-specific fields
  location?: string;
  start_date?: string;
  end_date?: string;
  per_diem_info?: {
    start_date: string;
    end_date: string;
    location: string;
  };
}

export interface PaginationMeta {
  has_next: boolean;
  has_prev: boolean;
  page: number;
  pages: number;
  per_page: number;
  total: number;
}

export interface ExpensesResponse {
  data: Expense[];
  pagination: PaginationMeta;
}

export interface WorkflowStatus {
  id: number;
  workflowId: number;
  workflowName: string | null;
  workflowDescription: string | null;
  expenseId: number;
  approvedOn: string | null;
  approvedBy: number | null;
  approverName: string | null;
  status: string;
  sequence: number;
  comments: string | null;
  approverTreeNodeId: number;
  approverTreeNodeName: string;
  isLastInChain: boolean | null;
  nextWorkflowId: number | null;
  nextWorkflowName: string | null;
  createdAt: number[];
  updatedAt: number[];
}

export interface Report {
  id: string;
  title: string;
  description: string;
  expense_count : number | null;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  created_by: {
    email: string;
    org_id: string;
    user_id: string;
  };
  org_id: string;
  total_amount: number;
  approval_notes: string | null;
  approved_at: string | null;
  notes: string | null;
  custom_attributes?: Record<string, string>; // Custom attributes from API
  expenses?: Expense[]; // Embedded expenses from new API
}

export interface ReportWithExpenses extends Report {
  expenses: Expense[];
}

export interface ApprovalWorkflow {
  report_id: string;
  workflow_execution_id: string;
  workflow_status: string;
  current_step: number;
  total_steps: number;
  approval_steps: ApprovalStep[];
}

export interface ApprovalStep {
  approved_at: string | null;
  approver_note: { notes: string | null; status: string; approver_id: string; timestamp: string }[];
  step_id: string;
  step_name: string;
  step_order: number;
  status: string;
  approvers: Approver[];
}

export interface Approver {
  user_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface ReportsResponse {
  reports: Report[];
  pagination: PaginationMeta;
}

export interface DownloadReport {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  fileName?: string;
  fileSize?: number;
  createdAt: string;
  downloadedAt: string | null;
  expiresAt: string;
  reportName: string;
}

export interface Advance {
  id: number;
  currency: string;
  amount: number;
  status: string;
  description: string;
  createdBy: number;
  orgUserId: number;
  createdOn: number[];
  updatedAt: number[];
}
export interface Policy {
  id: string;
  name: string;
  description: string;
  status: string;
  policy_type: string;
  requires_approval: boolean;
  requires_receipt: boolean;
  requires_justification: boolean;
  daily_limit: number | null;
  monthly_limit: number | null;
  annual_limit: number | null;
  max_amount: number | null;
  min_amount: number | null;
  auto_approve_under_amount: number | null;
  max_approvers: number | null;
  is_cumulative: boolean;
  effective_from: string | null;
  effective_until: string | null;
  notes: string | null;
  workflow_config_id: string | null;
  org_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  categories: PolicyCategory[];
}

export interface PolicyCategory {
  id: string;
  name: string;
  description: string;
  category_type: string;
  is_active: boolean;
  org_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}