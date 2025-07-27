import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { caseService } from '../services';
import { ApplicationData, CaseStatus } from '../types';

// Query keys for React Query
export const caseKeys = {
  all: ['cases'] as const,
  lists: () => [...caseKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...caseKeys.lists(), { filters }] as const,
  details: () => [...caseKeys.all, 'detail'] as const,
  detail: (id: string) => [...caseKeys.details(), id] as const,
  aiSummary: (id: string) => [...caseKeys.detail(id), 'ai-summary'] as const,
  auditTrail: (id: string) => [...caseKeys.detail(id), 'audit'] as const,
};

// Hook to get all cases
export const useCases = (params?: {
  status?: CaseStatus;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: caseKeys.list(params || {}),
    queryFn: () => caseService.getCases(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook to get a specific case
export const useCase = (id: string) => {
  return useQuery({
    queryKey: caseKeys.detail(id),
    queryFn: () => caseService.getCaseById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Hook to get AI summary for a case
export const useAISummary = (id: string) => {
  return useQuery({
    queryKey: caseKeys.aiSummary(id),
    queryFn: () => caseService.getAISummary(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
};

// Hook to get audit trail for a case
export const useAuditTrail = (id: string) => {
  return useQuery({
    queryKey: caseKeys.auditTrail(id),
    queryFn: () => caseService.getAuditTrail(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook to create a new case
export const useCreateCase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationData: ApplicationData) => 
      caseService.createCase(applicationData),
    onSuccess: () => {
      // Invalidate and refetch cases list
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
    },
  });
};

// Hook to update case status
export const useUpdateCaseStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CaseStatus }) =>
      caseService.updateCaseStatus(id, status),
    onSuccess: (data) => {
      // Update the specific case in cache
      queryClient.setQueryData(caseKeys.detail(data.id), data);
      // Invalidate cases list to reflect status change
      queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
    },
  });
};

// Hook to add a case note
export const useAddCaseNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      caseService.addCaseNote(id, content),
    onSuccess: (data) => {
      // Update the specific case in cache
      queryClient.setQueryData(caseKeys.detail(data.id), data);
      // Invalidate AI summary as it may need to be regenerated
      queryClient.invalidateQueries({ queryKey: caseKeys.aiSummary(data.id) });
    },
  });
};

// Hook to refresh AI insights
export const useRefreshAIInsights = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => caseService.refreshAIInsights(id),
    onSuccess: (_, id) => {
      // Invalidate AI summary to fetch the refreshed version
      queryClient.invalidateQueries({ queryKey: caseKeys.aiSummary(id) });
      // Also invalidate the case details as AI summaries are part of the case
      queryClient.invalidateQueries({ queryKey: caseKeys.detail(id) });
    },
  });
};