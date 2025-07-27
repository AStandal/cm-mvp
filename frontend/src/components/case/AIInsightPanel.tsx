import React from 'react';
import { Button } from '@/components/ui';

interface AIInsightPanelProps {
  caseId: string;
}

const AIInsightPanel: React.FC<AIInsightPanelProps> = ({ caseId }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          AI insights panel will be implemented in future tasks
        </p>
        <Button variant="secondary" size="sm">
          Refresh
        </Button>
      </div>

      {/* Placeholder AI Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Overall Summary</h4>
        <p className="text-sm text-blue-800">
          AI-generated case summary will appear here. This will include key insights, 
          recommendations, and analysis based on the current case data.
        </p>
      </div>

      {/* Placeholder Step-Specific Recommendations */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-900 mb-2">Step Recommendations</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Placeholder recommendation 1</li>
          <li>• Placeholder recommendation 2</li>
          <li>• Placeholder recommendation 3</li>
        </ul>
      </div>

      {/* Placeholder AI Confidence */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">AI Confidence</h4>
        <div className="flex items-center">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
          </div>
          <span className="ml-2 text-sm text-gray-600">85%</span>
        </div>
      </div>

      <p className="text-xs text-gray-500">Case ID: {caseId}</p>
    </div>
  );
};

export default AIInsightPanel;