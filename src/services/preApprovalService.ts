import api from "@/lib/api";
import { CurrencyConversionPayload } from "@/pages/ProcessPreApprovalPage";
import { toast } from "sonner";

export interface PreApprovalType {
    id: string;
    title: string;
    description: string;
    start_date: string;   // or Date, if you parse it
    end_date: string;     // or Date
    sequence_number: string;
    status: string;       // or an enum (see below)
    policy_id: string;
    org_id: string;
    user_id: string;
    is_active: boolean;
    created_at: string;   // ISO date string
    updated_at: string;   // ISO date string
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

interface CreatePreApprovalPayloadType {
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    policy_id: string;
}

export const preApprovalService = {
    getAllPreApprovals: async ({ page, perPage }: {
        page: number;
        perPage: number;
    }) => {
        try {
            return await api.get(`/api/v1/pre_approvals?page=${page}&per_page=${perPage}`)
        } catch (error) {
            console.log(error);
            return error
        }
    },

    getPreApprovalsByStatus: async ({ status, page, perPage }: {
        status: string;
        page: number;
        perPage: number;
    }) => {
        try {
            return await api.get(`/api/v1/pre_approvals?status=${status}&page=${page}&per_page=${perPage}`);
        } catch (error) {
            return error;
        }
    },

    createPreApproval: async (payload: CreatePreApprovalPayloadType) => {
        try {
            return await api.post('/api/v1/pre_approvals', payload);
        } catch (error) {
            console.log(error);
            toast.error('Error creating pre approval');
            return error
        }
    },

    submitPreApproval: async (pre_approval_id: string) => {
        try {
            return await api.post('/api/v1/pre_approvals/submit', {
                pre_approval_id
            })
        } catch (error) {
            return error;
        }
    },

    getPreApprovalById: async (id: string) => {
        try {
            return api.get(`/api/v1/pre_approvals?id=${id}`);
        } catch (error) {
            return error
        }
    },

    getPreApprovalWorkflow: async (id: string) => {
        try {
            return await api.get(`/api/v1/pre_approvals/${id}/approvers`)
        } catch (error) {
            return error;
        }
    },

    getPreApprovalToApprove: async () => {
        try {
            return await api.get('/api/v1/pre_approvals/approvers');
        } catch (error) {
            return error;
        }
    },

    getPreApprovalToApproveByStatus: async (status: string) => {
        try {
            return await api.get(`/api/v1/pre_approvals/approvers?status=${status}`)
        } catch (error) {
            return error;
        }
    },

    processPreApproval: async ({ id, action, payload }: { id: string; action: string; payload?: CurrencyConversionPayload }) => {
        try {
            const url = `/api/v1/pre_approvals/${id}/${action}`;

            const response = payload
                ? await api.post(url, payload)
                : await api.post(url);

            return response;
        } catch (error) {
            return error;
        }
    }
}