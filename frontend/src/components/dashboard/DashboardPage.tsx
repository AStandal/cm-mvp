import React from 'react';

interface DashboardPageProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ title, description, children }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-2 text-gray-600">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
};

export default DashboardPage;