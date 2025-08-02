import React from 'react';
import { Button, LoadingSpinner, Alert, Card } from '@/components/ui';
import { useAISummary, useRefreshAIInsights } from '@/hooks/useCases';
import { AISummary, ProcessStep } from '@/types';

interface AIInsightPanelProps {
  caseId: string;
  step?: ProcessStep;
  summaryType?: 'overall' | 'step-specific';
}

const AIInsightPanel: React.FC<AIInsightPanelProps> = ({ 
  caseId, 
  step, 
  summaryType = 'overall' 
}) => {
  // Fetch AI summary data
  const { 
    data: aiSummaryData, 
    isLoading, 
    error, 
    refetch 
  } = useAISummary(caseId);

  // Refresh AI insights mutation
  const refreshMutation = useRefreshAIInsights();

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync(caseId);
      // The useAISummary hook will automatically refetch due to query invalidation
    } catch (error) {
      console.error('Failed to refresh AI insights:', error);
    }
  };

  // Filter summaries based on type and step
  const filteredSummaries = aiSummaryData?.summaries?.filter((summary: AISummary) => {
    if (summaryType === 'overall') {
      return summary.type === 'overall';
    } else if (summaryType === 'step-specific' && step) {
      return summary.type === 'step-specific' && summary.step === step;
    }
    return summary.type === summaryType;
  }) || [];

  // Get the most recent summary
  const latestSummary = filteredSummaries.sort(
    (a: AISummary, b: AISummary) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  )[0];

  const renderLoadingState = () => (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">AI Insights</h3>
        <Button 
          variant="secondary" 
          size="sm" 
          disabled
        >
          <LoadingSpinner size="sm" className="mr-2" />
          Loading...
        </Button>
      </div>
      
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <LoadingSpinner size="sm" />
            <h4 className="text-sm font-medium text-blue-900">Loading AI Summary...</h4>
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-blue-200 rounded w-3/4"></div>
            <div className="h-4 bg-blue-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderErrorState = () => (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">AI Insights</h3>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </div>
      
      <Alert variant="error">
        <div>
          <h4 className="font-medium mb-1">Failed to load AI insights</h4>
          <p className="text-sm">
            {error?.message || 'Unable to fetch AI summary. This feature may not be fully implemented yet.'}
          </p>
        </div>
      </Alert>
      
      {/* Show placeholder content when API is not available */}
      <div className="space-y-4 opacity-50">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Overall Summary (Preview)</h4>
          <p className="text-sm text-blue-800">
            AI-generated case summary will appear here once the backend API is fully implemented. 
            This will include key insights, recommendations, and analysis based on the current case data.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">Step Recommendations (Preview)</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Review application completeness</li>
            <li>• Verify required documentation</li>
            <li>• Schedule follow-up if needed</li>
          </ul>
        </div>
      </div>
    </Card>
  );

  const renderSummaryContent = () => {
    if (!latestSummary) {
      return (
        <Alert variant="info">
          <div>
            <h4 className="font-medium mb-1">No AI summary available</h4>
            <p className="text-sm">
              Click "Generate Summary" to create an AI analysis for this case.
            </p>
          </div>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        {/* Overall Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-900">
              {summaryType === 'overall' ? 'Overall Summary' : 'Step-Specific Analysis'}
            </h4>
            <span className="text-xs text-blue-600">
              v{latestSummary.version} • {new Date(latestSummary.generatedAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-blue-800 whitespace-pre-wrap">
            {latestSummary.content}
          </p>
        </div>

        {/* Recommendations */}
        {latestSummary.recommendations && latestSummary.recommendations.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-900 mb-2">AI Recommendations</h4>
            <ul className="text-sm text-green-800 space-y-1">
              {latestSummary.recommendations.map((recommendation: string, index: number) => (
                <li key={index}>• {recommendation}</li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Confidence */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">AI Confidence</h4>
          <div className="flex items-center">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(latestSummary.confidence || 0) * 100}%` }}
              ></div>
            </div>
            <span className="ml-2 text-sm text-gray-600">
              {Math.round((latestSummary.confidence || 0) * 100)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderSuccessState = () => (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">AI Insights</h3>
        <div className="flex space-x-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleRefresh}
            loading={refreshMutation.isPending}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>
      
      {refreshMutation.isError && (
        <Alert variant="error" className="mb-4">
          <div>
            <h4 className="font-medium mb-1">Failed to refresh AI insights</h4>
            <p className="text-sm">
              {refreshMutation.error?.message || 'Please try again later.'}
            </p>
          </div>
        </Alert>
      )}
      
      {renderSummaryContent()}
      
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
        Case ID: {caseId}
        {step && ` • Step: ${step}`}
        {latestSummary && (
          <span className="ml-2">
            • Last updated: {new Date(latestSummary.generatedAt).toLocaleString()}
          </span>
        )}
      </div>
    </Card>
  );

  // Render based on loading state
  if (isLoading) {
    return renderLoadingState();
  }

  if (error) {
    return renderErrorState();
  }

  return renderSuccessState();
};

export default AIInsightPanel;