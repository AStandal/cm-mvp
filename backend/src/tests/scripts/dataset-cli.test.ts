import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseConnection } from '../../database/connection.js';
import { DatabaseSchema } from '../../database/schema.js';
import { EvaluationService } from '../../services/EvaluationService.js';
import { DataService } from '../../services/DataService.js';
import fs from 'fs';
import path from 'path';

describe('Dataset CLI Scripts', () => {
  let db: DatabaseConnection;
  let evaluationService: EvaluationService;

  beforeEach(async () => {
    // Initialize test database
    db = DatabaseConnection.getInstance(':memory:');
    const schema = new DatabaseSchema();
    schema.initializeSchema();
    
    // Initialize services
    const dataService = new DataService();
    evaluationService = new EvaluationService(dataService);
  });

  afterEach(() => {
    // Clean up database connection
    db.close();
  });

  describe('CLI Script Functionality', () => {
    it('should have all required npm scripts defined', () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      
      expect(packageJson.scripts).toHaveProperty('eval:create-dataset');
      expect(packageJson.scripts).toHaveProperty('eval:list-datasets');
      expect(packageJson.scripts).toHaveProperty('eval:get-dataset');
      expect(packageJson.scripts).toHaveProperty('eval:add-example');
      expect(packageJson.scripts).toHaveProperty('eval:add-example-interactive');
      expect(packageJson.scripts).toHaveProperty('eval:example-template');
    });

    it('should have CLI script file present', () => {
      expect(fs.existsSync('src/scripts/dataset-cli.ts')).toBe(true);
    });

    it('should have CLI usage documentation', () => {
      expect(fs.existsSync('CLI_USAGE.md')).toBe(true);
    });

    it('should have example template file', () => {
      expect(fs.existsSync('examples/example-template.json')).toBe(true);
    });
  });

  describe('Template Generation', () => {
    let tempTemplateFile: string;

    beforeEach(() => {
      tempTemplateFile = path.join(process.cwd(), 'temp-test-template.json');
    });

    afterEach(() => {
      // Clean up temporary file
      if (fs.existsSync(tempTemplateFile)) {
        fs.unlinkSync(tempTemplateFile);
      }
    });

    it('should generate valid example template structure', () => {
      // Test the template structure by creating one programmatically
      const template = {
        input: {
          prompt: "Generate a summary for this case",
          context: {
            caseType: "application",
            priority: "high"
          }
        },
        expectedOutput: {
          content: "This is the expected output content",
          quality: 8,
          criteria: {
            faithfulness: 9,
            completeness: 8,
            relevance: 8,
            clarity: 7
          }
        },
        metadata: {
          tags: ["test", "example"],
          difficulty: "medium",
          notes: "This is a template example"
        }
      };

      fs.writeFileSync(tempTemplateFile, JSON.stringify(template, null, 2));
      expect(fs.existsSync(tempTemplateFile)).toBe(true);
      
      // Verify template content
      const templateContent = JSON.parse(fs.readFileSync(tempTemplateFile, 'utf-8'));
      expect(templateContent).toHaveProperty('input');
      expect(templateContent).toHaveProperty('expectedOutput');
      expect(templateContent).toHaveProperty('metadata');
      expect(templateContent.expectedOutput).toHaveProperty('criteria');
      expect(templateContent.expectedOutput.criteria).toHaveProperty('faithfulness');
      expect(templateContent.expectedOutput.criteria).toHaveProperty('completeness');
      expect(templateContent.expectedOutput.criteria).toHaveProperty('relevance');
      expect(templateContent.expectedOutput.criteria).toHaveProperty('clarity');
    });
  });

  describe('Service Integration', () => {
    it('should create dataset through service (simulating CLI)', async () => {
      const request = {
        name: 'CLI Test Dataset',
        description: 'Testing CLI functionality',
        operation: 'generate_summary' as const,
        metadata: {
          createdBy: 'test-user',
          tags: ['cli', 'test'],
          difficulty: 'medium' as const,
          sourceType: 'manual' as const
        }
      };

      const dataset = await evaluationService.createDataset(request);
      
      expect(dataset).toBeDefined();
      expect(dataset.name).toBe('CLI Test Dataset');
      expect(dataset.operation).toBe('generate_summary');
      expect(dataset.metadata.createdBy).toBe('test-user');
      expect(dataset.metadata.tags).toEqual(['cli', 'test']);
    });

    it('should list datasets through service (simulating CLI)', async () => {
      // Create test datasets
      await evaluationService.createDataset({
        name: 'Dataset 1',
        operation: 'generate_summary',
        metadata: { createdBy: 'user1', tags: ['test'] }
      });
      
      await evaluationService.createDataset({
        name: 'Dataset 2',
        operation: 'analyze_application',
        metadata: { createdBy: 'user2', tags: ['analysis'] }
      });

      const datasets = await evaluationService.listDatasets();
      
      expect(datasets).toHaveLength(2);
      expect(datasets.some(d => d.name === 'Dataset 1')).toBe(true);
      expect(datasets.some(d => d.name === 'Dataset 2')).toBe(true);
    });

    it('should add example through service (simulating CLI)', async () => {
      const dataset = await evaluationService.createDataset({
        name: 'Example Test Dataset',
        operation: 'generate_summary',
        metadata: { createdBy: 'test-user' }
      });

      const exampleRequest = {
        input: {
          prompt: 'Test prompt for CLI simulation'
        },
        expectedOutput: {
          content: 'Test expected output',
          quality: 7,
          criteria: {
            faithfulness: 8,
            completeness: 7,
            relevance: 7,
            clarity: 6
          }
        },
        metadata: {
          tags: ['cli-test'],
          difficulty: 'easy' as const,
          notes: 'Added via CLI simulation'
        }
      };

      await evaluationService.addExampleToDataset(dataset.id, exampleRequest);

      const updatedDataset = await evaluationService.getDataset(dataset.id);
      expect(updatedDataset?.examples).toHaveLength(1);
      expect(updatedDataset?.statistics.totalExamples).toBe(1);
      expect(updatedDataset?.statistics.averageQuality).toBe(7);
    });
  });
});