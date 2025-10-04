import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  user_id: string;
  org_id: string;
  role: string;
  type: string;
  exp: number;
  iat: number;
}

export function decodeJwtToken(token: string): DecodedToken {
  try {
    const decoded = jwtDecode<DecodedToken>(token);
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    throw new Error('Invalid token format');
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJwtToken(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}

export function getOrgIdFromToken(): string | null {
  try {
    // Clean up old cached_org_id key if it exists
    if (localStorage.getItem('cached_org_id')) {
      localStorage.removeItem('cached_org_id');
    }

    // First, try to get cached org_id from localStorage
    const cachedOrgId = localStorage.getItem('org_id');
    if (cachedOrgId) {
      return cachedOrgId;
    }

    // If not cached, get token and decode it
    const authStorage = localStorage.getItem('auth-storage');
    let token = null;
    
    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage);
        token = authData.state?.token;
      } catch (e) {
        console.warn('Error parsing auth-storage:', e);
      }
    }
    
    // Fallback to direct token key
    if (!token) {
      token = localStorage.getItem('token');
    }
    
    if (!token) {
      console.warn('No token found in localStorage');
      return null;
    }

    if (isTokenExpired(token)) {
      console.warn('Token is expired');
      // Clear cached org_id if token is expired
      localStorage.removeItem('org_id');
      return null;
    }

    const decoded = decodeJwtToken(token);
    const orgId = decoded.org_id || null;
    
    // Cache the org_id for future use
    if (orgId) {
      localStorage.setItem('org_id', orgId);
    }
    
    return orgId;
  } catch (error) {
    console.error('Error getting org_id from token:', error);
    return null;
  }
}

export function getUserIdFromToken(): string | null {
  try {
    // Try to get token from auth-storage first (Zustand persist)
    const authStorage = localStorage.getItem('auth-storage');
    let token = null;
    
    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage);
        token = authData.state?.token;
      } catch (e) {
        console.warn('Error parsing auth-storage:', e);
      }
    }
    
    // Fallback to direct token key
    if (!token) {
      token = localStorage.getItem('token');
    }
    
    if (!token) {
      console.warn('No token found in localStorage');
      return null;
    }

    if (isTokenExpired(token)) {
      console.warn('Token is expired');
      return null;
    }

    const decoded = decodeJwtToken(token);
    return decoded.user_id || null;
  } catch (error) {
    console.error('Error getting user_id from token:', error);
    return null;
  }
}

export function clearCachedOrgId(): void {
  localStorage.removeItem('org_id');
}

export function refreshOrgIdFromToken(): string | null {
  // Clear cached org_id and get fresh one from token
  clearCachedOrgId();
  return getOrgIdFromToken();
}
