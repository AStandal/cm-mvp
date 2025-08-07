import React from 'react';
import { Badge, LoadingSpinner, ErrorMessage } from '@/components/ui';
import { useCase } from '@/hooks/useCases';
import { formatDate } from '@/utils/formatting';

interface CaseHeaderProps {
  caseId: string;
}

const CaseHeader: React.FC<CaseHeaderProps> = ({ caseId }) => {
  const { data: caseData, isLoading, error } = useCase(caseId);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading case details...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <ErrorMessage 
            message="Unable to load case details. Please try again."
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  // No data state
  if (!caseData) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Case Not Found</h2>
            <p className="text-gray-500">The requested case could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Case #{caseData.id}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {caseData.applicationData.applicationType} Application
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={caseData.status === 'active' ? 'default' : 'info'}>
              {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
            </Badge>
            <Badge variant="info">
              {caseData.currentStep.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          </div>
        </div>
        
        {/* Case metadata */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Applicant</dt>
            <dd className="mt-1 text-sm text-gray-900">{caseData.applicationData.applicantName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Application Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{caseData.applicationData.applicationType}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Submission Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(caseData.applicationData.submissionDate)}</dd>
          </div>
        </div>

        {/* Additional metadata */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{caseData.applicationData.applicantEmail}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(caseData.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(caseData.updatedAt)}</dd>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseHeader;