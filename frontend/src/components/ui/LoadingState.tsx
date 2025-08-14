import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: 'skeleton' | 'spinner' | 'dots';
  className?: string;
}

const LoadingState = ({ 
  isLoading, 
  children, 
  fallback, 
  variant = 'skeleton',
  className = '' 
}: LoadingStateProps) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  switch (variant) {
    case 'spinner':
      return (
        <div className={`flex justify-center items-center p-8 ${className}`}>
          <LoadingSpinner size="md" variant="inline" />
        </div>
      );
    case 'dots':
      return (
        <div className={`flex justify-center items-center p-4 ${className}`}>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      );
    case 'skeleton':
    default:
      return (
        <div className={`animate-pulse ${className}`}>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      );
  }
};

export default LoadingState;
