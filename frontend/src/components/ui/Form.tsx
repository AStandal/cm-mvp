import { FormHTMLAttributes, ReactNode } from 'react';

interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
}

const Form = ({ children, className = '', ...props }: FormProps) => {
  return (
    <form className={`space-y-6 ${className}`} {...props}>
      {children}
    </form>
  );
};

interface FormGroupProps {
  children: ReactNode;
  className?: string;
}

const FormGroup = ({ children, className = '' }: FormGroupProps) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
};

interface FormActionsProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

const FormActions = ({ children, className = '', align = 'right' }: FormActionsProps) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div className={`flex gap-3 pt-4 ${alignClasses[align]} ${className}`}>
      {children}
    </div>
  );
};

Form.Group = FormGroup;
Form.Actions = FormActions;

export default Form;