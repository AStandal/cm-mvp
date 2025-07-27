import { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

const PageLayout = ({ 
  children, 
  title, 
  subtitle, 
  actions, 
  className = '' 
}: PageLayoutProps) => {
  return (
    <div className={`px-4 py-6 sm:px-0 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            )}
            {subtitle && (
              <p className="text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default PageLayout;