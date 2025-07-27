import React from 'react';
import { Button } from '@/components/ui';

interface ActionButtonsProps {
  caseId: string;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ caseId }) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Action buttons will be implemented in future tasks
      </p>

      {/* Placeholder action buttons */}
      <div className="space-y-3">
        <Button variant="primary" className="w-full">
          Update Case Status
        </Button>
        
        <Button variant="secondary" className="w-full">
          Request Additional Info
        </Button>
        
        <Button variant="secondary" className="w-full">
          Generate AI Summary
        </Button>
        
        <Button variant="secondary" className="w-full">
          Export Case Data
        </Button>
        
        <div className="border-t border-gray-200 pt-3">
          <Button variant="danger" className="w-full">
            Archive Case
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-500">Case ID: {caseId}</p>
    </div>
  );
};

export default ActionButtons;