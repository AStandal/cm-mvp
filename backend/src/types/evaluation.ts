import { z } from 'zod';
import { ProcessStep } from './index.js';

// Validation schemas for AI Evaluation Framework

export const AIOperationSchema = z.enum([
  'generate_summary',
  'generate_recommendation', 
  'analyze_application',
  'generate_final_summary',
  'validate_completeness',
  'detect_missing_fields',
  'extract_zoning_requirements',
  'batch_process_zoning'
]);

export const DifficultyLevelSchema = z.enum(['easy', 'medium', 'hard']);

export const DatasetSourceTypeSchema = z.enum(['manual', 'captured_interactions', 'synthetic']);

export const EvaluationCriteriaSchema = z.object({
  faithfulness: z.number().min(1).max(10),
  completeness: z.number().min(1).max(10),
  relevance: z.number().min(1).max(10),
  clarity: z.number().min(1).max(10),
  taskSpecific: z.record(z.string(), z.number().min(1).max(10)).optional()
});

export const EvaluationInputSchema = z.object({
  caseData: z.any().optional(), // Case interface - using any for now to avoid circular deps
  applicationData: z.any().optional(), // ApplicationData interface
  step: z.nativeEnum(ProcessStep).optional(),
  context: z.record(z.string(), z.any()).optional(),
  prompt: z.string().optional()
});

export const EvaluationExpectedOutputSchema = z.object({
  content: z.string().min(1),
  quality: z.number().min(1).max(10),
  criteria: EvaluationCriteriaSchema
});

export const EvaluationExampleMetadataSchema = z.object({
  tags: z.array(z.string()),
  difficulty: DifficultyLevelSchema,
  createdAt: z.date(),
  sourceInteractionId: z.string().optional(),
  notes: z.string().optional()
});

export const EvaluationDatasetMetadataSchema = z.object({
  createdBy: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().int().positive(),
  tags: z.array(z.string()),
  difficulty: DifficultyLevelSchema,
  sourceType: DatasetSourceTypeSchema
});

export const EvaluationDatasetStatisticsSchema = z.object({
  totalExamples: z.number().int().nonnegative(),
  averageQuality: z.number().min(0).max(10),
  difficultyDistribution: z.record(z.string(), z.number().nonnegative())
});

export const EvaluationExampleSchema = z.object({
  id: z.string().min(1),
  datasetId: z.string().min(1),
  input: EvaluationInputSchema,
  expectedOutput: EvaluationExpectedOutputSchema,
  metadata: EvaluationExampleMetadataSchema
});

export const EvaluationDatasetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  operation: AIOperationSchema,
  examples: z.array(EvaluationExampleSchema),
  metadata: EvaluationDatasetMetadataSchema,
  statistics: EvaluationDatasetStatisticsSchema
});

// Request/Response schemas for API endpoints
export const CreateDatasetRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  operation: AIOperationSchema,
  metadata: z.object({
    createdBy: z.string().min(1),
    tags: z.array(z.string()).default([]),
    difficulty: DifficultyLevelSchema.default('medium'),
    sourceType: DatasetSourceTypeSchema.default('manual')
  })
});

export const AddExampleRequestSchema = z.object({
  input: EvaluationInputSchema,
  expectedOutput: EvaluationExpectedOutputSchema,
  metadata: z.object({
    tags: z.array(z.string()).default([]),
    difficulty: DifficultyLevelSchema.default('medium'),
    sourceInteractionId: z.string().optional(),
    notes: z.string().optional()
  }).default({})
});

// Judge Evaluation Schemas
export const JudgeEvaluationScoresSchema = z.object({
  overall: z.number().min(1).max(10),
  faithfulness: z.number().min(1).max(10),
  completeness: z.number().min(1).max(10),
  relevance: z.number().min(1).max(10),
  clarity: z.number().min(1).max(10),
  taskSpecific: z.record(z.string(), z.number().min(1).max(10)).optional()
});

export const JudgeEvaluationReasoningSchema = z.object({
  overall: z.string().min(1),
  faithfulness: z.string().min(1),
  completeness: z.string().min(1),
  relevance: z.string().min(1),
  clarity: z.string().min(1),
  taskSpecific: z.record(z.string(), z.string()).optional()
});

