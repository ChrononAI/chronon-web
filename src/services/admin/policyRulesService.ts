import api from "@/lib/api";

export const policyRulesService = {
    async getPolicyRules() {
        try {
            const res = await api.get('/api/v1/expense_policy_rules');
            return res;
        } catch (error) {
            throw error;
        }
    },

    async createPolicyRule(payload: any) {
        try {
            const res = await api.post('/api/v1/expense_policy_rules', payload)
            return res;
        } catch (error) {
            throw error;
        }
    },

    async updatePolicyRule(id: string, payload: any) {
        try {
            const res = await api.put(`/api/v1/expense_policy_rules/${id}`, payload);
            return res;            
        } catch (error) {
            throw error;
        }
    },

    async getEntities() {
        try {
            const res = await api.get('/api/v1/entities');
            return res;
        } catch (error) {
            throw error;
        }
    }
}