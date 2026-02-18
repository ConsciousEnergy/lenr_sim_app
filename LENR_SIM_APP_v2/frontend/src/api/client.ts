import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, DEFAULT_TIMEOUT } from '../config/api';

// API configuration
const API_URL = API_BASE_URL;
const API_TIMEOUT = DEFAULT_TIMEOUT;

// Error types
/* eslint-disable no-unused-vars */
export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  SERVER = 'SERVER',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}
/* eslint-enable no-unused-vars */

// Custom error interface
export interface ApiError {
  type: ErrorType;
  status?: number;
  message: string;
  data?: unknown;
  originalError?: Error;
}

// Create the axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add authorization header if token exists
    const token = localStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const apiError: ApiError = {
      type: ErrorType.UNKNOWN,
      message: 'An unknown error occurred',
      originalError: error,
    };

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      apiError.status = status;
      apiError.data = error.response.data;

      if (status === 401) {
        apiError.type = ErrorType.UNAUTHORIZED;
        apiError.message = 'You are not authorized to access this resource';
      } else if (status === 400 || status === 422) {
        apiError.type = ErrorType.VALIDATION;
        apiError.message = 'The request data is invalid';
      } else if (status >= 500) {
        apiError.type = ErrorType.SERVER;
        apiError.message = 'A server error occurred';
      }
    } else if (error.request) {
      // The request was made but no response was received
      if (error.code === 'ECONNABORTED') {
        apiError.type = ErrorType.TIMEOUT;
        apiError.message = 'The request timed out';
      } else {
        apiError.type = ErrorType.NETWORK;
        apiError.message = 'A network error occurred';
      }
    }

    console.error('API Error:', apiError);
    
    // Handle unauthorized errors globally
    if (apiError.type === ErrorType.UNAUTHORIZED) {
      // Clear auth token and redirect to login if needed
      localStorage.removeItem('authToken');
      // Dispatch event to notify app of auth failure
      window.dispatchEvent(new CustomEvent('auth:failed'));
    }

    return Promise.reject(apiError);
  }
);

// Generic API request function with type safety
export async function apiRequest<T = unknown>(
  config: AxiosRequestConfig
): Promise<T> {
  const response: AxiosResponse<T> = await apiClient(config);
  return response.data;
}

// Helper functions for common request types
export const api = {
  get: <T = unknown>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig) => 
    apiRequest<T>({ ...config, method: 'GET', url, params }),
  
  post: <T = unknown, D = any>(url: string, data?: D, config?: AxiosRequestConfig) => 
    apiRequest<T>({ ...config, method: 'POST', url, data }),
  
  put: <T = unknown, D = any>(url: string, data?: D, config?: AxiosRequestConfig) => 
    apiRequest<T>({ ...config, method: 'PUT', url, data }),
  
  patch: <T = unknown, D = any>(url: string, data?: D, config?: AxiosRequestConfig) => 
    apiRequest<T>({ ...config, method: 'PATCH', url, data }),
  
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) => 
    apiRequest<T>({ ...config, method: 'DELETE', url }),
}; 