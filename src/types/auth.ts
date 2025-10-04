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