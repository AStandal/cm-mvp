import axios, { AxiosResponse } from 'axios';
import { handleApiError, withRetry } from '@/utils/api';

// Create axios instance with base configuration
const api = axios.create({
  // Use relative URL - Vite proxy handles the routing
  baseURL: '/api',
  timeout: 60000, // 60 seconds timeout for AI operations and case creation
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens (when implemented)
api.interceptors.request.use(
  (config) => {
    // Add auth token when authentication is implemented
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access when authentication is implemented
      // localStorage.removeItem('authToken');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Generic API request wrapper with error handling and retry logic
 */
export const apiRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  retries: number = 1
): Promise<T> => {
  try {
    const response = await withRetry(requestFn, retries);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * API methods with consistent error handling
 */
export const apiClient = {
  get: <T>(url: string, config?: any) => 
    apiRequest<T>(() => api.get(url, config)),
  
  post: <T>(url: string, data?: any, config?: any) => 
    apiRequest<T>(() => api.post(url, data, config)),
  
  put: <T>(url: string, data?: any, config?: any) => 
    apiRequest<T>(() => api.put(url, data, config)),
  
  delete: <T>(url: string, config?: any) => 
    apiRequest<T>(() => api.delete(url, config)),
  
  patch: <T>(url: string, data?: any, config?: any) => 
    apiRequest<T>(() => api.patch(url, data, config)),
};

export default api;