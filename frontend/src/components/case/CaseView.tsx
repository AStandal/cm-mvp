import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, LoadingSpinner, ErrorMessage } from '@/components/ui';
import { useCase } from '@/hooks/useCases';
import CaseHeader from './CaseHeader';
import ProcessStepIndicator from './ProcessStepIndicator';
import AIInsightPanel from './AIInsightPanel';
import NotesSection from './NotesSection';
import ActionButtons from './ActionButtons';

interface CaseViewProps {
  className?: string;
}

const CaseView: React.FC<CaseViewProps> = ({ className = '' }) => {
  const { id } = useParams<{ id: string }>();
  const { data: caseData, isLoading, error } = useCase(id || '');

  if (!id) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Case Not Found</h2>
          <p className="text-gray-500">Invalid case ID provided</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading case details...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center py-12">
          <ErrorMessage message="Unable to load case details" />
        </div>
      </div>
    );
  }

  return (
    <div className={`px-4 py-6 sm:px-0 ${className}`}>
      {/* Case Header Section */}
      <div className="mb-6">
        <CaseHeader caseId={id} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Case Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Process Steps Section */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Process Steps</h3>
              <ProcessStepIndicator caseId={id} caseData={caseData} />
            </div>
          </Card>

          {/* Notes Section */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Case Notes</h3>
              <NotesSection caseId={id} />
            </div>
          </Card>
        </div>

        {/* Right Column - AI Insights and Actions */}
        <div className="space-y-6">
          {/* AI Insights Panel */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">AI Insights</h3>
              <AIInsightPanel caseId={id} />
            </div>
          </Card>

          {/* Action Buttons */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
              <ActionButtons caseId={id} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CaseView;