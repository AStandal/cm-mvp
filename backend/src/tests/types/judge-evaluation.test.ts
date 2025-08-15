import { describe, it, expect } from 'vitest';
import {
  JudgeEvaluationScoresSchema,
  JudgeEvaluationReasoningSchema,
  JudgeEvaluationMetadataSchema,
  JudgeEvaluationResultSchema,
  JudgeEvaluationInputSchema,
  EvaluateOutputRequestSchema,
  BatchEvaluateRequestSchema,
  EvaluationModelConfigSchema,
  AvailableEvaluationModelSchema,
  type JudgeEvaluationResult,
  type JudgeEvaluationInput,
  type EvaluateOutputRequest,
  type BatchEvaluateRequest,
  type EvaluationModelConfig,
  type AvailableEvaluationModel
} from '../../types/evaluation.js';

describe('Judge Evaluation Types', () => {
  describe('JudgeEvaluationScores', () => {
    it('should validate correct scores', () => {
      const validScores = {
        overall: 8,
        faithfulness: 9,
        completeness: 7,
        relevance: 8,
        clarity: 6,
        taskSpecific: {
          accuracy: 9,
          completeness: 8
        }
      };

      const result = JudgeEvaluationScoresSchema.safeParse(validScores);
      expect(result.success).toBe(true);
    });

    it('should reject scores outside 1-10 range', () => {
      const invalidScores = {
        overall: 11,
        faithfulness: 0,
        completeness: 7,
        relevance: 8,
        clarity: 6
      };

      const result = JudgeEvaluationScoresSchema.safeParse(invalidScores);
      expect(result.success).toBe(false);
    });

    it('should require core scoring dimensions', () => {
      const incompleteScores = {
        overall: 8,
        faithfulness: 9
        // missing required fields
      };

      const result = JudgeEvaluationScoresSchema.safeParse(incompleteScores);
      expect(result.success).toBe(false);
    });
  });

  describe('JudgeEvaluationReasoning', () => {
    it('should validate correct reasoning', () => {
      const validReasoning = {
        overall: 'The response demonstrates good quality overall',
        faithfulness: 'The response accurately reflects the input information',
        completeness: 'Most required information is present',
        relevance: 'The response addresses the main question',
        clarity: 'The response is mostly clear but could be improved',
        taskSpecific: {
          accuracy: 'High accuracy in data extraction',
          completeness: 'All required fields identified'
        }
      };

      const result = JudgeEvaluationReasoningSchema.safeParse(validReasoning);
      expect(result.success).toBe(true);
    });

    it('should reject empty reasoning strings', () => {
      const invalidReasoning = {
        overall: '',
        faithfulness: 'Valid reasoning',
        completeness: 'Valid reasoning',
        relevance: 'Valid reasoning',
        clarity: 'Valid reasoning'
      };

      const result = JudgeEvaluationReasoningSchema.safeParse(invalidReasoning);
      expect(result.success).toBe(false);
    });
  });

  describe('JudgeEvaluationMetadata', () => {
    it('should validate correct metadata', () => {
      const validMetadata = {
        evaluatedAt: new Date(),
        evaluationDuration: 1500,
        evaluationCost: 0.05,
        evaluationTokens: 250,
        confidence: 0.85,
        flags: ['high_confidence', 'consistent_scoring']
      };

      const result = JudgeEvaluationMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('should reject invalid confidence values', () => {
      const invalidMetadata = {
        evaluatedAt: new Date(),
        evaluationDuration: 1500,
        confidence: 1.5, // Invalid: > 1
        flags: []
      };

      const result = JudgeEvaluationMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
    });

    it('should default flags to empty array', () => {
      const metadataWithoutFlags = {
        evaluatedAt: new Date(),
        evaluationDuration: 1500,
        confidence: 0.85
      };

      const result = JudgeEvaluationMetadataSchema.safeParse(metadataWithoutFlags);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.flags).toEqual([]);
      }
    });
  });

  describe('JudgeEvaluationResult', () => {
    it('should validate complete evaluation result', () => {
      const validResult: JudgeEvaluationResult = {
        id: 'eval-123',
        interactionId: 'interaction-456',
        evaluationModel: 'gpt-4',
        scores: {
          overall: 8,
          faithfulness: 9,
          completeness: 7,
          relevance: 8,
          clarity: 6
        },
        reasoning: {
          overall: 'Good overall quality',
          faithfulness: 'Accurate information',
          completeness: 'Most information present',
          relevance: 'Addresses the question',
          clarity: 'Could be clearer'
        },
        metadata: {
          evaluatedAt: new Date(),
          evaluationDuration: 1500,
          confidence: 0.85,
          flags: []
        }
      };

      const result = JudgeEvaluationResultSchema.safeParse(validResult);
      expect(result.success).toBe(true);
    });
  });

  describe('JudgeEvaluationInput', () => {
    it('should validate evaluation input with defaults', () => {
      const validInput = {
        interactionId: 'interaction-123',
        evaluationModel: 'gpt-4'
      };

      const result = JudgeEvaluationInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.criteria).toEqual(['faithfulness', 'completeness', 'relevance', 'clarity']);
      }
    });

    it('should validate evaluation input with custom criteria', () => {
      const validInput = {
        interactionId: 'interaction-123',
        evaluationModel: 'gpt-4',
        criteria: ['faithfulness', 'relevance'],
        customCriteria: {
          accuracy: 'How accurate is the information?',
          completeness: 'How complete is the response?'
        }
      };

      const result = JudgeEvaluationInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate evaluation input with few-shot examples', () => {
      const validInput = {
        interactionId: 'interaction-123',
        evaluationModel: 'gpt-4',
        fewShotExamples: [
          {
            input: 'Sample input',
            output: 'Sample output',
            score: 8,
            reasoning: 'Good quality response'
          }
        ]
      };

      const result = JudgeEvaluationInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe('EvaluateOutputRequest', () => {
    it('should validate request with defaults', () => {
      const validRequest = {
        input: {
          interactionId: 'interaction-123',
          evaluationModel: 'gpt-4'
        }
      };

      const result = EvaluateOutputRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.options.includeBiasMitigation).toBe(true);
        expect(result.data.options.includeChainOfThought).toBe(true);
        expect(result.data.options.maxRetries).toBe(3);
        expect(result.data.options.timeoutMs).toBe(30000);
      }
    });

    it('should validate request with custom options', () => {
      const validRequest = {
        input: {
          interactionId: 'interaction-123',
          evaluationModel: 'gpt-4'
        },
        options: {
          includeBiasMitigation: false,
          includeChainOfThought: true,
          maxRetries: 1,
          timeoutMs: 15000
        }
      };

      const result = EvaluateOutputRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('BatchEvaluateRequest', () => {
    it('should validate batch request', () => {
      const validRequest = {
        inputs: [
          {
            interactionId: 'interaction-1',
            evaluationModel: 'gpt-4'
          },
          {
            interactionId: 'interaction-2',
            evaluationModel: 'gpt-4'
          }
        ],
        evaluationModel: 'gpt-4'
      };

      const result = BatchEvaluateRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject empty inputs array', () => {
      const invalidRequest = {
        inputs: [],
        evaluationModel: 'gpt-4'
      };

      const result = BatchEvaluateRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject too many inputs', () => {
      const tooManyInputs = Array.from({ length: 101 }, (_, i) => ({
        interactionId: `interaction-${i}`,
        evaluationModel: 'gpt-4'
      }));

      const invalidRequest = {
        inputs: tooManyInputs,
        evaluationModel: 'gpt-4'
      };

      const result = BatchEvaluateRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('EvaluationModelConfig', () => {
    it('should validate model config with defaults', () => {
      const validConfig = {
        modelName: 'gpt-4'
      };

      const result = EvaluationModelConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe('openrouter');
        expect(result.data.temperature).toBe(0.1);
        expect(result.data.maxTokens).toBe(2000);
      }
    });

    it('should validate model config with custom settings', () => {
      const validConfig = {
        modelName: 'claude-3-opus',
        provider: 'anthropic' as const,
        temperature: 0.2,
        maxTokens: 4000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
      };

      const result = EvaluationModelConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid temperature values', () => {
      const invalidConfig = {
        modelName: 'gpt-4',
        temperature: 3.0 // Invalid: > 2
      };

      const result = EvaluationModelConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('AvailableEvaluationModel', () => {
    it('should validate available model', () => {
      const validModel: AvailableEvaluationModel = {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'OpenAI',
        description: 'Advanced language model for evaluation',
        costPer1kTokens: 0.03,
        maxTokens: 8192,
        supportedCriteria: ['faithfulness', 'completeness', 'relevance', 'clarity'],
        recommended: true
      };

      const result = AvailableEvaluationModelSchema.safeParse(validModel);
      expect(result.success).toBe(true);
    });

    it('should validate minimal model info', () => {
      const minimalModel = {
        id: 'claude-3',
        name: 'Claude 3',
        provider: 'Anthropic'
      };

      const result = AvailableEvaluationModelSchema.safeParse(minimalModel);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.supportedCriteria).toEqual(['faithfulness', 'completeness', 'relevance', 'clarity']);
        expect(result.data.recommended).toBe(false);
      }
    });
  });

  describe('Type Inference', () => {
    it('should infer types correctly', () => {
      // This test ensures TypeScript type inference works correctly
      const result: JudgeEvaluationResult = {
        id: 'eval-123',
        interactionId: 'interaction-456',
        evaluationModel: 'gpt-4',
        scores: {
          overall: 8,
          faithfulness: 9,
          completeness: 7,
          relevance: 8,
          clarity: 6
        },
        reasoning: {
          overall: 'Good overall quality',
          faithfulness: 'Accurate information',
          completeness: 'Most information present',
          relevance: 'Addresses the question',
          clarity: 'Could be clearer'
        },
        metadata: {
          evaluatedAt: new Date(),
          evaluationDuration: 1500,
          confidence: 0.85,
          flags: []
        }
      };

      // Type assertions to ensure correct inference
      expect(typeof result.id).toBe('string');
      expect(typeof result.scores.overall).toBe('number');
      expect(typeof result.reasoning.overall).toBe('string');
      expect(result.metadata.evaluatedAt).toBeInstanceOf(Date);
      expect(Array.isArray(result.metadata.flags)).toBe(true);
    });
  });
});