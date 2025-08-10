export interface Case {
  id: string;
  application_data: string; // JSON string
  status: CaseStatus;
  current_step: ProcessStep;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  assigned_to?: string;
}

export interface AISummary {
  id: string;
  case_id: string;
  type: 'overall' | 'step-specific';
  step?: ProcessStep;
  content: string;
  recommendations: string; // JSON array string
  confidence?: number;
  generated_at: string; // ISO date string
  version: number;
}

export interface CaseNote {
  id: string;
  case_id: string;
  content: string;
  created_by: string;
  created_at: string; // ISO date string
}

export interface AuditEntry {
  id: string;
  case_id: string;
  action: string;
  details?: string; // JSON string
  user_id: string;
  timestamp: string; // ISO date string
}

export interface AIInteraction {
  id: string;
  case_id: string;
  operation: 'generate_summary' | 'generate_recommendation' | 'analyze_application' | 'generate_final_summary' | 'validate_completeness' | 'detect_missing_fields';
  prompt: string;
  response: string;
  model: string;
  tokens_used?: number;
  cost?: number;
  duration: number; // milliseconds
  success: boolean;
  error?: string;
  timestamp: string; // ISO date string
  step_context?: string; // ProcessStep context
  prompt_template?: string; // Template used for prompt generation
  prompt_version?: string; // Version of the prompt template
}

export enum CaseStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn',
  ARCHIVED = 'archived'
}

export enum ProcessStep {
  RECEIVED = 'received',
  IN_REVIEW = 'in_review',
  ADDITIONAL_INFO_REQUIRED = 'additional_info_required',
  READY_FOR_DECISION = 'ready_for_decision',
  CONCLUDED = 'concluded'
}

export interface ApplicationData {
  applicantName: string;
  applicantEmail: string;
  applicationType: string;
  submissionDate: string; // ISO date string
  documents: Document[];
  formData: Record<string, any>;
}

export interface Document {
  id: string;
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  uploadedAt: string; // ISO date string
}

export interface AIEvaluationRow {
  id: string;
  case_id: string;
  subject_type: 'summary';
  subject_id: string;
  operation: 'generate_summary' | 'generate_recommendation' | 'analyze_application' | 'generate_final_summary' | 'validate_completeness' | 'detect_missing_fields';
  judge_model: string;
  rubric_version: string;
  criteria_scores: string; // JSON string of AIEvaluationCriteriaScores
  overall_score: number;
  verdict: 'pass' | 'fail' | 'needs_review';
  comments?: string;
  created_at: string; // ISO date
}