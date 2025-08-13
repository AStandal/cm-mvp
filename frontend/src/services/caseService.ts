import api from './api';
import { Case, ApplicationData, CaseStatus } from '../types';

export const caseService = {
  // Get all cases with optional filtering
  getCases: async (params?: {
    status?: CaseStatus;
    search?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{ cases: Case[]; total: number; page: number; limit: number }> => {
    const response = await api.get('/cases', { params });
    return response.data.data;
  },

  // Get a specific case by ID
  getCaseById: async (id: string): Promise<Case> => {
    const response = await api.get(`/cases/${id}`);
    return response.data.data.case;
  },

  // Create a new case
  createCase: async (applicationData: ApplicationData): Promise<Case> => {
    try {
      const response = await api.post('/cases', { applicationData });
      
      // Handle the response structure from backend
      if (response.data && response.data.success && response.data.data && response.data.data.case) {
        return response.data.data.case;
      } else {
        throw new Error('Invalid response structure from server');
      }
    } catch (error: any) {
      // Enhanced error handling
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message || 'Failed to create case');
      }
      throw error;
    }
  },

  // Update case status
  updateCaseStatus: async (id: string, status: CaseStatus): Promise<Case> => {
    const response = await api.put(`/cases/${id}/status`, { status });
    return response.data.data.case;
  },

  // Add a note to a case
  addCaseNote: async (id: string, content: string): Promise<Case> => {
    const response = await api.post(`/cases/${id}/notes`, { content });
    return response.data.data.case;
  },

  // Get notes for a case
  getCaseNotes: async (id: string): Promise<any[]> => {
    const response = await api.get(`/cases/${id}/notes`);
    return response.data.data.notes;
  },

  // Get AI summary for a case
  getAISummary: async (id: string): Promise<any> => {
    const response = await api.get(`/cases/${id}/ai-summary`);
    return response.data.data;
  },

  // Refresh AI insights for a case
  refreshAIInsights: async (id: string): Promise<any> => {
    const response = await api.post(`/cases/${id}/ai-refresh`);
    return response.data.data;
  },

  // Get audit trail for a case
  getAuditTrail: async (id: string): Promise<any[]> => {
    const response = await api.get(`/cases/${id}/audit`);
    return response.data.data;
  },

  // Analyze application data
  analyzeApplication: async (applicationData: ApplicationData): Promise<any> => {
    try {
      const response = await api.post('/ai/analyze-application', { applicationData });
      
      // Handle the response structure from backend
      if (response.data && response.data.success && response.data.data && response.data.data.analysis) {
        return response.data.data.analysis;
      } else {
        throw new Error('Invalid response structure from AI analysis');
      }
    } catch (error: any) {
      // Enhanced error handling for AI analysis
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error.message || 'Failed to analyze application');
      }
      throw error;
    }
  },

  // Detect missing fields in application data
  detectMissingFields: async (applicationData: ApplicationData): Promise<any> => {
    const response = await api.post('/ai/detect-missing-fields', { applicationData });
    return response.data.data.missingFieldsAnalysis;
  },

  // Validate case completeness
  validateCaseCompleteness: async (caseData: any): Promise<any> => {
    const response = await api.post('/ai/validate-completeness', { caseData });
    return response.data.data.validation;
  },
};