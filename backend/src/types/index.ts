// Backend TypeScript interfaces for the AI Case Management System
// Re-export all types from shared types to maintain consistency

export enum ProcessStep {
  RECEIVED = 'received',
  IN_REVIEW = 'in_review',
  ADDITIONAL_INFO_REQUIRED = 'additional_info_required',
  READY_FOR_DECISION = 'ready_for_decision',
  CONCLUDED = 'concluded'
}

export enum CaseStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn',
  ARCHIVED = 'archived'
}

export interface CaseDocument {
  id: string;
  filename: string;
  path: string;
  uploadedAt: Date;
  size: number;
  mimeType: string;
}

export interface ApplicationData {
  applicantName: string;
  applicantEmail: string;
  applicationType: string;
  submissionDate: Date;
  documents: CaseDocument[];
  formData: Record<string, any>;
}

export interface CaseNote {
  id: string;
  caseId: string;
  content: string;
  createdBy: string;
  createdAt: Date;
}

export interface AuditEntry {
  id: string;
  caseId: string;
  action: string;
  details?: Record<string, any>;
  userId: string;
  timestamp: Date;
}

export interface AISummary {
  id: string;
  caseId: string;
  type: 'overall' | 'step-specific';
  step?: ProcessStep;
  content: string;
  recommendations: string[];
  confidence: number;
  generatedAt: Date;
  version: number;
}

export interface AIInteraction {
  id: string;
  caseId: string;
  operation: 'generate_summary' | 'generate_recommendation' | 'analyze_application' | 'generate_final_summary' | 'validate_completeness' | 'detect_missing_fields';
  prompt: string;
  response: string;
  model: string;
  tokensUsed: number;
  cost?: number;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: Date;
  stepContext?: ProcessStep;
  promptTemplate?: string;
  promptVersion?: string;
}

export interface Case {
  id: string;
  applicationData: ApplicationData;
  status: CaseStatus;
  currentStep: ProcessStep;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  notes: CaseNote[];
  aiSummaries: AISummary[];
  auditTrail: AuditEntry[];
}

export interface AIRecommendation {
  id: string;
  caseId: string;
  step: ProcessStep;
  recommendations: string[];
  priority: 'low' | 'medium' | 'high';
  confidence: number;
  generatedAt: Date;
}

export interface ApplicationAnalysis {
  summary: string;
  keyPoints: string[];
  potentialIssues: string[];
  recommendedActions: string[];
  priorityLevel: 'low' | 'medium' | 'high' | 'urgent';
  estimatedProcessingTime: string;
  requiredDocuments: string[];
  analysisTimestamp: Date;
}

export interface FinalSummary {
  overallSummary: string;
  keyDecisions: string[];
  outcomes: string[];
  processHistory: string[];
  recommendedDecision: 'approved' | 'denied' | 'requires_additional_info';
  supportingRationale: string[];
  generatedAt: Date;
}

export interface CompletenessValidation {
  isComplete: boolean;
  missingSteps: ProcessStep[];
  missingDocuments: string[];
  recommendations: string[];
  confidence: number;
  validatedAt: Date;
}

export interface MissingFieldsAnalysis {
  missingFields: {
    fieldName: string;
    fieldType: string;
    importance: 'required' | 'recommended' | 'optional';
    suggestedAction: string;
  }[];
  completenessScore: number;
  priorityActions: string[];
  estimatedCompletionTime: string;
  analysisTimestamp: Date;
}

export interface ActivityLog {
  id: string;
  caseId: string;
  action: string;
  details: Record<string, any>;
  userId: string;
  timestamp: Date;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

// Backend-specific service interfaces
export interface CaseService {
  createCase(applicationData: ApplicationData): Promise<Case>;
  updateCaseStatus(caseId: string, status: CaseStatus, userId: string): Promise<Case>;
  addCaseNote(caseId: string, note: string, userId: string): Promise<Case>;
  getCaseById(caseId: string): Promise<Case>;
  getCasesByStatus(status: CaseStatus): Promise<Case[]>;
}

export interface AIService {
  generateOverallSummary(caseData: Case): Promise<AISummary>;
  generateStepRecommendation(caseData: Case, step: ProcessStep): Promise<AIRecommendation>;
  analyzeApplication(applicationData: ApplicationData): Promise<ApplicationAnalysis>;
  generateFinalSummary(caseData: Case): Promise<FinalSummary>;
  validateCaseCompleteness(caseData: Case): Promise<CompletenessValidation>;
  detectMissingFields(applicationData: ApplicationData): Promise<MissingFieldsAnalysis>;
}

export interface AIEvaluationCriteriaScores {
  faithfulness: number; // factual alignment with case data (0-1)
  coverage: number;     // covers key details and recommendations (0-1)
  actionability: number; // recommendations are actionable (0-1)
  clarity: number;      // clarity, structure, readability (0-1)
  safety: number;       // avoids harmful or non-compliant content (0-1)
}

export interface AIEvaluation {
  id: string;
  caseId: string;
  subjectType: 'summary';
  subjectId: string; // e.g., ai_summaries.id
  operation: AIInteraction['operation'];
  judgeModel: string;
  rubricVersion: string;
  criteriaScores: AIEvaluationCriteriaScores;
  overallScore: number; // 0-1
  verdict: 'pass' | 'fail' | 'needs_review';
  comments?: string;
  createdAt: Date;
}

export interface DataService {
  saveCase(caseData: Case): Promise<void>;
  saveSummary(summary: AISummary): Promise<void>;
  getAuditTrail(caseId: string): Promise<AuditEntry[]>;
  logActivity(activity: ActivityLog): Promise<void>;
  logAIInteraction(interaction: AIInteraction): Promise<void>;
  getAIInteractionHistory(caseId: string): Promise<AIInteraction[]>;
  // Evaluation storage
  saveEvaluation(evaluation: AIEvaluation): Promise<void>;
  getEvaluationsByCase(caseId: string): Promise<AIEvaluation[]>;
}

// Re-export OpenRouter types
export * from './openrouter.js';