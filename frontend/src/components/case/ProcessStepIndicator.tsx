import React from 'react';
import { ProcessStep, Case } from '@/types';

interface ProcessStepIndicatorProps {
  caseId: string;
  caseData?: Case;
}

const ProcessStepIndicator: React.FC<ProcessStepIndicatorProps> = ({ caseId, caseData }) => {
  // Define all possible steps in order
  const allSteps = [
    { step: ProcessStep.RECEIVED, label: 'Received', value: 'received' },
    { step: ProcessStep.IN_REVIEW, label: 'In Review', value: 'in_review' },
    { step: ProcessStep.ADDITIONAL_INFO_REQUIRED, label: 'Additional Info Required', value: 'additional_info_required' },
    { step: ProcessStep.READY_FOR_DECISION, label: 'Ready for Decision', value: 'ready_for_decision' },
    { step: ProcessStep.CONCLUDED, label: 'Concluded', value: 'concluded' },
  ];

  // If no case data, show placeholder
  if (!caseData) {
    const placeholderSteps = [
      { step: ProcessStep.RECEIVED, label: 'Received', completed: true },
      { step: ProcessStep.IN_REVIEW, label: 'In Review', completed: false, current: true },
      { step: ProcessStep.ADDITIONAL_INFO_REQUIRED, label: 'Additional Info Required', completed: false },
      { step: ProcessStep.READY_FOR_DECISION, label: 'Ready for Decision', completed: false },
      { step: ProcessStep.CONCLUDED, label: 'Concluded', completed: false },
    ];
    
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Process step indicator will be implemented in future tasks (Case: {caseId})
        </p>
        {/* Placeholder step visualization */}
        <nav aria-label="Progress">
          <ol className="space-y-4">
            {placeholderSteps.map((stepInfo, stepIdx) => (
              <li key={stepInfo.step} className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      stepInfo.completed
                        ? 'border-green-600 bg-green-600'
                        : stepInfo.current
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {stepInfo.completed ? (
                      <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className={`text-sm font-medium ${stepInfo.current ? 'text-white' : 'text-gray-500'}`}>
                        {stepIdx + 1}
                      </span>
                    )}
                  </div>
                  <span className={`ml-3 text-sm font-medium ${stepInfo.current ? 'text-blue-600' : stepInfo.completed ? 'text-green-600' : 'text-gray-500'}`}>
                    {stepInfo.label}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    );
  }

  // Use real case data to determine step status
  const currentStepValue = caseData.currentStep;
  const steps = allSteps.map((stepInfo, stepIdx) => {
    const stepValue = stepInfo.value;
    const currentStepIndex = allSteps.findIndex(s => s.value === currentStepValue);
    const isCompleted = stepIdx < currentStepIndex;
    const isCurrent = stepValue === currentStepValue;
    
    return {
      ...stepInfo,
      completed: isCompleted,
      current: isCurrent,
    };
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Process step indicator will be implemented in future tasks (Case: {caseId})
      </p>
      
      {/* Placeholder step visualization */}
      <nav aria-label="Progress">
        <ol className="space-y-4">
          {steps.map((stepInfo, stepIdx) => (
            <li key={stepInfo.step} className="flex items-center">
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    stepInfo.completed
                      ? 'border-green-600 bg-green-600'
                      : stepInfo.current
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {stepInfo.completed ? (
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className={`text-sm font-medium ${stepInfo.current ? 'text-white' : 'text-gray-500'}`}>
                      {stepIdx + 1}
                    </span>
                  )}
                </div>
                <span className={`ml-3 text-sm font-medium ${stepInfo.current ? 'text-blue-600' : stepInfo.completed ? 'text-green-600' : 'text-gray-500'}`}>
                  {stepInfo.label}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default ProcessStepIndicator;