import React from 'react';
import { Button, LoadingSpinner, ErrorMessage } from '@/components/ui';
import { useAISummary, useRefreshAIInsights } from '@/hooks/useCases';
import { formatDate } from '@/utils/formatting';

interface AIInsightPanelProps {
  caseId: string;
}

const AIInsightPanel: React.FC<AIInsightPanelProps> = ({ caseId }) => {
  const { data: aiSummary, isLoading, error } = useAISummary(caseId);
  const refreshMutation = useRefreshAIInsights();

  // Debug logging
  console.log('AIInsightPanel render:', { 
    caseId, 
    isLoading, 
    error, 
    hasAiSummary: !!aiSummary,
    aiSummaryData: aiSummary 
  });

  // Extract the actual AI summary data from the nested structure
  const actualAiSummary = aiSummary?.aiSummary || aiSummary;

  const handleRefresh = () => {
    console.log('AIInsightPanel: Refreshing AI insights for case:', caseId);
    refreshMutation.mutate(caseId);
  };

  // Show loading state
  if (isLoading) {
    console.log('AIInsightPanel: Loading state');
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">AI Insights</h3>
          <Button variant="secondary" size="sm" disabled>
            Refresh
          </Button>
        </div>
        <div className="text-center py-8">
          <LoadingSpinner />
          <p className="mt-2 text-sm text-gray-600">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.log('AIInsightPanel: Error state', error);
    // Extract specific error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unable to load AI insights';
    
    // Check if it's an AI service error
    const isAIServiceError = errorMessage.includes('AI_SUMMARY_GENERATION_FAILED') || 
                            errorMessage.includes('OpenRouter API failed') ||
                            errorMessage.includes('401');
    
    const displayMessage = isAIServiceError 
      ? 'AI service is currently unavailable. Please try again later.'
      : errorMessage;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">AI Insights</h3>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        <ErrorMessage message={displayMessage} />
        <div className="text-center">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
        {isAIServiceError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              💡 <strong>Tip:</strong> AI insights require the OpenRouter API to be properly configured. 
              This is a backend configuration issue.
            </p>
          </div>
        )}
      </div>
    );
  }

  console.log('AIInsightPanel: Rendering with data', actualAiSummary);

  // Show AI insights
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">AI Insights</h3>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshMutation.isPending}
        >
          {refreshMutation.isPending ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* AI Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Overall Summary</h4>
        <p className="text-sm text-blue-800">
          {actualAiSummary?.content || 'No AI summary available for this case.'}
        </p>
        {actualAiSummary?.generatedAt && (
          <p className="text-xs text-blue-600 mt-2">
            Generated: {formatDate(actualAiSummary.generatedAt)}
          </p>
        )}
      </div>

      {/* AI Recommendations */}
      {actualAiSummary?.recommendations && actualAiSummary.recommendations.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">Recommendations</h4>
          <ul className="text-sm text-green-800 space-y-1">
            {actualAiSummary.recommendations.map((recommendation: string, index: number) => (
              <li key={index}>• {recommendation}</li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Confidence */}
      {actualAiSummary?.confidence && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">AI Confidence</h4>
          <div className="flex items-center">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${actualAiSummary.confidence}%` }}
              ></div>
            </div>
            <span className="ml-2 text-sm text-gray-600">{Math.round(actualAiSummary.confidence)}%</span>
          </div>
        </div>
      )}

      {/* No AI data available */}
      {!actualAiSummary && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">No AI Insights Available</h4>
          <p className="text-sm text-yellow-800">
            AI insights have not been generated for this case yet. Click refresh to generate them.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs text-blue-800">
                🔧 <strong>Development Mode:</strong> AI service requires OpenRouter API key configuration.
                Check backend/.env file for OPENROUTER_API_KEY.
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">Case ID: {caseId}</p>
    </div>
  );
};

export default AIInsightPanel;