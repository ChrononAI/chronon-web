import api from '@/lib/api'

export interface UpdateEntityAttribute {
  id?: string
  value: string
  is_active: boolean
  display_value: string
  account_code?: string
  metadata?: Record<string, string>
}

export interface CreateEntityPayload {
  name: string
  description?: string
  display_name?: string
  status: string
  is_active: boolean
  attributes?: UpdateEntityAttribute[]
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
  category_ids?: string[]
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

export interface CreateAttributeInput {
  value: string
  is_active: boolean
  display_value: string
  account_code?: string
  metadata?: Record<string, string>
}

export interface CreateAttributesPayload {
  entity_id: string
  attributes: CreateAttributeInput[]
}

export async function createAttributes(payload: CreateAttributesPayload) {
  const res = await api.post('/api/v1/entities/attributes', payload)
  return res.data
}

export async function getEntityById(entityId: string): Promise<Entity | null> {
  try {
    const res = await api.get(`/api/v1/entities/${entityId}`)
    const data = res.data
    
    if (data?.data) {
      return data.data
    }
    return null
  } catch (error) {
    console.error('Failed to get entity by ID:', error)
    return null
  }
}

export interface UpdateEntityPayload {
  name: string
  description?: string
  display_name?: string
  status: string
  is_active: boolean
  attributes?: UpdateEntityAttribute[]
}

export async function updateEntity(entityId: string, payload: UpdateEntityPayload) {
  const res = await api.put(`/api/v1/entities/${entityId}`, payload)
  return res.data
}


export default { createEntity, getEntities, createAttributes, getEntityById, updateEntity }
