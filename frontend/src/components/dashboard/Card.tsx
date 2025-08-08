import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, subtitle, children, className = '', headerRight }) => {
  return (
    <div className={`rounded-lg bg-white shadow p-4 sm:p-6 ${className}`}>
      {(title || subtitle || headerRight) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {headerRight && <div className="shrink-0">{headerRight}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;