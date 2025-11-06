import api from '@/lib/api'

export interface Template {
  id: string
  module_type: string
  entities?: Array<{
    entity_id?: string
    id?: string
    display_name?: string
    field_name?: string
    description?: string
    is_mandatory?: boolean
    field_type?: string
  }>
  org_id?: string
}

export async function getTemplates(): Promise<Template[]> {
  const res = await api.get('/api/v1/templates')
  const data = res.data
  
  if (Array.isArray(data)) {
    return data
  }
  
  if (data?.data && Array.isArray(data.data)) {
    return data.data
  }
  
  return []
}

export async function assignEntity(payload: { module_template_id: string; entity_id: string; is_mandatory: boolean }) {
  const res = await api.post('/api/v1/templates/assign_entity', payload)
  return res.data
}

export default { getTemplates, assignEntity }
