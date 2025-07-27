import { AxiosError } from 'axios';

/**
 * API error handling utility
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof AxiosError) {
    return {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      status: error.response?.status,
      code: error.response?.data?.code,
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }
  
  return {
    message: 'An unexpected error occurred',
  };
};

/**
 * Format API response for consistent handling
 */
export const formatApiResponse = <T>(data: T) => {
  return {
    data,
    success: true,
  };
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return !error.response && error.code === 'NETWORK_ERROR';
  }
  return false;
};

/**
 * Check if error is a timeout error
 */
export const isTimeoutError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    return error.code === 'ECONNABORTED';
  }
  return false;
};

/**
 * Retry utility for API calls
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries) {
        break;
      }
      
      // Only retry on network errors or timeouts
      if (!isNetworkError(error) && !isTimeoutError(error)) {
        break;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  
  throw lastError;
};