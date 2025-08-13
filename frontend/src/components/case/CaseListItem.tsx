import { Link } from 'react-router-dom';
import { Case, CaseStatus, ProcessStep } from '@/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/utils/formatting';

interface CaseListItemProps {
  caseData: Case;
  sortField?: string;
}

const CaseListItem = ({ caseData, sortField }: CaseListItemProps) => {
  const getStatusVariant = (status: CaseStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case CaseStatus.APPROVED:
        return 'success';
      case CaseStatus.DENIED:
        return 'danger';
      case CaseStatus.PENDING:
        return 'warning';
      case CaseStatus.ACTIVE:
        return 'info';
      default:
        return 'default';
    }
  };

  const getStepVariant = (step: ProcessStep): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (step) {
      case ProcessStep.CONCLUDED:
        return 'success';
      case ProcessStep.READY_FOR_DECISION:
        return 'info';
      case ProcessStep.ADDITIONAL_INFO_REQUIRED:
        return 'warning';
      case ProcessStep.IN_REVIEW:
        return 'info';
      default:
        return 'default';
    }
  };

  const getStepLabel = (step: ProcessStep): string => {
    return step.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const isSortedField = (field: string) => sortField === field;

  return (
    <Link to={`/cases/${caseData.id}`} className="block">
      <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className={`text-lg font-semibold text-gray-900 mb-2 ${isSortedField('applicantName') ? 'bg-yellow-50 px-2 py-1 rounded border-l-4 border-yellow-400' : ''}`}>
              {caseData.applicationData.applicantName}
              {isSortedField('applicantName') && (
                <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                  Sorted
                </span>
              )}
            </h3>
            <p className={`text-sm text-gray-600 mb-2 ${isSortedField('applicationType') ? 'bg-yellow-50 px-2 py-1 rounded border-l-4 border-yellow-400' : ''}`}>
              {caseData.applicationData.applicationType}
              {isSortedField('applicationType') && (
                <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                  Sorted
                </span>
              )}
            </p>
            <p className={`text-xs text-gray-500 ${isSortedField('submissionDate') ? 'bg-yellow-50 px-2 py-1 rounded border-l-4 border-yellow-400' : ''}`}>
              Submitted: {formatDate(caseData.applicationData.submissionDate)}
              {isSortedField('submissionDate') && (
                <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                  Sorted
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge 
              variant={getStatusVariant(caseData.status)} 
              size="sm"
              className={isSortedField('status') ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
            >
              {caseData.status}
              {isSortedField('status') && (
                <span className="ml-1 text-xs">★</span>
              )}
            </Badge>
            <Badge 
              variant={getStepVariant(caseData.currentStep)} 
              size="sm"
              className={isSortedField('currentStep') ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
            >
              {getStepLabel(caseData.currentStep)}
              {isSortedField('currentStep') && (
                <span className="ml-1 text-xs">★</span>
              )}
            </Badge>
          </div>
        </div>
        
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className={isSortedField('documentCount') ? 'bg-yellow-50 px-2 py-1 rounded border-l-4 border-yellow-400' : ''}>
              📄 {caseData.applicationData.documents.length} documents
              {isSortedField('documentCount') && (
                <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                  Sorted
                </span>
              )}
            </span>
            <span className={isSortedField('noteCount') ? 'bg-yellow-50 px-2 py-1 rounded border-l-4 border-yellow-400' : ''}>
              💬 {caseData.notes.length} notes
              {isSortedField('noteCount') && (
                <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                  Sorted
                </span>
              )}
            </span>
          </div>
          <div className={`text-xs text-gray-500 ${isSortedField('updatedAt') ? 'bg-yellow-50 px-2 py-1 rounded border-l-4 border-yellow-400' : ''}`}>
            Updated: {formatDate(caseData.updatedAt)}
            {isSortedField('updatedAt') && (
              <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                Sorted
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default CaseListItem;
