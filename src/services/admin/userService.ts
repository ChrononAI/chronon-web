import api from "@/lib/api";
import { getOrgIdFromToken } from "@/lib/jwtUtils";

export const userService = {
  getAllUsers: async () => {
    const orgId = getOrgIdFromToken();
    if (!orgId) {
      throw new Error("Organization ID not found in token");
    }
    try {
        return await api.get(`/auth/em/users?org_id=${orgId}`)
    } catch (error) {
        throw error;
    }
  },
  getUserById: async (id: string) => {
    try {
      return await api.get(`/auth/em/users/${id}`);
    } catch (error) {
      throw error;
    }
  },
  disableUsers: async (payload: any) => {
    try {
      return await api.post('/auth/em/users/bulk', payload);
    } catch (error) {
      throw error;
    }
  }
};
