import { Link } from 'react-router-dom';
import { Case, CaseStatus, ProcessStep } from '@/types';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/utils/formatting';

interface CaseListItemProps {
  caseData: Case;
}

const CaseListItem = ({ caseData }: CaseListItemProps) => {
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

  return (
    <Link to={`/cases/${caseData.id}`} className="block">
      <Card className="hover:shadow-lg hover:shadow-blue-100 transition-all duration-300 hover:scale-[1.02] cursor-pointer group p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 truncate">
                {caseData.applicationData.applicantName}
              </h3>
              <Badge 
                variant={getStatusVariant(caseData.status)} 
                size="sm"
                className="transition-transform duration-200 group-hover:scale-105 flex-shrink-0"
              >
                {caseData.status}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span className="truncate">{caseData.applicationData.applicationType}</span>
              <span>📄 {caseData.applicationData.documents.length}</span>
              <span>💬 {caseData.notes.length}</span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
              <span>Submitted: {formatDate(caseData.applicationData.submissionDate)}</span>
              <span>Updated: {formatDate(caseData.updatedAt)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1 ml-3 flex-shrink-0">
            <Badge 
              variant={getStepVariant(caseData.currentStep)} 
              size="sm"
              className="transition-transform duration-200 group-hover:scale-105"
            >
              {getStepLabel(caseData.currentStep)}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default CaseListItem;
