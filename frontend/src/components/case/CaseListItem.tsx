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
      <Card className="hover:shadow-lg hover:shadow-blue-100 transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-200">
              {caseData.applicationData.applicantName}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {caseData.applicationData.applicationType}
            </p>
            <p className="text-xs text-gray-500">
              Submitted: {formatDate(caseData.applicationData.submissionDate)}
            </p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge 
              variant={getStatusVariant(caseData.status)} 
              size="sm"
              className="transition-transform duration-200 group-hover:scale-105"
            >
              {caseData.status}
            </Badge>
            <Badge 
              variant={getStepVariant(caseData.currentStep)} 
              size="sm"
              className="transition-transform duration-200 group-hover:scale-105"
            >
              {getStepLabel(caseData.currentStep)}
            </Badge>
          </div>
        </div>
        
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="transition-colors duration-200 group-hover:text-blue-600">
              📄 {caseData.applicationData.documents.length} documents
            </span>
            <span className="transition-colors duration-200 group-hover:text-blue-600">
              💬 {caseData.notes.length} notes
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Updated: {formatDate(caseData.updatedAt)}
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default CaseListItem;
