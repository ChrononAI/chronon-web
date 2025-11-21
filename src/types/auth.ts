export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  department: string;
  location: string;
  organization: {
    id: number;
    name: string;
    orgCode: string;
  };
}

export interface UserProfile {
  created_at: string;
  current_org: {
    org_id: string;
    org_name: string;
    role: string;
  };
  email: string;
  email_verification_expires_at: string | null;
  email_verification_token: string | null;
  email_verified: boolean;
  entity_assignments: Record<string, string>;
  first_name: string;
  id: number;
  is_active: boolean;
  is_admin: boolean;
  is_password_set: boolean;
  last_name: string;
  password_hash: string;
  password_verification_expires_at: string | null;
  password_verification_token: string | null;
  phone_number: string;
  reporting_manager_email: string | null;
  reporting_manager_name: string | null;
  updated_at: string;
  username: string;
}


export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    userId: number;
    username: string;
    email: string;
    role: string;
  };
  status: number;
  timestamp: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}