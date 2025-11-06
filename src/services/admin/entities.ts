import api from '@/lib/api'

export interface CreateEntityPayload {
  name: string
  description?: string
  display_name?: string
  status: string
  is_active: boolean
}

export async function createEntity(payload: CreateEntityPayload) {
  const res = await api.post('/api/v1/entities', payload)
  return res.data
}

export interface EntityAttribute {
  id: string
  display_value: string
  value: string
  is_active: boolean
}

export interface Entity {
  id: string
  name: string
  display_name?: string
  description?: string
  status?: string
  is_active?: boolean
  type?: string
  attributes?: EntityAttribute[]
}

export async function getEntities(): Promise<Entity[]> {
  const res = await api.get('/api/v1/entities')
  const data = res.data
  
  if (Array.isArray(data?.data)) {
    return data.data
  }
  
  if (Array.isArray(data)) {
    return data
  }
  
  return []
}

export interface CreateAttributesPayload {
  entity_id: string
  attributes: {
    value: string
    is_active: boolean
    display_value: string
  }[]
}

export async function createAttributes(payload: CreateAttributesPayload) {
  const res = await api.post('/api/v1/entities/attributes', payload)
  return res.data
}


export default { createEntity, getEntities, createAttributes }
