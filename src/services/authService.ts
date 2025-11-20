import api from "@/lib/api";
import { LoginCredentials, User } from "@/types/auth";
import { decodeJwtToken, getOrgIdFromToken } from "@/lib/jwtUtils";

export const authService = {
  async login(
    credentials: LoginCredentials
  ): Promise<{ user: User; token: string }> {
    const response = await api.post("auth/em/login", {
      email: credentials.email,
      password: credentials.password,
    });

    const { access_token, user_details } = response.data.data;

    const jwtData = decodeJwtToken(access_token);

    const user: User = {
      id: parseInt(jwtData.user_id),
      username: user_details.username,
      email: user_details.email,
      firstName: user_details.first_name,
      lastName: user_details.last_name,
      role: jwtData.role,
      phone: "",
      department: "",
      location: "",
      organization: {
        id: parseInt(jwtData.org_id),
        name: "",
        orgCode: "",
      },
    };

    return { user, token: access_token };
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword,
      });

      return {
        success: response.data.success,
        message:
          response.data.message ||
          (response.data.success
            ? "Password changed successfully"
            : "Failed to change password"),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Change password error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to change password",
      };
    }
  },

  async createPassword(payload: { password: string; token: string; }) {
    try {
      const res = await api.post("/auth/create_password", { password: payload.password }, {
    headers: {
      Authorization: `Bearer ${payload.token}`,
    },
  }
);
      return res;
    } catch (error) {
      throw error;
    }
  },

  async resetPassword(payload: { email: string }) {
    try {
      const res = await api.post("/auth/reset_password", payload);
      return res;
    } catch (error) {
      throw error;
    }
  },

  async verifyResetPassword(payload: {
    email: string;
    token: string;
    password: string;
  }) {
    try {
      const res = await api.post("/auth/verify_reset_password", payload);
      return res;
    } catch (error) {
      throw error;
    }
  },

  async verifyEmail(payload: { token: string; email: string }) {
    try {
      const res = await api.post("/auth/verify_email", payload);
      return res;
    } catch (error) {
      throw error;
    }
  },

  async resendVerificationMail(payload: { email: string }) {
    try {
      const res = await api.post("/auth/resend_verification", payload);
      return res;
    } catch (error) {
      throw error;
    }
  },

  async getOrgSetting() {
    try {
      const orgId = getOrgIdFromToken();

      if (!orgId) {
        throw new Error("Organization ID not found in token");
      }

      const res = await api.get(`/orgs/settings?org_id=${orgId}`);
      return res;
    } catch (error) {
      throw error;
    }
  },

  async getOrgData() {
    try {
      const res = await api.get(`/orgs`);
      return res.data;
    } catch (error) {
      throw error;
    }
  },

  async getUserProfile() {
    try {
      return await api.get('/auth/profile')
    } catch (error) {
      throw error;
    }
  }
};
