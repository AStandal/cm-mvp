// Core TypeScript interfaces for the AI Case Management System

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
  operation: 'generate_summary' | 'generate_recommendation' | 'analyze_application' | 'generate_final_summary';
  prompt: string;
  response: string;
  model: string;
  tokensUsed: number;
  cost?: number;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: Date;
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
  completeness: number;
  missingFields: string[];
  suggestedActions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
}

export interface FinalSummary {
  caseId: string;
  decision: string;
  rationale: string;
  keyDecisions: string[];
  processHistory: string[];
  generatedAt: Date;
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