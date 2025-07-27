/**
 * Form validation utilities
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Validate a single field
 */
export const validateField = (value: any, rules: ValidationRule): string | null => {
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return 'This field is required';
  }
  
  if (value && typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Must be no more than ${rules.maxLength} characters`;
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format';
    }
  }
  
  if (rules.custom) {
    return rules.custom(value);
  }
  
  return null;
};

/**
 * Validate multiple fields
 */
export const validateForm = (
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  Object.keys(rules).forEach(field => {
    const error = validateField(data[field], rules[field]);
    if (error) {
      errors[field] = error;
    }
  });
  
  return errors;
};

/**
 * Common validation patterns
 */
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-()]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s]+$/,
};

/**
 * Common validation rules
 */
export const commonRules = {
  required: { required: true },
  email: { 
    required: true, 
    pattern: patterns.email,
    custom: (value: string) => {
      if (value && !patterns.email.test(value)) {
        return 'Please enter a valid email address';
      }
      return null;
    }
  },
  name: { 
    required: true, 
    minLength: 2, 
    maxLength: 50,
    pattern: patterns.noSpecialChars,
    custom: (value: string) => {
      if (value && !patterns.noSpecialChars.test(value)) {
        return 'Name can only contain letters, numbers, and spaces';
      }
      return null;
    }
  },
  phone: {
    pattern: patterns.phone,
    custom: (value: string) => {
      if (value && !patterns.phone.test(value)) {
        return 'Please enter a valid phone number';
      }
      return null;
    }
  },
};