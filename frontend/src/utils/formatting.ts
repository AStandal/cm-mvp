/**
 * Formatting utilities for display
 */

/**
 * Format date for display
 */
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format date and time for display
 */
export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
  
  return formatDate(d);
};

/**
 * Capitalize first letter of each word
 */
export const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Convert camelCase or snake_case to readable format
 */
export const humanizeString = (str: string): string => {
  return str
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^\w/, char => char.toUpperCase()) // Capitalize first letter
    .trim();
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format case status for display
 */
export const formatCaseStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'active': 'Active',
    'pending': 'Pending',
    'approved': 'Approved',
    'denied': 'Denied',
    'withdrawn': 'Withdrawn',
    'archived': 'Archived',
    'received': 'Received',
    'in_review': 'In Review',
    'additional_info_required': 'Additional Info Required',
    'ready_for_decision': 'Ready for Decision',
    'concluded': 'Concluded',
  };
  
  return statusMap[status] || capitalizeWords(status.replace(/_/g, ' '));
};

/**
 * Get status color variant for badges
 */
export const getStatusVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    'active': 'info',
    'pending': 'warning',
    'approved': 'success',
    'denied': 'danger',
    'withdrawn': 'default',
    'archived': 'default',
    'received': 'info',
    'in_review': 'warning',
    'additional_info_required': 'warning',
    'ready_for_decision': 'info',
    'concluded': 'success',
  };
  
  return statusVariants[status] || 'default';
};