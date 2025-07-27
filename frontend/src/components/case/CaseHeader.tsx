import React from 'react';
import { Badge } from '@/components/ui';

interface CaseHeaderProps {
  caseId: string;
}

const CaseHeader: React.FC<CaseHeaderProps> = ({ caseId }) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Case #{caseId}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Case header information will be implemented in future tasks
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="info">Active</Badge>
            <Badge variant="default">In Review</Badge>
          </div>
        </div>
        
        {/* Placeholder for case metadata */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Applicant</dt>
            <dd className="mt-1 text-sm text-gray-900">Placeholder Name</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Application Type</dt>
            <dd className="mt-1 text-sm text-gray-900">Placeholder Type</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Submission Date</dt>
            <dd className="mt-1 text-sm text-gray-900">Placeholder Date</dd>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseHeader;