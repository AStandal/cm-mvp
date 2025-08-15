import { z } from 'zod';
import { ProcessStep } from './index.js';

// Validation schemas for AI Evaluation Framework

export const AIOperationSchema = z.enum([
  'generate_summary',
  'generate_recommendation', 
  'analyze_application',
  'generate_final_summary',
  'validate_completeness',
  'detect_missing_fields'
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

// Type inference from schemas
export type CreateDatasetRequest = z.infer<typeof CreateDatasetRequestSchema>;
export type AddExampleRequest = z.infer<typeof AddExampleRequestSchema>;
export type EvaluationCriteria = z.infer<typeof EvaluationCriteriaSchema>;
export type EvaluationInput = z.infer<typeof EvaluationInputSchema>;
export type EvaluationExpectedOutput = z.infer<typeof EvaluationExpectedOutputSchema>;