import api from "@/lib/api";
import { toast } from "sonner";

export interface AdvanceType {
  id: string;
  title: string;
  description: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | string;
  sequence_number: string;
  org_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  created_by: {
    email: string;
    org_id: string;
    user_id: string;
  };
  updated_by: {
    email: string;
    org_id: string;
    user_id: string;
  };
}

interface CreateAdvancePayloadType {
    title: string;
    description: string;
    currency: string;
    amount: string;
    policy_id?: string;
}

export const AdvanceService = {
    getAllAdvances: async ({ page, perPage }: {
        page: number;
        perPage: number;
    }) => {
        try {
            return await api.get(`/api/v1/advances?page=${page}&per_page=${perPage}`)
        } catch (error) {
            console.log(error);
            return error
        }
    },

    getAdvancesByStatus: async ({ status, page, perPage }: {
        status: string;
        page: number;
        perPage: number;
    }) => {
        try {
            return await api.get(`/api/v1/advances?status=${status}&page=${page}&per_page=${perPage}`)
        } catch (error) {
            console.log(error);
            return error
        }
    },

    createAdvance: async (payload: CreateAdvancePayloadType) => {
        try {
            return await api.post('/api/v1/advances', payload);
        } catch (error) {
            console.log(error);
            toast.error('Error creating pre approval');
            return error
        }
    },

    submitAdvance: async (advance_id: string) => {
        try {
            return await api.post('/api/v1/advances/submit', {
                advance_id
            })
        } catch (error) {
            return error;
        }
    },

    getAdvanceById: async (id: string) => {
        try {
            return api.get(`/api/v1/advances?id=${id}`);
        } catch (error) {
            return error
        }
    },

    getAdvanceWorkflow: async (id: string) => {
        try {
            return await api.get(`/api/v1/advances/${id}/approvers`)
        } catch (error) {
            return error;
        }
    },

    getAdvanceToApprove: async () => {
        try {
            return await api.get('/api/v1/advances/approvers'); 
        } catch (error) {
            return error;
        }
    },

    getAdvanceToApproveByStatus: async (status: string) => {
        try {
            return await api.get(`/api/v1/advances/approvers?status=${status}`)
        } catch (error) {
            return error;
        }
    },

    processAdvance: async ({ id, action }: { id: string; action: string }) => {
        try {
            return await api.post(`/api/v1/advances/${id}/${action}`);
        } catch (error) {
            return error;
        }
    }
}