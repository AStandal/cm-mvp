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
  operation: AIOperation;
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

export interface DocumentProcessor {
  extractTextFromPDF(filePath: string): Promise<string>;
  processFolder(folderPath: string): Promise<ProcessingResult[]>;
  validateDocument(filePath: string): Promise<ValidationResult>;
}

export interface AIService {
  generateOverallSummary(caseData: Case): Promise<AISummary>;
  generateStepRecommendation(caseData: Case, step: ProcessStep): Promise<AIRecommendation>;
  analyzeApplication(applicationData: ApplicationData): Promise<ApplicationAnalysis>;
  generateFinalSummary(caseData: Case): Promise<FinalSummary>;
  validateCaseCompleteness(caseData: Case): Promise<CompletenessValidation>;
  detectMissingFields(applicationData: ApplicationData): Promise<MissingFieldsAnalysis>;
  extractZoningRequirements(documentBuffer: Buffer, documentMetadata: DocumentMetadata): Promise<ZoningPlan>;
  batchProcessZoningDocuments(folderPath: string): Promise<BatchProcessingResult>;
}

export interface DataService {
  saveCase(caseData: Case): Promise<void>;
  saveSummary(summary: AISummary): Promise<void>;
  getAuditTrail(caseId: string): Promise<AuditEntry[]>;
  logActivity(activity: ActivityLog): Promise<void>;
  logAIInteraction(interaction: AIInteraction): Promise<void>;
  getAIInteractionHistory(caseId: string): Promise<AIInteraction[]>;
  saveZoningPlan(plan: ZoningPlan): Promise<void>;
  getZoningPlan(planId: string): Promise<ZoningPlan | null>;
  getZoningRequirements(planId: string): Promise<ZoningRequirement[]>;
  searchZoningRequirements(criteria: SearchCriteria): Promise<ZoningRequirement[]>;
  updateZoningRequirement(requirementId: string, updates: Partial<ZoningRequirement>): Promise<void>;
}

// Zoning Requirements Types
export interface ZoningRequirement {
  id: string;
  planId: string;
  category: string;
  subcategory?: string;
  requirement: string;
  description: string;
  criteria: RequirementCriteria[];
  references: string[];
  priority: 'required' | 'recommended' | 'optional';
  applicableZones: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ZoningPlan {
  id: string;
  name: string;
  documentPath: string;
  documentHash: string;
  jurisdiction: string;
  effectiveDate: Date;
  version: string;
  requirements: ZoningRequirement[];
  extractionMetadata: ExtractionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequirementCriteria {
  id: string;
  type: 'numeric' | 'boolean' | 'text' | 'selection';
  name: string;
  description: string;
  value?: string | number | boolean;
  unit?: string;
  validValues?: string[];
  minValue?: number;
  maxValue?: number;
}

export interface ExtractionMetadata {
  extractedAt: Date;
  aiModel: string;
  promptTemplate: string;
  promptVersion: string;
  confidence: number;
  tokensUsed: number;
  processingDuration: number;
  documentPages: number;
  extractedRequirementsCount: number;
}

export interface DocumentMetadata {
  fileName: string;
  filePath: string;
  fileSize: number;
  pageCount: number;
  documentHash: string;
}

export interface ProcessingResult {
  documentPath: string;
  success: boolean;
  zoningPlan?: ZoningPlan;
  error?: string;
  processingTime: number;
}

export interface BatchProcessingResult {
  totalDocuments: number;
  successfulExtractions: number;
  failedExtractions: number;
  results: ProcessingResult[];
  totalProcessingTime: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SearchCriteria {
  planId?: string;
  category?: string;
  priority?: 'required' | 'recommended' | 'optional';
  jurisdiction?: string;
  applicableZones?: string[];
  textSearch?: string;
}

// Zoning-specific error codes
export enum ZoningErrorCodes {
  INVALID_PDF = 'INVALID_PDF',
  TEXT_EXTRACTION_FAILED = 'TEXT_EXTRACTION_FAILED',
  LLM_PROCESSING_FAILED = 'LLM_PROCESSING_FAILED',
  INVALID_RESPONSE_FORMAT = 'INVALID_RESPONSE_FORMAT',
  DATABASE_SAVE_FAILED = 'DATABASE_SAVE_FAILED',
  DUPLICATE_DOCUMENT = 'DUPLICATE_DOCUMENT',
  ZONING_PLAN_NOT_FOUND = 'ZONING_PLAN_NOT_FOUND',
  BATCH_PROCESSING_FAILED = 'BATCH_PROCESSING_FAILED'
}

// AI Evaluation Framework Types
export type AIOperation = 'generate_summary' | 'generate_recommendation' | 'analyze_application' | 'generate_final_summary' | 'validate_completeness' | 'detect_missing_fields' | 'extract_zoning_requirements' | 'batch_process_zoning';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type DatasetSourceType = 'manual' | 'captured_interactions' | 'synthetic';

export interface EvaluationDataset {
  id: string;
  name: string;
  description: string;
  operation: AIOperation;
  examples: EvaluationExample[];
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    tags: string[];
    difficulty: DifficultyLevel;
    sourceType: DatasetSourceType;
  };
  statistics: {
    totalExamples: number;
    averageQuality: number;
    difficultyDistribution: Record<string, number>;
  };
}

export interface EvaluationExample {
  id: string;
  datasetId: string;
  input: {
    caseData?: Case;
    applicationData?: ApplicationData;
    step?: ProcessStep;
    context?: Record<string, any>;
    prompt?: string;
  };
  expectedOutput: {
    content: string;
    quality: number; // 1-10 scale
    criteria: {
      faithfulness: number;
      completeness: number;
      relevance: number;
      clarity: number;
      taskSpecific?: Record<string, number>;
    };
  };
  metadata: {
    tags: string[];
    difficulty: DifficultyLevel;
    createdAt: Date;
    sourceInteractionId?: string;
    notes?: string;
  };
}

// Re-export OpenRouter types
export * from './openrouter.js';

// Re-export Evaluation types and schemas
export * from './evaluation.js';