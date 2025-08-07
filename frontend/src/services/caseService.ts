import api from './api';
import { Case, ApplicationData, CaseStatus } from '../types';

export const caseService = {
  // Get all cases with optional filtering
  getCases: async (params?: {
    status?: CaseStatus;
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
    const response = await api.post('/cases', { applicationData });
    return response.data.data.case;
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
};