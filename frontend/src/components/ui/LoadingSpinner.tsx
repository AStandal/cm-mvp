interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'inline' | 'overlay';
  className?: string;
}

const LoadingSpinner = ({ size = 'md', variant = 'default', className = '' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const variantClasses = {
    default: 'border-gray-300 border-t-blue-600',
    inline: 'border-gray-200 border-t-gray-400',
    overlay: 'border-white border-t-blue-400',
  };

  return (
    <div className={`animate-spin rounded-full border-2 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} />
  );
};

export default LoadingSpinner;