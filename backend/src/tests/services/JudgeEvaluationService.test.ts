import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JudgeEvaluationService } from '../../services/JudgeEvaluationService.js';
import { OpenRouterClient } from '../../services/OpenRouterClient.js';
import { PromptTemplateService } from '../../services/PromptTemplateService.js';
import { DatabaseConnection } from '../../database/connection.js';
import { DatabaseSchema } from '../../database/schema.js';
import { EvaluateOutputRequest, JudgeEvaluationResult } from '../../types/evaluation.js';
import { randomUUID } from 'crypto';

describe('JudgeEvaluationService', () => {
  let service: JudgeEvaluationService;
  let mockOpenRouterClient: OpenRouterClient;
  let mockPromptTemplateService: PromptTemplateService;
  let db: DatabaseConnection;

  beforeEach(async () => {
    // Initialize in-memory database
    db = DatabaseConnection.getInstance(':memory:');
    const schema = new DatabaseSchema();
    schema.initializeSchema();

    // Create mock OpenRouter client
    mockOpenRouterClient = {
      makeRequest: vi.fn(),
      getModels: vi.fn(),
      updateConfig: vi.fn(),
      testConnection: vi.fn(),
      getConfig: vi.fn()
    } as any;

    // Create mock PromptTemplateService
    mockPromptTemplateService = {
      registerTemplate: vi.fn(),
      generatePrompt: vi.fn(),
      getTemplateParameters: vi.fn(),
      validateResponse: vi.fn()
    } as any;

    // Create service instance
    service = new JudgeEvaluationService(mockOpenRouterClient, mockPromptTemplateService);
  });

  describe('constructor', () => {
    it('should initialize with OpenRouterClient and PromptTemplateService', () => {
      expect(service).toBeInstanceOf(JudgeEvaluationService);
      expect(mockPromptTemplateService.registerTemplate).toHaveBeenCalledTimes(2); // Two templates registered
    });

    it('should create default PromptTemplateService if not provided', () => {
      const serviceWithDefaults = new JudgeEvaluationService(mockOpenRouterClient);
      expect(serviceWithDefaults).toBeInstanceOf(JudgeEvaluationService);
    });
  });

  describe('evaluateOutput', () => {
    beforeEach(() => {
      // Setup case first (required for foreign key)
      const caseId = 'test-case-123';
      const caseStmt = db.prepare(`
        INSERT INTO cases (
          id, application_data, status, current_step, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      caseStmt.run(
        caseId,
        JSON.stringify({ applicantName: 'Test User', applicantEmail: 'test@example.com' }),
        'active',
        'in_review',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Setup AI interaction in database
      const interactionId = 'test-interaction-123';
      const stmt = db.prepare(`
        INSERT INTO ai_interactions (
          id, case_id, operation, prompt, response, model, tokens_used, 
          cost, duration, success, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        interactionId,
        caseId,
        'generate_summary',
        'Please summarize this case',
        'This is a test AI response that needs evaluation',
        'gpt-4',
        150,
        0.05,
        1500,
        1, // true as 1 for SQLite
        new Date().toISOString()
      );

      // Mock template service responses
      vi.mocked(mockPromptTemplateService.generatePrompt).mockReturnValue(
        'Mock evaluation prompt with input and response'
      );
      vi.mocked(mockPromptTemplateService.getTemplateParameters).mockReturnValue({
        temperature: 0.1,
        max_tokens: 2000
      });

      // Mock OpenRouter response
      vi.mocked(mockOpenRouterClient.makeRequest).mockResolvedValue({
        content: JSON.stringify({
          scores: {
            overall: 8,
            faithfulness: 9,
            completeness: 7,
            relevance: 8,
            clarity: 6
          },
          reasoning: {
            overall: 'Good overall quality with room for improvement in clarity',
            faithfulness: 'Response accurately reflects the input information',
            completeness: 'Most required information is present',
            relevance: 'Response addresses the main question',
            clarity: 'Response could be clearer and better structured'
          }
        }),
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 50 },
        cost: 0.02,
        duration: 2000
      });
    });

    it('should evaluate AI output successfully', async () => {
      const request: EvaluateOutputRequest = {
        input: {
          interactionId: 'test-interaction-123',
          evaluationModel: 'gpt-4'
        }
      };

      const result = await service.evaluateOutput(request);

      expect(result).toMatchObject({
        interactionId: 'test-interaction-123',
        evaluationModel: 'gpt-4',
        scores: {
          overall: 8,
          faithfulness: 9,
          completeness: 7,
          relevance: 8,
          clarity: 6
        },
        reasoning: {
          overall: expect.any(String),
          faithfulness: expect.any(String),
          completeness: expect.any(String),
          relevance: expect.any(String),
          clarity: expect.any(String)
        }
      });

      expect(result.metadata).toMatchObject({
        evaluatedAt: expect.any(Date),
        evaluationDuration: expect.any(Number),
        confidence: expect.any(Number),
        flags: expect.any(Array)
      });

      expect(mockOpenRouterClient.makeRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          temperature: 0.1,
          max_tokens: 2000
        })
      );
    });

    it('should use chain-of-thought template when requested', async () => {
      const request: EvaluateOutputRequest = {
        input: {
          interactionId: 'test-interaction-123',
          evaluationModel: 'gpt-4'
        },
        options: {
          includeChainOfThought: true
        }
      };

      await service.evaluateOutput(request);

      expect(mockPromptTemplateService.generatePrompt).toHaveBeenCalledWith(
        'judge_evaluation_cot_v1',
        expect.any(Object)
      );
    });

    it('should use basic template when chain-of-thought is disabled', async () => {
      const request: EvaluateOutputRequest = {
        input: {
          interactionId: 'test-interaction-123',
          evaluationModel: 'gpt-4'
        },
        options: {
          includeChainOfThought: false
        }
      };

      await service.evaluateOutput(request);

      expect(mockPromptTemplateService.generatePrompt).toHaveBeenCalledWith(
        'judge_evaluation_v1',
        expect.any(Object)
      );
    });

    it('should handle custom criteria', async () => {
      const request: EvaluateOutputRequest = {
        input: {
          interactionId: 'test-interaction-123',
          evaluationModel: 'gpt-4',
          customCriteria: {
            accuracy: 'How accurate is the information?',
            completeness: 'How complete is the response?'
          }
        }
      };

      await service.evaluateOutput(request);

      expect(mockPromptTemplateService.generatePrompt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          customCriteria: {
            accuracy: 'How accurate is the information?',
            completeness: 'How complete is the response?'
          }
        })
      );
    });

    it('should handle few-shot examples', async () => {
      const fewShotExamples = [
        {
          input: 'Sample input',
          output: 'Sample output',
          score: 8,
          reasoning: 'Good quality response'
        }
      ];

      const request: EvaluateOutputRequest = {
        input: {
          interactionId: 'test-interaction-123',
          evaluationModel: 'gpt-4',
          fewShotExamples
        }
      };

      await service.evaluateOutput(request);

      expect(mockPromptTemplateService.generatePrompt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          fewShotExamples
        })
      );
    });

    it('should calculate overall score when not provided', async () => {
      // Mock response without overall score
      vi.mocked(mockOpenRouterClient.makeRequest).mockResolvedValue({
        content: JSON.stringify({
          scores: {
            faithfulness: 8,
            completeness: 6,
            relevance: 9,
            clarity: 7
          },
          reasoning: {
            overall: 'Good overall quality',
            faithfulness: 'Accurate information',
            completeness: 'Most information present',
            relevance: 'Addresses the question',
            clarity: 'Could be clearer'
          }
        }),
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 50 },
        cost: 0.02,
        duration: 2000
      });

      const request: EvaluateOutputRequest = {
        input: {
          interactionId: 'test-interaction-123',
          evaluationModel: 'gpt-4'
        }
      };

      const result = await service.evaluateOutput(request);

      // Should calculate overall as average: (8+6+9+7)/4 = 7.5 -> 8 (rounded)
      expect(result.scores.overall).toBe(8);
    });

    it('should generate appropriate quality flags', async () => {
      // Mock high quality response
      vi.mocked(mockOpenRouterClient.makeRequest).mockResolvedValue({
        content: JSON.stringify({
          scores: {
            overall: 9,
            faithfulness: 9,
            completeness: 9,
            relevance: 9,
            clarity: 8
          },
          reasoning: {
            overall: 'Excellent quality',
            faithfulness: 'Highly accurate',
            completeness: 'Complete information',
            relevance: 'Very relevant',
            clarity: 'Clear and well-structured'
          }
        }),
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 50 },
        cost: 0.02,
        duration: 2000
      });

      const request: EvaluateOutputRequest = {
        input: {
          interactionId: 'test-interaction-123',
          evaluationModel: 'gpt-4'
        }
      };

      const result = await service.evaluateOutput(request);

      expect(result.metadata.flags).toContain('high_quality');
      expect(result.metadata.flags).toContain('consistent_quality');
    });

    it('should handle evaluation errors gracefully', async () => {
      vi.mocked(mockOpenRouterClient.makeRequest).mockRejectedValue(
        new Error('API request failed')
      );

      const request: EvaluateOutputRequest = {
        input: {
          interactionId: 'test-interaction-123',
          evaluationModel: 'gpt-4'
        }
      };

      await expect(service.evaluateOutput(request)).rejects.toThrow(
        'Failed to evaluate output'
      );
    });

    it('should handle non-existent interaction', async () => {
      const request: EvaluateOutputRequest = {
        input: {
          interactionId: 'non-existent-interaction',
          evaluationModel: 'gpt-4'
        }
      };

      await expect(service.evaluateOutput(request)).rejects.toThrow(
        'AI interaction with ID non-existent-interaction not found'
      );
    });

    it('should handle malformed AI response', async () => {
      vi.mocked(mockOpenRouterClient.makeRequest).mockResolvedValue({
        content: 'This is not valid JSON',
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 50 },
        cost: 0.02,
        duration: 2000
      });

      const request: EvaluateOutputRequest = {
        input: {
          interactionId: 'test-interaction-123',
          evaluationModel: 'gpt-4'
        }
      };

      await expect(service.evaluateOutput(request)).rejects.toThrow(
        'Failed to evaluate output'
      );
    });

    it('should retry on failure', async () => {
      // First call fails, second succeeds
      vi.mocked(mockOpenRouterClient.makeRequest)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          content: JSON.stringify({
            scores: {
              overall: 7,
              faithfulness: 8,
              completeness: 6,
              relevance: 7,
              clarity: 7
            },
            reasoning: {
              overall: 'Good quality',
              faithfulness: 'Accurate',
              completeness: 'Mostly complete',
              relevance: 'Relevant',
              clarity: 'Clear enough'
            }
          }),
          model: 'gpt-4',
          tokensUsed: { input: 100, output: 50 },
          cost: 0.02,
          duration: 2000
        });

      const request: EvaluateOutputRequest = {
        input: {
          interactionId: 'test-interaction-123',
          evaluationModel: 'gpt-4'
        },
        options: {
          maxRetries: 2
        }
      };

      const result = await service.evaluateOutput(request);

      expect(result.scores.overall).toBe(7);
      expect(mockOpenRouterClient.makeRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAvailableEvaluationModels', () => {
    it('should return available models from OpenRouter', async () => {
      const mockModels = [
        {
          id: 'openai/gpt-4',
          name: 'GPT-4',
          description: 'Advanced language model',
          context_length: 8192,
          pricing: { prompt: '0.03', completion: '0.06' },
          top_provider: { max_completion_tokens: 4096, is_moderated: false }
        },
        {
          id: 'anthropic/claude-3-opus',
          name: 'Claude 3 Opus',
          description: 'Highly capable model',
          context_length: 4096,
          pricing: { prompt: '0.015', completion: '0.075' },
          top_provider: { max_completion_tokens: 4096, is_moderated: false }
        }
      ];

      vi.mocked(mockOpenRouterClient.getModels).mockResolvedValue(mockModels);

      const models = await service.getAvailableEvaluationModels();

      expect(models).toHaveLength(2);
      expect(models[0]).toMatchObject({
        id: 'openai/gpt-4',
        name: 'GPT-4',
        provider: 'OpenAI',
        costPer1kTokens: 0.03,
        maxTokens: 8192,
        recommended: true
      });
    });

    it('should return default models when API fails', async () => {
      vi.mocked(mockOpenRouterClient.getModels).mockRejectedValue(
        new Error('API failed')
      );

      const models = await service.getAvailableEvaluationModels();

      expect(models).toHaveLength(3);
      expect(models[0].id).toBe('openai/gpt-4');
      expect(models[1].id).toBe('anthropic/claude-3-opus');
      expect(models[2].id).toBe('openai/gpt-3.5-turbo');
    });
  });

  describe('configureEvaluationModel', () => {
    it('should update OpenRouter client configuration', () => {
      const config = {
        modelName: 'gpt-4',
        provider: 'openrouter' as const,
        temperature: 0.2,
        maxTokens: 3000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
      };

      service.configureEvaluationModel(config);

      expect(mockOpenRouterClient.updateConfig).toHaveBeenCalledWith({
        modelId: 'gpt-4',
        temperature: 0.2,
        maxTokens: 3000,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1
      });
    });

    it('should handle undefined optional properties', () => {
      const config = {
        modelName: 'gpt-4',
        provider: 'openrouter' as const,
        temperature: 0.1,
        maxTokens: 2000
      };

      service.configureEvaluationModel(config);

      expect(mockOpenRouterClient.updateConfig).toHaveBeenCalledWith({
        modelId: 'gpt-4',
        temperature: 0.1,
        maxTokens: 2000
      });
    });
  });

  describe('database integration', () => {
    it('should save evaluation results to database', async () => {
      // Setup case first (required for foreign key)
      const caseId = 'test-case-456';
      const caseStmt = db.prepare(`
        INSERT INTO cases (
          id, application_data, status, current_step, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      caseStmt.run(
        caseId,
        JSON.stringify({ applicantName: 'Test User', applicantEmail: 'test@example.com' }),
        'active',
        'in_review',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Setup AI interaction
      const interactionId = 'test-interaction-456';
      const stmt = db.prepare(`
        INSERT INTO ai_interactions (
          id, case_id, operation, prompt, response, model, tokens_used, 
          cost, duration, success, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        interactionId,
        caseId,
        'generate_summary',
        'Test prompt',
        'Test response',
        'gpt-4',
        100,
        0.03,
        1000,
        1, // true as 1 for SQLite
        new Date().toISOString()
      );

      // Mock successful evaluation
      vi.mocked(mockPromptTemplateService.generatePrompt).mockReturnValue('Mock prompt');
      vi.mocked(mockPromptTemplateService.getTemplateParameters).mockReturnValue({});
      vi.mocked(mockOpenRouterClient.makeRequest).mockResolvedValue({
        content: JSON.stringify({
          scores: { overall: 8, faithfulness: 8, completeness: 8, relevance: 8, clarity: 8 },
          reasoning: { overall: 'Good', faithfulness: 'Good', completeness: 'Good', relevance: 'Good', clarity: 'Good' }
        }),
        model: 'gpt-4',
        tokensUsed: { input: 50, output: 25 },
        cost: 0.01,
        duration: 1500
      });

      const request: EvaluateOutputRequest = {
        input: {
          interactionId,
          evaluationModel: 'gpt-4'
        }
      };

      const result = await service.evaluateOutput(request);

      // Verify result was saved to database
      const checkStmt = db.prepare('SELECT * FROM judge_evaluations WHERE id = ?');
      const savedResult = checkStmt.get(result.id);

      expect(savedResult).toBeTruthy();
      expect(savedResult.interaction_id).toBe(interactionId);
      expect(savedResult.evaluation_model).toBe('gpt-4');
    });
  });
});