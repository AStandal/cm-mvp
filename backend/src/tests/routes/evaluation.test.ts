import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { DatabaseConnection } from '../../database/connection.js';
import { DatabaseSchema } from '../../database/schema.js';

describe('Evaluation API Routes', () => {
  let db: DatabaseConnection;

  beforeEach(async () => {
    // Initialize test database
    db = DatabaseConnection.getInstance(':memory:');
    const schema = new DatabaseSchema();
    schema.initializeSchema();
  });

  afterEach(() => {
    // Clean up database connection
    db.close();
  });

  describe('POST /api/evaluation/datasets', () => {
    it('should create a new evaluation dataset', async () => {
      const datasetData = {
        name: 'Test Dataset',
        description: 'A test dataset for case summaries',
        operation: 'generate_summary',
        metadata: {
          createdBy: 'test-user',
          tags: ['test', 'summary'],
          difficulty: 'medium',
          sourceType: 'manual'
        }
      };

      const response = await request(app)
        .post('/api/evaluation/datasets')
        .send(datasetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataset).toBeDefined();
      expect(response.body.data.dataset.name).toBe('Test Dataset');
      expect(response.body.data.dataset.description).toBe('A test dataset for case summaries');
      expect(response.body.data.dataset.operation).toBe('generate_summary');
      expect(response.body.data.dataset.metadata.createdBy).toBe('test-user');
      expect(response.body.data.dataset.metadata.tags).toEqual(['test', 'summary']);
      expect(response.body.data.dataset.examples).toEqual([]);
      expect(response.body.data.dataset.statistics.totalExamples).toBe(0);
      expect(response.body.message).toBe('Evaluation dataset created successfully');
    });

    it('should create dataset with default values when optional fields are missing', async () => {
      const datasetData = {
        name: 'Minimal Dataset',
        operation: 'analyze_application',
        metadata: {
          createdBy: 'test-user'
        }
      };

      const response = await request(app)
        .post('/api/evaluation/datasets')
        .send(datasetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataset.description).toBe('');
      expect(response.body.data.dataset.metadata.tags).toEqual([]);
      expect(response.body.data.dataset.metadata.difficulty).toBe('medium');
      expect(response.body.data.dataset.metadata.sourceType).toBe('manual');
    });

    it('should return validation error for invalid input', async () => {
      const invalidData = {
        name: '', // Empty name should fail validation
        operation: 'invalid_operation',
        metadata: {
          createdBy: ''
        }
      };

      const response = await request(app)
        .post('/api/evaluation/datasets')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid input data');
      expect(response.body.error.details).toBeDefined();
    });

    it('should return validation error for missing required fields', async () => {
      const incompleteData = {
        name: 'Test Dataset'
        // Missing operation and metadata
      };

      const response = await request(app)
        .post('/api/evaluation/datasets')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/evaluation/datasets', () => {
    beforeEach(async () => {
      // Create test datasets
      await request(app)
        .post('/api/evaluation/datasets')
        .send({
          name: 'Summary Dataset',
          operation: 'generate_summary',
          metadata: { createdBy: 'user1', tags: ['summary'] }
        });

      await request(app)
        .post('/api/evaluation/datasets')
        .send({
          name: 'Analysis Dataset',
          operation: 'analyze_application',
          metadata: { createdBy: 'user2', tags: ['analysis'] }
        });

      await request(app)
        .post('/api/evaluation/datasets')
        .send({
          name: 'Another Summary Dataset',
          operation: 'generate_summary',
          metadata: { createdBy: 'user1', tags: ['summary', 'test'] }
        });
    });

    it('should list all datasets when no filters are provided', async () => {
      const response = await request(app)
        .get('/api/evaluation/datasets')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.datasets).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
    });

    it('should filter datasets by operation', async () => {
      const response = await request(app)
        .get('/api/evaluation/datasets?operation=generate_summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.datasets).toHaveLength(2);
      expect(response.body.data.datasets.every((d: any) => d.operation === 'generate_summary')).toBe(true);
    });

    it('should filter datasets by createdBy', async () => {
      const response = await request(app)
        .get('/api/evaluation/datasets?createdBy=user1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.datasets).toHaveLength(2);
      expect(response.body.data.datasets.every((d: any) => d.metadata.createdBy === 'user1')).toBe(true);
    });

    it('should filter datasets by tags', async () => {
      const response = await request(app)
        .get('/api/evaluation/datasets?tags=test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.datasets).toHaveLength(1);
      expect(response.body.data.datasets[0].name).toBe('Another Summary Dataset');
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get('/api/evaluation/datasets?limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.datasets).toHaveLength(2);
    });
  });

  describe('GET /api/evaluation/datasets/:id', () => {
    let datasetId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/evaluation/datasets')
        .send({
          name: 'Test Dataset',
          operation: 'generate_summary',
          metadata: { createdBy: 'test-user' }
        });
      datasetId = createResponse.body.data.dataset.id;
    });

    it('should retrieve an existing dataset', async () => {
      const response = await request(app)
        .get(`/api/evaluation/datasets/${datasetId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataset).toBeDefined();
      expect(response.body.data.dataset.id).toBe(datasetId);
      expect(response.body.data.dataset.name).toBe('Test Dataset');
      expect(response.body.data.dataset.operation).toBe('generate_summary');
    });

    it('should return 404 for non-existent dataset', async () => {
      const response = await request(app)
        .get('/api/evaluation/datasets/non-existent-id')
        .expect(404);

      expect(response.body.error.code).toBe('DATASET_NOT_FOUND');
      expect(response.body.error.message).toContain('not found');
    });

    it('should return validation error for invalid dataset ID', async () => {
      // Test with whitespace-only ID
      const response = await request(app)
        .get('/api/evaluation/datasets/%20') // URL encoded space
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_DATASET_ID');
    });
  });

  describe('POST /api/evaluation/datasets/:id/examples', () => {
    let datasetId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/evaluation/datasets')
        .send({
          name: 'Test Dataset',
          operation: 'generate_summary',
          metadata: { createdBy: 'test-user' }
        });
      datasetId = createResponse.body.data.dataset.id;
    });

    it('should add an example to a dataset', async () => {
      const exampleData = {
        input: {
          prompt: 'Generate a summary for this case',
          context: { caseType: 'application' }
        },
        expectedOutput: {
          content: 'This is a test summary',
          quality: 8,
          criteria: {
            faithfulness: 9,
            completeness: 8,
            relevance: 8,
            clarity: 7
          }
        },
        metadata: {
          tags: ['test'],
          difficulty: 'easy',
          notes: 'Test example'
        }
      };

      const response = await request(app)
        .post(`/api/evaluation/datasets/${datasetId}/examples`)
        .send(exampleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataset).toBeDefined();
      expect(response.body.data.dataset.examples).toHaveLength(1);
      expect(response.body.data.dataset.examples[0].input.prompt).toBe('Generate a summary for this case');
      expect(response.body.data.dataset.examples[0].expectedOutput.content).toBe('This is a test summary');
      expect(response.body.data.dataset.examples[0].expectedOutput.quality).toBe(8);
      expect(response.body.data.dataset.examples[0].metadata.tags).toEqual(['test']);
      expect(response.body.data.dataset.examples[0].metadata.difficulty).toBe('easy');
      expect(response.body.data.dataset.examples[0].metadata.notes).toBe('Test example');
      expect(response.body.data.dataset.statistics.totalExamples).toBe(1);
      expect(response.body.data.dataset.statistics.averageQuality).toBe(8);
      expect(response.body.message).toBe('Example added to evaluation dataset successfully');
    });

    it('should add example with default metadata when not provided', async () => {
      const exampleData = {
        input: {
          prompt: 'Test prompt'
        },
        expectedOutput: {
          content: 'Test output',
          quality: 5,
          criteria: {
            faithfulness: 5,
            completeness: 5,
            relevance: 5,
            clarity: 5
          }
        }
      };

      const response = await request(app)
        .post(`/api/evaluation/datasets/${datasetId}/examples`)
        .send(exampleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dataset.examples[0].metadata.tags).toEqual([]);
      expect(response.body.data.dataset.examples[0].metadata.difficulty).toBe('medium');
    });

    it('should return 404 when adding example to non-existent dataset', async () => {
      const exampleData = {
        input: { prompt: 'Test' },
        expectedOutput: {
          content: 'Test',
          quality: 5,
          criteria: { faithfulness: 5, completeness: 5, relevance: 5, clarity: 5 }
        }
      };

      const response = await request(app)
        .post('/api/evaluation/datasets/non-existent-id/examples')
        .send(exampleData)
        .expect(404);

      expect(response.body.error.code).toBe('EXAMPLE_ADDITION_FAILED');
      expect(response.body.error.message).toContain('not found');
    });

    it('should return validation error for invalid example data', async () => {
      const invalidData = {
        input: {}, // Missing required fields
        expectedOutput: {
          content: '', // Empty content should fail
          quality: 15, // Quality out of range
          criteria: {
            faithfulness: 0 // Score out of range
          }
        }
      };

      const response = await request(app)
        .post(`/api/evaluation/datasets/${datasetId}/examples`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/evaluation/datasets/:id/examples', () => {
    let datasetId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/evaluation/datasets')
        .send({
          name: 'Test Dataset',
          operation: 'generate_summary',
          metadata: { createdBy: 'test-user' }
        });
      datasetId = createResponse.body.data.dataset.id;

      // Add test examples
      await request(app)
        .post(`/api/evaluation/datasets/${datasetId}/examples`)
        .send({
          input: { prompt: 'First example' },
          expectedOutput: {
            content: 'First output',
            quality: 7,
            criteria: { faithfulness: 7, completeness: 7, relevance: 7, clarity: 7 }
          }
        });

      await request(app)
        .post(`/api/evaluation/datasets/${datasetId}/examples`)
        .send({
          input: { prompt: 'Second example' },
          expectedOutput: {
            content: 'Second output',
            quality: 9,
            criteria: { faithfulness: 9, completeness: 9, relevance: 9, clarity: 9 }
          }
        });
    });

    it('should retrieve all examples for a dataset', async () => {
      const response = await request(app)
        .get(`/api/evaluation/datasets/${datasetId}/examples`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.examples).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.datasetId).toBe(datasetId);
      expect(response.body.data.examples[0].input.prompt).toBe('Second example'); // Most recent first
      expect(response.body.data.examples[1].input.prompt).toBe('First example');
    });

    it('should return empty array for dataset with no examples', async () => {
      const emptyDatasetResponse = await request(app)
        .post('/api/evaluation/datasets')
        .send({
          name: 'Empty Dataset',
          operation: 'generate_summary',
          metadata: { createdBy: 'test-user' }
        });

      const emptyDatasetId = emptyDatasetResponse.body.data.dataset.id;

      const response = await request(app)
        .get(`/api/evaluation/datasets/${emptyDatasetId}/examples`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.examples).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 404 for non-existent dataset', async () => {
      const response = await request(app)
        .get('/api/evaluation/datasets/non-existent-id/examples')
        .expect(404);

      expect(response.body.error.code).toBe('DATASET_NOT_FOUND');
    });
  });

  describe('GET /api/evaluation/judge/models', () => {
    it('should return available evaluation models', async () => {
      const response = await request(app)
        .get('/api/evaluation/judge/models')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.models).toBeDefined();
      expect(Array.isArray(response.body.data.models)).toBe(true);
      expect(response.body.data.total).toBeGreaterThan(0);
      expect(response.body.timestamp).toBeDefined();

      // Check that models have required properties
      if (response.body.data.models.length > 0) {
        const model = response.body.data.models[0];
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.provider).toBeDefined();
        expect(model.supportedCriteria).toBeDefined();
        expect(Array.isArray(model.supportedCriteria)).toBe(true);
      }
    });

    it('should include recommended models', async () => {
      const response = await request(app)
        .get('/api/evaluation/judge/models')
        .expect(200);

      const recommendedModels = response.body.data.models.filter((m: any) => m.recommended === true);
      expect(recommendedModels.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/evaluation/judge/evaluate', () => {
    let interactionId: string;

    beforeEach(async () => {
      // Create a test case first
      const caseStmt = db.prepare(`
        INSERT INTO cases (
          id, application_data, status, current_step, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const caseId = 'test-case-123';
      caseStmt.run(
        caseId,
        JSON.stringify({
          applicantName: 'Test User',
          applicantEmail: 'test@example.com',
          applicationType: 'standard',
          submissionDate: new Date().toISOString(),
          documents: [],
          formData: {}
        }),
        'pending',
        'received',
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Create a test AI interaction to evaluate
      const stmt = db.prepare(`
        INSERT INTO ai_interactions (
          id, case_id, operation, prompt, response, model, tokens_used, 
          duration, success, timestamp, prompt_template, prompt_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      interactionId = 'test-interaction-' + Date.now();
      stmt.run(
        interactionId,
        caseId,
        'generate_summary',
        'Generate a summary for this case',
        'This is a test summary response',
        'gpt-4',
        100,
        2000,
        1, // Convert boolean to integer
        new Date().toISOString(),
        'test-template',
        '1.0'
      );
    });

    it('should evaluate an AI output successfully', async () => {
      const evaluateData = {
        input: {
          interactionId: interactionId,
          evaluationModel: 'gpt-4',
          criteria: ['faithfulness', 'completeness', 'relevance', 'clarity']
        },
        options: {
          includeChainOfThought: true,
          maxRetries: 2,
          timeoutMs: 10000
        }
      };

      const response = await request(app)
        .post('/api/evaluation/judge/evaluate')
        .send(evaluateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.evaluation).toBeDefined();
      expect(response.body.data.evaluation.id).toBeDefined();
      expect(response.body.data.evaluation.interactionId).toBe(interactionId);
      expect(response.body.data.evaluation.evaluationModel).toBe('gpt-4');
      expect(response.body.data.evaluation.scores).toBeDefined();
      expect(response.body.data.evaluation.reasoning).toBeDefined();
      expect(response.body.data.evaluation.metadata).toBeDefined();
      expect(response.body.message).toBe('AI output evaluated successfully');
      expect(response.body.timestamp).toBeDefined();

      // Check scores structure
      const scores = response.body.data.evaluation.scores;
      expect(scores.overall).toBeGreaterThanOrEqual(1);
      expect(scores.overall).toBeLessThanOrEqual(10);
      expect(scores.faithfulness).toBeGreaterThanOrEqual(1);
      expect(scores.faithfulness).toBeLessThanOrEqual(10);
      expect(scores.completeness).toBeGreaterThanOrEqual(1);
      expect(scores.completeness).toBeLessThanOrEqual(10);
      expect(scores.relevance).toBeGreaterThanOrEqual(1);
      expect(scores.relevance).toBeLessThanOrEqual(10);
      expect(scores.clarity).toBeGreaterThanOrEqual(1);
      expect(scores.clarity).toBeLessThanOrEqual(10);

      // Check reasoning structure
      const reasoning = response.body.data.evaluation.reasoning;
      expect(reasoning.overall).toBeDefined();
      expect(reasoning.faithfulness).toBeDefined();
      expect(reasoning.completeness).toBeDefined();
      expect(reasoning.relevance).toBeDefined();
      expect(reasoning.clarity).toBeDefined();

      // Check metadata structure
      const metadata = response.body.data.evaluation.metadata;
      expect(metadata.evaluatedAt).toBeDefined();
      expect(metadata.evaluationDuration).toBeGreaterThan(0);
      expect(metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(metadata.confidence).toBeLessThanOrEqual(1);
      expect(metadata.flags).toBeDefined();
      expect(Array.isArray(metadata.flags)).toBe(true);
    });

    it('should handle evaluation with custom criteria', async () => {
      const evaluateData = {
        input: {
          interactionId: interactionId,
          evaluationModel: 'gpt-4',
          criteria: ['faithfulness', 'completeness'],
          customCriteria: {
            'technical_accuracy': 'How technically accurate is the response?',
            'user_friendliness': 'How user-friendly is the response?'
          }
        },
        options: {
          includeChainOfThought: false
        }
      };

      const response = await request(app)
        .post('/api/evaluation/judge/evaluate')
        .send(evaluateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.evaluation.scores).toBeDefined();
      expect(response.body.data.evaluation.reasoning).toBeDefined();
    });

    it('should return 404 for non-existent interaction', async () => {
      const evaluateData = {
        input: {
          interactionId: 'non-existent-interaction',
          evaluationModel: 'gpt-4'
        }
      };

      const response = await request(app)
        .post('/api/evaluation/judge/evaluate')
        .send(evaluateData)
        .expect(404);

      expect(response.body.error.code).toBe('EVALUATION_FAILED');
      expect(response.body.error.message).toContain('not found');
    });

    it('should return validation error for invalid input', async () => {
      const invalidData = {
        input: {
          interactionId: '', // Empty interaction ID
          evaluationModel: '' // Empty model
        }
      };

      const response = await request(app)
        .post('/api/evaluation/judge/evaluate')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid input data');
    });

    it('should handle evaluation with few-shot examples', async () => {
      const evaluateData = {
        input: {
          interactionId: interactionId,
          evaluationModel: 'gpt-4',
          fewShotExamples: [
            {
              input: 'Example input 1',
              output: 'Example output 1',
              score: 8,
              reasoning: 'This is a good example'
            },
            {
              input: 'Example input 2',
              output: 'Example output 2',
              score: 6,
              reasoning: 'This is an average example'
            }
          ]
        }
      };

      const response = await request(app)
        .post('/api/evaluation/judge/evaluate')
        .send(evaluateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.evaluation).toBeDefined();
    });
  });
});