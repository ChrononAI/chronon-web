import api from '@/lib/api'

export interface WorkflowSequencePayload {
  step_order: number
  step_name: string
  relationship_type: 'DIRECT_RELATIONSHIP' | 'PARALLEL_RELATIONSHIP'
  approver_identifier?: string | null
  approval_strategy: string
  min_approvals_required: number
  timeout_hours: number
  entity_criteria?: Array<{
    field: string
    operator: string
    value: string
  }> | null
}

export interface WorkflowSequence {
  id: string
  workflow_config_id: string
  step_order: number
  step_name: string
  relationship_type: string
  approver_identifier: string | null
  approval_strategy: string
  min_approvals_required: number
  timeout_hours: number
  entity_criteria: Array<{
    field: string
    operator: string
    value: string
  }> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateWorkflowConfigPayload {
  name: string
  entity_type: string
  is_active: boolean
  sequences: WorkflowSequencePayload[]
}

export interface CreateWorkflowConfigResponse {
  data: {
    workflow_config: {
      id: string
      name: string
      entity_type: string
      is_active: boolean
      org_id: string
      created_by: string
      created_at: string
      updated_at: string
      config_data: any
    }
      sequences: WorkflowSequence[]
  }
  message: string
  status: string
}

export async function createWorkflowConfig(
  payload: CreateWorkflowConfigPayload
): Promise<CreateWorkflowConfigResponse> {
  const res = await api.post('/api/v1/workflows/configs', payload)
  return res.data
}

export interface WorkflowConfig {
  id: string
  name: string
  entity_type: string
  is_active: boolean
  org_id: string
  created_by: string
  created_at: string
  updated_at: string
  config_data: any
  sequences?: WorkflowSequence[]
}

export interface GetWorkflowsResponse {
  data: WorkflowConfig[]
  status: string
  message?: string
}

export async function getAllWorkflows(): Promise<WorkflowConfig[]> {
  const res = await api.get('/api/v1/workflows/configs')
  const data = res.data
  
  if (data?.status === 'success' && Array.isArray(data?.data)) {
    return data.data
  }
  
  if (Array.isArray(data?.data)) {
    return data.data
  }
  
  if (Array.isArray(data)) {
    return data
  }
  
  return []
}

export interface CreatePolicyPayload {
  name: string
  description: string
  policy_type: string
  workflow_config_id: string
  conditions: {
    rules: Array<{
      field: string
      operator: string
      value: string
    }>
    action: {
      type: string
    }
  }
  is_active: boolean
}

export interface CreatePolicyResponse {
  data?: any
  message?: string
  status?: string
}

export async function createPolicy(
  payload: CreatePolicyPayload
): Promise<CreatePolicyResponse> {
  const res = await api.post('/api/v1/policies', payload)
  return res.data
}

