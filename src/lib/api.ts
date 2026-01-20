import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { trackApiError } from "@/mixpanel";

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://in.pulse.chronon.co.in';
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5555";
const API_BASE_URL_V2 =
  import.meta.env.VITE_API_BASE_URL_V2 || "https://stageapi.auth.chronon.co.in";

export const api2 = axios.create({
  baseURL: `${API_BASE_URL_V2}/api/v2`,
  // Remove default Content-Type to allow axios to set it automatically based on data type
});

export const api = axios.create({
  baseURL: `${API_BASE_URL}`,
  // Remove default Content-Type to allow axios to set it automatically based on data type
});

export const baseAPI = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  // Remove default Content-Type to allow axios to set it automatically based on data type
});

// Request interceptor to add auth token for api
api.interceptors.request.use(
  (config) => {
    const excludedUrls = ["/auth/create_password"];

    // Check if the URL matches any of the excluded paths
    if (excludedUrls.some((url) => config.url?.includes(url))) {
      return config;
    }
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Set Content-Type for JSON requests if not already set
    if (!config.headers["Content-Type"] && !(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => {
    trackApiError(error.config?.url, error);
    return Promise.reject(error);
  }
);

// Request interceptor to add auth token for api2
api2.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Set Content-Type for JSON requests if not already set
    if (!config.headers["Content-Type"] && !(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

baseAPI.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Set Content-Type for JSON requests if not already set
    if (!config.headers["Content-Type"] && !(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors for api
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  if (config.data === undefined) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// Response interceptor to handle auth errors for api2
api2.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

baseAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