export const JudgeEvaluationMetadataSchema = z.object({
  evaluatedAt: z.date(),
  evaluationDuration: z.number().nonnegative(),
  evaluationCost: z.number().nonnegative().optional(),
  evaluationTokens: z.number().int().nonnegative().optional(),
  confidence: z.number().min(0).max(1),
  flags: z.array(z.string()).default([])
});

export const JudgeEvaluationResultSchema = z.object({
  id: z.string().min(1),
  interactionId: z.string().min(1),
  evaluationModel: z.string().min(1),
  scores: JudgeEvaluationScoresSchema,
  reasoning: JudgeEvaluationReasoningSchema,
  metadata: JudgeEvaluationMetadataSchema
});

export const JudgeEvaluationInputSchema = z.object({
  interactionId: z.string().min(1),
  evaluationModel: z.string().min(1),
  criteria: z.array(z.enum(['faithfulness', 'completeness', 'relevance', 'clarity'])).default(['faithfulness', 'completeness', 'relevance', 'clarity']),
  customCriteria: z.record(z.string(), z.string()).optional(),
  promptTemplate: z.string().optional(),
  fewShotExamples: z.array(z.object({
    input: z.string(),
    output: z.string(),
    score: z.number().min(1).max(10),
    reasoning: z.string()
  })).optional()
});

export const EvaluateOutputRequestSchema = z.object({
  input: JudgeEvaluationInputSchema,
  options: z.object({
    includeBiasMitigation: z.boolean().default(true),
    includeChainOfThought: z.boolean().default(true),
    maxRetries: z.number().int().min(0).max(5).default(3),
    timeoutMs: z.number().int().positive().default(30000)
  }).default({})
});

export const BatchEvaluateRequestSchema = z.object({
  inputs: z.array(JudgeEvaluationInputSchema).min(1).max(100),
  evaluationModel: z.string().min(1),
  options: z.object({
    includeBiasMitigation: z.boolean().default(true),
    includeChainOfThought: z.boolean().default(true),
    maxRetries: z.number().int().min(0).max(5).default(3),
    timeoutMs: z.number().int().positive().default(30000),
    rateLimitDelayMs: z.number().int().nonnegative().default(1000)
  }).default({})
});

export const EvaluationModelConfigSchema = z.object({
  modelName: z.string().min(1),
  provider: z.enum(['openrouter', 'openai', 'anthropic']).default('openrouter'),
  temperature: z.number().min(0).max(2).default(0.1),
  maxTokens: z.number().int().positive().default(2000),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional()
});

export const AvailableEvaluationModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  description: z.string().optional(),
  costPer1kTokens: z.number().nonnegative().optional(),
  maxTokens: z.number().int().positive().optional(),
  supportedCriteria: z.array(z.string()).default(['faithfulness', 'completeness', 'relevance', 'clarity']),
  recommended: z.boolean().default(false)
});

// Type inference from schemas
export type CreateDatasetRequest = z.infer<typeof CreateDatasetRequestSchema>;
export type AddExampleRequest = z.infer<typeof AddExampleRequestSchema>;
export type EvaluationCriteria = z.infer<typeof EvaluationCriteriaSchema>;
export type EvaluationInput = z.infer<typeof EvaluationInputSchema>;
export type EvaluationExpectedOutput = z.infer<typeof EvaluationExpectedOutputSchema>;

// Judge Evaluation Types
export type JudgeEvaluationScores = z.infer<typeof JudgeEvaluationScoresSchema>;
export type JudgeEvaluationReasoning = z.infer<typeof JudgeEvaluationReasoningSchema>;
export type JudgeEvaluationMetadata = z.infer<typeof JudgeEvaluationMetadataSchema>;
export type JudgeEvaluationResult = z.infer<typeof JudgeEvaluationResultSchema>;
export type JudgeEvaluationInput = z.infer<typeof JudgeEvaluationInputSchema>;
export type EvaluateOutputRequest = z.infer<typeof EvaluateOutputRequestSchema>;
export type BatchEvaluateRequest = z.infer<typeof BatchEvaluateRequestSchema>;
export type EvaluationModelConfig = z.infer<typeof EvaluationModelConfigSchema>;
export type AvailableEvaluationModel = z.infer<typeof AvailableEvaluationModelSchema>;