import api from "@/lib/api";
import { CurrencyConversionPayload, CurrencyConversionRate } from "@/pages/ProcessPreApprovalPage";
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
    currency_conversion_rates?: CurrencyConversionRate[];
}

interface CreatePreApprovalPayloadType {
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    policy_id?: string;
}

export const preApprovalService = {
fetchAllPreApprovals: async () => {
        try {
            return await api.get("/api/v1/pre_approvals")
        } catch (error) {
            console.log(error);
            throw error
        }
    },

    getAllPreApprovals: async ({ page, perPage }: {
        page: number;
        perPage: number;
    }) => {
        try {
            return await api.get(`/api/v1/pre_approvals?page=${page}&per_page=${perPage}`)
        } catch (error) {
            console.log(error);
            throw error
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
            throw error;
        }
    },

    getAllPreApprovalByStatus: async (status: string) => {
        try {
            return await api.get(`/api/v1/pre_approvals?status=${status}`);
        } catch (error) {
            throw error;
        }
    },

    createPreApproval: async (payload: CreatePreApprovalPayloadType) => {
        try {
            return await api.post('/api/v1/pre_approvals', payload);
        } catch (error) {
            console.log(error);
            toast.error('Error creating pre approval');
            throw error
        }
    },

    submitPreApproval: async (pre_approval_id: string) => {
        try {
            return await api.post('/api/v1/pre_approvals/submit', {
                pre_approval_id
            })
        } catch (error) {
            throw error;
        }
    },

    getPreApprovalById: async (id: string) => {
        try {
            return api.get(`/api/v1/pre_approvals?id=${id}`);
        } catch (error) {
            throw error
        }
    },

    getPreApprovalWorkflow: async (id: string) => {
        try {
            return await api.get(`/api/v1/pre_approvals/${id}/approvers`)
        } catch (error) {
            throw error;
        }
    },

    getPreApprovalToApprove: async ({ page, perPage }: { page: number; perPage: number }) => {
        try {
            return await api.get(`/api/v1/pre_approvals/approvers?page=${page}&per_page=${perPage}`);
        } catch (error) {
            throw error;
        }
    },

    getPreApprovalToApproveByStatus: async ({ page, perPage, status }: { page: number; perPage: number; status: string }) => {
        try {
            return await api.get(`/api/v1/pre_approvals/approvers?status=${status}&page=${page}&per_page=${perPage}`)
        } catch (error) {
            throw error;
        }
    },

    processPreApproval: async ({ id, action, payload }: { id: string; action: string; payload?: CurrencyConversionPayload }) => {
        try {
            const url = `/api/v1/pre_approvals/${id}/${action}`;
            const response = payload
                ? await api.post(url, payload)
                : await api.post(url, {});

            return response;
        } catch (error) {
            throw error;
        }
    }
}