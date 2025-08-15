import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import request from 'supertest';
import app from '../../index.js';
import { DatabaseConnection } from '../../database/connection.js';
import { DatabaseSchema } from '../../database/schema.js';
import { EvaluationService } from '../../services/EvaluationService.js';
import { DataService } from '../../services/DataService.js';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execCommand = promisify(require('child_process').exec);

describe('Evaluation Framework End-to-End Integration Tests', () => {
  let db: DatabaseConnection;
  let evaluationService: EvaluationService;
  let tempFiles: string[] = [];

  beforeEach(async () => {
    // Initialize test database
    db = DatabaseConnection.getInstance(':memory:');
    const schema = new DatabaseSchema();
    schema.initializeSchema();

    // Initialize services for direct testing
    const dataService = new DataService();
    evaluationService = new EvaluationService(dataService);
  });

  afterEach(() => {
    // Clean up database connection
    db.close();

    // Clean up temporary files
    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    tempFiles = [];
  });

  describe('Complete Workflow: Service → API → Database → Results', () => {
    it('should complete full dataset lifecycle through all interfaces', async () => {
      // Step 1: Create dataset via Service (simulating CLI)
      console.log('🔄 Step 1: Creating dataset via Service...');

      const datasetRequest = {
        name: 'E2E Test Dataset',
        description: 'End-to-end test dataset',
        operation: 'generate_summary' as const,
        metadata: {
          createdBy: 'e2e-test',
          tags: ['e2e', 'integration'],
          difficulty: 'medium' as const,
          sourceType: 'manual' as const
        }
      };

      const dataset = await evaluationService.createDataset(datasetRequest);
      expect(dataset.name).toBe('E2E Test Dataset');
      expect(dataset.operation).toBe('generate_summary');

      const datasetId = dataset.id;
      console.log(`✅ Step 1 Complete: Dataset created with ID ${datasetId}`);

      // Step 2: Verify dataset exists via API
      console.log('🔄 Step 2: Verifying dataset via API...');

      const apiGetResponse = await request(app)
        .get(`/api/evaluation/datasets/${datasetId}`)
        .expect(200);

      expect(apiGetResponse.body.success).toBe(true);
      expect(apiGetResponse.body.data.dataset.name).toBe('E2E Test Dataset');
      expect(apiGetResponse.body.data.dataset.operation).toBe('generate_summary');
      expect(apiGetResponse.body.data.dataset.metadata.createdBy).toBe('e2e-test');
      expect(apiGetResponse.body.data.dataset.examples).toHaveLength(0);

      console.log('✅ Step 2 Complete: Dataset verified via API');

      // Step 3: Add example via Service (simulating CLI)
      console.log('🔄 Step 3: Adding example via Service...');

      const exampleRequest = {
        input: {
          prompt: 'E2E test prompt',
          context: { testType: 'integration' }
        },
        expectedOutput: {
          content: 'E2E test expected output',
          quality: 9,
          criteria: {
            faithfulness: 9,
            completeness: 8,
            relevance: 9,
            clarity: 8
          }
        },
        metadata: {
          tags: ['e2e', 'test'],
          difficulty: 'hard' as const,
          notes: 'Added via E2E test'
        }
      };

      await evaluationService.addExampleToDataset(datasetId, exampleRequest);
      console.log('✅ Step 3 Complete: Example added via Service');

      // Step 4: Verify example via API
      console.log('🔄 Step 4: Verifying example via API...');

      const apiExamplesResponse = await request(app)
        .get(`/api/evaluation/datasets/${datasetId}/examples`)
        .expect(200);

      expect(apiExamplesResponse.body.success).toBe(true);
      expect(apiExamplesResponse.body.data.examples).toHaveLength(1);

      const example = apiExamplesResponse.body.data.examples[0];
      expect(example.input.prompt).toBe('E2E test prompt');
      expect(example.expectedOutput.content).toBe('E2E test expected output');
      expect(example.expectedOutput.quality).toBe(9);
      expect(example.expectedOutput.criteria.faithfulness).toBe(9);
      expect(example.expectedOutput.criteria.completeness).toBe(8);
      expect(example.expectedOutput.criteria.relevance).toBe(9);
      expect(example.expectedOutput.criteria.clarity).toBe(8);
      expect(example.metadata.tags).toEqual(['e2e', 'test']);
      expect(example.metadata.difficulty).toBe('hard');
      expect(example.metadata.notes).toBe('Added via E2E test');

      console.log('✅ Step 4 Complete: Example verified via API');

      // Step 5: Add second example via API
      console.log('🔄 Step 5: Adding second example via API...');

      const secondExampleData = {
        input: {
          prompt: 'Second E2E test prompt',
          context: { testType: 'e2e', priority: 'high' }
        },
        expectedOutput: {
          content: 'Second E2E test expected output',
          quality: 7,
          criteria: {
            faithfulness: 8,
            completeness: 7,
            relevance: 7,
            clarity: 6
          }
        },
        metadata: {
          tags: ['e2e', 'api'],
          difficulty: 'medium',
          notes: 'Added via API in E2E test'
        }
      };

      const apiAddResponse = await request(app)
        .post(`/api/evaluation/datasets/${datasetId}/examples`)
        .send(secondExampleData)
        .expect(201);

      expect(apiAddResponse.body.success).toBe(true);
      expect(apiAddResponse.body.data.dataset.statistics.totalExamples).toBe(2);
      expect(apiAddResponse.body.data.dataset.statistics.averageQuality).toBe(8); // (9 + 7) / 2

      console.log('✅ Step 5 Complete: Second example added via API');

      // Step 6: Verify complete dataset via Service
      console.log('🔄 Step 6: Verifying complete dataset via Service...');

      const completeDataset = await evaluationService.getDataset(datasetId);
      expect(completeDataset).toBeTruthy();
      expect(completeDataset!.name).toBe('E2E Test Dataset');
      expect(completeDataset!.examples).toHaveLength(2);
      expect(completeDataset!.statistics.totalExamples).toBe(2);
      expect(completeDataset!.statistics.averageQuality).toBe(8);

      console.log('✅ Step 6 Complete: Complete dataset verified via Service');

      // Step 7: Test dataset filtering via Service
      console.log('🔄 Step 7: Testing dataset filtering via Service...');

      const filteredDatasets = await evaluationService.listDatasets({
        operation: 'generate_summary',
        createdBy: 'e2e-test'
      });

      expect(filteredDatasets).toHaveLength(1);
      expect(filteredDatasets[0].id).toBe(datasetId);
      expect(filteredDatasets[0].examples).toHaveLength(2);

      console.log('✅ Step 7 Complete: Dataset filtering verified via Service');

      // Step 8: Verify database consistency
      console.log('🔄 Step 8: Verifying database consistency...');

      // Check dataset table
      const datasetRow = db.prepare('SELECT * FROM evaluation_datasets WHERE id = ?').get(datasetId);
      expect(datasetRow).toBeTruthy();
      expect(datasetRow.name).toBe('E2E Test Dataset');
      expect(datasetRow.operation).toBe('generate_summary');

      const metadata = JSON.parse(datasetRow.metadata);
      expect(metadata.createdBy).toBe('e2e-test');

      const statistics = JSON.parse(datasetRow.statistics);
      expect(statistics.totalExamples).toBe(2);
      expect(statistics.averageQuality).toBe(8);

      // Check examples table
      const exampleRows = db.prepare('SELECT * FROM evaluation_examples WHERE dataset_id = ? ORDER BY created_at').all(datasetId);
      expect(exampleRows).toHaveLength(2);

      const firstExample = JSON.parse(exampleRows[0].input_data);
      expect(firstExample.prompt).toBe('E2E test prompt');

      const secondExample = JSON.parse(exampleRows[1].input_data);
      expect(secondExample.prompt).toBe('Second E2E test prompt');
      expect(secondExample.context).toEqual({ testType: 'e2e', priority: 'high' });

      console.log('✅ Step 8 Complete: Database consistency verified');

      // Step 9: Test API listing with filtering
      console.log('🔄 Step 9: Testing API filtering...');

      const apiListResponse = await request(app)
        .get('/api/evaluation/datasets?operation=generate_summary&createdBy=e2e-test')
        .expect(200);

      expect(apiListResponse.body.success).toBe(true);
      expect(apiListResponse.body.data.datasets).toHaveLength(1);
      expect(apiListResponse.body.data.datasets[0].id).toBe(datasetId);
      expect(apiListResponse.body.data.datasets[0].examples).toHaveLength(2);

      console.log('✅ Step 9 Complete: API filtering verified');

      console.log('🎉 End-to-End Integration Test Complete!');
      console.log('✅ All components working together correctly:');
      console.log('   - Service dataset creation ✓');
      console.log('   - API dataset retrieval ✓');
      console.log('   - Service example addition ✓');
      console.log('   - API example addition ✓');
      console.log('   - Database consistency ✓');
      console.log('   - Cross-interface data integrity ✓');
      console.log('   - Filtering and querying ✓');
    }, 30000); // 30 second timeout for full E2E test

    it('should handle complex data structures and validation', async () => {
      // Step 1: Create dataset via API
      console.log('🔄 Complex data workflow: Creating dataset via API...');

      const datasetData = {
        name: 'Complex Data E2E Dataset',
        description: 'Testing complex data structures and validation',
        operation: 'analyze_application',
        metadata: {
          createdBy: 'complex-test',
          tags: ['complex', 'validation', 'e2e'],
          difficulty: 'hard',
          sourceType: 'captured_interactions'
        }
      };

      const apiCreateResponse = await request(app)
        .post('/api/evaluation/datasets')
        .send(datasetData)
        .expect(201);

      const datasetId = apiCreateResponse.body.data.dataset.id;
      console.log(`✅ Dataset created via API: ${datasetId}`);

      // Step 2: Add complex example via Service
      console.log('🔄 Adding complex example via Service...');

      const complexExample = {
        input: {
          prompt: 'Analyze this complex application for completeness and accuracy',
          context: {
            applicationType: 'business_license',
            priority: 'high',
            submissionDate: '2024-01-15',
            documents: [
              { type: 'identity', status: 'verified' },
              { type: 'financial', status: 'pending' }
            ],
            metadata: {
              source: 'web_portal',
              userAgent: 'Mozilla/5.0',
              sessionId: 'sess_123456'
            }
          }
        },
        expectedOutput: {
          content: 'Complex application analysis: Identity verified, financial documents pending review. Recommend conditional approval pending financial verification.',
          quality: 8,
          criteria: {
            faithfulness: 9,
            completeness: 8,
            relevance: 8,
            clarity: 7,
            taskSpecific: {
              accuracy: 9,
              thoroughness: 8,
              actionability: 7
            }
          }
        },
        metadata: {
          tags: ['complex', 'conditional', 'multi-document'],
          difficulty: 'hard',
          notes: 'Complex example with nested data structures and task-specific criteria',
          sourceInteractionId: 'interaction_789'
        }
      };

      await evaluationService.addExampleToDataset(datasetId, complexExample);
      console.log('✅ Complex example added via Service');

      // Step 3: Verify complex data via API
      console.log('🔄 Verifying complex example via API...');

      const apiVerifyResponse = await request(app)
        .get(`/api/evaluation/datasets/${datasetId}`)
        .expect(200);

      const dataset = apiVerifyResponse.body.data.dataset;
      expect(dataset.examples).toHaveLength(1);

      const example = dataset.examples[0];
      expect(example.input.prompt).toContain('complex application');
      expect(example.input.context.applicationType).toBe('business_license');
      expect(example.input.context.documents).toHaveLength(2);
      expect(example.input.context.metadata.source).toBe('web_portal');
      expect(example.expectedOutput.criteria.taskSpecific).toBeDefined();
      expect(example.expectedOutput.criteria.taskSpecific.accuracy).toBe(9);
      expect(example.metadata.sourceInteractionId).toBe('interaction_789');

      console.log('✅ Complex data workflow complete!');
    }, 15000); // 15 second timeout

    it('should handle concurrent operations correctly', async () => {
      console.log('🔄 Testing concurrent operations...');

      // Create multiple datasets concurrently via API
      const datasetPromises = Array.from({ length: 3 }, (_, i) =>
        request(app)
          .post('/api/evaluation/datasets')
          .send({
            name: `Concurrent Dataset ${i + 1}`,
            operation: 'generate_summary',
            metadata: {
              createdBy: `concurrent-user-${i + 1}`,
              tags: ['concurrent', `test-${i + 1}`]
            }
          })
          .expect(201)
      );

      const datasetResponses = await Promise.all(datasetPromises);
      const datasetIds = datasetResponses.map(r => r.body.data.dataset.id);

      console.log(`✅ Created ${datasetIds.length} datasets concurrently`);

      // Add examples to each dataset concurrently
      const examplePromises = datasetIds.map((id, i) =>
        request(app)
          .post(`/api/evaluation/datasets/${id}/examples`)
          .send({
            input: { prompt: `Concurrent prompt ${i + 1}` },
            expectedOutput: {
              content: `Concurrent output ${i + 1}`,
              quality: 5 + i,
              criteria: { faithfulness: 5, completeness: 5, relevance: 5, clarity: 5 }
            },
            metadata: { tags: [`concurrent-${i + 1}`] }
          })
          .expect(201)
      );

      await Promise.all(examplePromises);
      console.log('✅ Added examples to all datasets concurrently');

      // Verify all datasets exist and have correct data
      const verifyPromises = datasetIds.map(id =>
        request(app).get(`/api/evaluation/datasets/${id}`).expect(200)
      );

      const verifyResponses = await Promise.all(verifyPromises);

      verifyResponses.forEach((response, i) => {
        const dataset = response.body.data.dataset;
        expect(dataset.name).toBe(`Concurrent Dataset ${i + 1}`);
        expect(dataset.examples).toHaveLength(1);
        expect(dataset.examples[0].input.prompt).toBe(`Concurrent prompt ${i + 1}`);
        expect(dataset.statistics.totalExamples).toBe(1);
      });

      console.log('✅ Concurrent operations completed successfully');
    }, 15000); // 15 second timeout

    it('should maintain data integrity across all interfaces', async () => {
      console.log('🔄 Testing data integrity across interfaces...');

      // Create dataset with specific metadata via Service
      const integrityDataset = await evaluationService.createDataset({
        name: 'Integrity Test Dataset',
        description: 'Testing data integrity',
        operation: 'validate_completeness',
        metadata: {
          createdBy: 'integrity-test',
          tags: ['integrity', 'validation', 'test'],
          difficulty: 'hard',
          sourceType: 'captured_interactions'
        }
      });

      const datasetId = integrityDataset.id;

      // Verify via API that all metadata is preserved
      const apiResponse = await request(app)
        .get(`/api/evaluation/datasets/${datasetId}`)
        .expect(200);

      const dataset = apiResponse.body.data.dataset;
      expect(dataset.name).toBe('Integrity Test Dataset');
      expect(dataset.operation).toBe('validate_completeness');
      expect(dataset.description).toBe('Testing data integrity');
      expect(dataset.metadata.createdBy).toBe('integrity-test');
      expect(dataset.metadata.tags).toEqual(['integrity', 'validation', 'test']);
      expect(dataset.metadata.difficulty).toBe('hard');
      expect(dataset.metadata.sourceType).toBe('captured_interactions');

      // Verify in database directly
      const dbRow = db.prepare('SELECT * FROM evaluation_datasets WHERE id = ?').get(datasetId);
      expect(dbRow.name).toBe('Integrity Test Dataset');
      expect(dbRow.operation).toBe('validate_completeness');
      expect(dbRow.description).toBe('Testing data integrity');

      const dbMetadata = JSON.parse(dbRow.metadata);
      expect(dbMetadata.createdBy).toBe('integrity-test');
      expect(dbMetadata.tags).toEqual(['integrity', 'validation', 'test']);
      expect(dbMetadata.difficulty).toBe('hard');
      expect(dbMetadata.sourceType).toBe('captured_interactions');

      console.log('✅ Data integrity maintained across all interfaces');
    }, 10000); // 10 second timeout
  });
});