import { describe, it, expect, beforeEach } from 'vitest';
import { PromptTemplateService, PromptTemplate } from '../services/PromptTemplateService.js';
import { z } from 'zod';

describe('PromptTemplateService', () => {
  let service: PromptTemplateService;

  beforeEach(() => {
    service = new PromptTemplateService();
  });

  describe('Template Registration and Retrieval', () => {
    it('should register a new template', () => {
      const template: Omit<PromptTemplate, 'id'> = {
        name: 'Test Template',
        version: '1.0',
        description: 'A test template',
        operation: 'test_operation',
        template: 'Hello {{name}}!',
        parameters: { temperature: 0.5 },
        schema: z.object({ greeting: z.string() }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.registerTemplate(template);
      const templates = service.getTemplatesByOperation('test_operation');
      
      expect(templates).toHaveLength(1);
      expect(templates[0].name).toBe('Test Template');
      expect(templates[0].template).toBe('Hello {{name}}!');
    });

    it('should get template by ID', () => {
      const template: Omit<PromptTemplate, 'id'> & { id: string } = {
        id: 'test-template-id',
        name: 'Test Template',
        version: '1.0',
        description: 'A test template',
        operation: 'test_operation',
        template: 'Hello {{name}}!',
        parameters: { temperature: 0.5 },
        schema: z.object({ greeting: z.string() }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.registerTemplate(template);
      const retrieved = service.getTemplate('test-template-id');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-template-id');
      expect(retrieved?.name).toBe('Test Template');
    });

    it('should return undefined for non-existent template', () => {
      const retrieved = service.getTemplate('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should get templates by operation', () => {
      const template1: Omit<PromptTemplate, 'id'> = {
        name: 'Template 1',
        version: '1.0',
        description: 'First template',
        operation: 'operation_a',
        template: 'Template 1: {{data}}',
        parameters: {},
        schema: z.object({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const template2: Omit<PromptTemplate, 'id'> = {
        name: 'Template 2',
        version: '1.0',
        description: 'Second template',
        operation: 'operation_a',
        template: 'Template 2: {{data}}',
        parameters: {},
        schema: z.object({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const template3: Omit<PromptTemplate, 'id'> = {
        name: 'Template 3',
        version: '1.0',
        description: 'Third template',
        operation: 'operation_b',
        template: 'Template 3: {{data}}',
        parameters: {},
        schema: z.object({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.registerTemplate(template1);
      service.registerTemplate(template2);
      service.registerTemplate(template3);

      const operationATemplates = service.getTemplatesByOperation('operation_a');
      const operationBTemplates = service.getTemplatesByOperation('operation_b');

      expect(operationATemplates).toHaveLength(2);
      expect(operationBTemplates).toHaveLength(1);
      expect(operationATemplates.map(t => t.name)).toContain('Template 1');
      expect(operationATemplates.map(t => t.name)).toContain('Template 2');
      expect(operationBTemplates[0].name).toBe('Template 3');
    });

    it('should get latest template by name', () => {
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2023-12-31');

      const template1: Omit<PromptTemplate, 'id'> & { id: string } = {
        id: 'template-1',
        name: 'Test Template',
        version: '1.0',
        description: 'Old version',
        operation: 'test_operation',
        template: 'Old template',
        parameters: {},
        schema: z.object({}),
        createdAt: oldDate,
        updatedAt: oldDate
      };

      const template2: Omit<PromptTemplate, 'id'> & { id: string } = {
        id: 'template-2',
        name: 'Test Template',
        version: '2.0',
        description: 'New version',
        operation: 'test_operation',
        template: 'New template',
        parameters: {},
        schema: z.object({}),
        createdAt: newDate,
        updatedAt: newDate
      };

      service.registerTemplate(template1);
      service.registerTemplate(template2);

      const latest = service.getLatestTemplate('Test Template');
      
      expect(latest).toBeDefined();
      expect(latest?.version).toBe('2.0');
      expect(latest?.description).toBe('New version');
    });
  });

  describe('Prompt Generation', () => {
    beforeEach(() => {
      const template: Omit<PromptTemplate, 'id'> & { id: string } = {
        id: 'test-prompt-template',
        name: 'Test Prompt',
        version: '1.0',
        description: 'Template for testing prompt generation',
        operation: 'test_operation',
        template: 'Hello {{name}}! Your age is {{age}} and you live in {{city}}.',
        parameters: { temperature: 0.5 },
        schema: z.object({ greeting: z.string() }),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      service.registerTemplate(template);
    });

    it('should generate prompt with simple substitutions', () => {
      const data = {
        name: 'John',
        age: 30,
        city: 'New York'
      };

      const prompt = service.generatePrompt('test-prompt-template', data);
      expect(prompt).toBe('Hello John! Your age is 30 and you live in New York.');
    });

    it('should handle missing template variables gracefully', () => {
      const data = {
        name: 'John',
        // age and city are missing
      };

      const prompt = service.generatePrompt('test-prompt-template', data);
      expect(prompt).toBe('Hello John! Your age is  and you live in .');
    });

    it('should format different data types correctly', () => {
      const template: Omit<PromptTemplate, 'id'> & { id: string } = {
        id: 'format-test-template',
        name: 'Format Test',
        version: '1.0',
        description: 'Template for testing data formatting',
        operation: 'format_test',
        template: 'Date: {{date}}, Array: {{items}}, Object: {{config}}, Null: {{nullValue}}',
        parameters: {},
        schema: z.object({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      service.registerTemplate(template);

      const data = {
        date: new Date('2023-01-01T12:00:00Z'),
        items: ['item1', 'item2', 'item3'],
        config: { setting1: 'value1', setting2: 42 },
        nullValue: null
      };

      const prompt = service.generatePrompt('format-test-template', data);
      
      expect(prompt).toContain('Date: 2023-01-01T12:00:00.000Z');
      expect(prompt).toContain('Array: item1, item2, item3');
      expect(prompt).toContain('Object: {');
      expect(prompt).toContain('Null: ');
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        service.generatePrompt('non-existent-template', {});
      }).toThrow('Template not found: non-existent-template');
    });
  });

  describe('Response Validation', () => {
    beforeEach(() => {
      const template: Omit<PromptTemplate, 'id'> & { id: string } = {
        id: 'validation-template',
        name: 'Validation Test',
        version: '1.0',
        description: 'Template for testing response validation',
        operation: 'validation_test',
        template: 'Test template',
        parameters: {},
        schema: z.object({
          name: z.string().min(1, 'Name is required'),
          age: z.number().min(0, 'Age must be non-negative'),
          email: z.string().email('Invalid email format')
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      service.registerTemplate(template);
    });

    it('should validate correct response format', () => {
      const response = JSON.stringify({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      });

      const result = service.validateResponse('validation-template', response);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      });
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid response format', () => {
      const response = JSON.stringify({
        name: '', // Invalid: empty string
        age: -5, // Invalid: negative number
        email: 'invalid-email' // Invalid: not an email
      });

      const result = service.validateResponse('validation-template', response);
      
      expect(result.isValid).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      
      // Check that we have validation errors (not JSON parsing errors)
      const hasValidationErrors = result.errors!.some(error => 
        !error.includes('Invalid JSON response')
      );
      expect(hasValidationErrors).toBe(true);
    });

    it('should handle invalid JSON response', () => {
      const response = 'This is not valid JSON';

      const result = service.validateResponse('validation-template', response);
      
      expect(result.isValid).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Invalid JSON response');
    });

    it('should handle non-existent template for validation', () => {
      const response = JSON.stringify({ test: 'data' });

      const result = service.validateResponse('non-existent-template', response);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Template not found: non-existent-template']);
    });
  });

  describe('Template Management', () => {
    it('should update existing template', () => {
      const template: Omit<PromptTemplate, 'id'> & { id: string } = {
        id: 'update-test-template',
        name: 'Original Name',
        version: '1.0',
        description: 'Original description',
        operation: 'test_operation',
        template: 'Original template',
        parameters: { temperature: 0.5 },
        schema: z.object({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.registerTemplate(template);

      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
        template: 'Updated template content'
      };

      service.updateTemplate('update-test-template', updates);

      const updated = service.getTemplate('update-test-template');
      
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.description).toBe('Updated description');
      expect(updated?.template).toBe('Updated template content');
      expect(updated?.version).toBe('1.0'); // Should remain unchanged
      expect(updated?.id).toBe('update-test-template'); // Should remain unchanged
    });

    it('should throw error when updating non-existent template', () => {
      expect(() => {
        service.updateTemplate('non-existent-template', { name: 'New Name' });
      }).toThrow('Template not found: non-existent-template');
    });

    it('should delete template', () => {
      const template: Omit<PromptTemplate, 'id'> & { id: string } = {
        id: 'delete-test-template',
        name: 'Delete Test',
        version: '1.0',
        description: 'Template for deletion test',
        operation: 'test_operation',
        template: 'Test template',
        parameters: {},
        schema: z.object({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.registerTemplate(template);
      
      expect(service.getTemplate('delete-test-template')).toBeDefined();
      
      const deleted = service.deleteTemplate('delete-test-template');
      
      expect(deleted).toBe(true);
      expect(service.getTemplate('delete-test-template')).toBeUndefined();
    });

    it('should return false when deleting non-existent template', () => {
      const deleted = service.deleteTemplate('non-existent-template');
      expect(deleted).toBe(false);
    });

    it('should list all templates', () => {
      const template1: Omit<PromptTemplate, 'id'> = {
        name: 'Template 1',
        version: '1.0',
        description: 'First template',
        operation: 'operation_1',
        template: 'Template 1',
        parameters: {},
        schema: z.object({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const template2: Omit<PromptTemplate, 'id'> = {
        name: 'Template 2',
        version: '1.0',
        description: 'Second template',
        operation: 'operation_2',
        template: 'Template 2',
        parameters: {},
        schema: z.object({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.registerTemplate(template1);
      service.registerTemplate(template2);

      const allTemplates = service.listTemplates();
      
      // Should include default templates + our 2 test templates
      expect(allTemplates.length).toBeGreaterThanOrEqual(2);
      
      const testTemplates = allTemplates.filter(t => 
        t.name === 'Template 1' || t.name === 'Template 2'
      );
      expect(testTemplates).toHaveLength(2);
    });

    it('should get template parameters', () => {
      const template: Omit<PromptTemplate, 'id'> & { id: string } = {
        id: 'params-test-template',
        name: 'Parameters Test',
        version: '1.0',
        description: 'Template for testing parameter retrieval',
        operation: 'test_operation',
        template: 'Test template',
        parameters: { 
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9
        },
        schema: z.object({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.registerTemplate(template);

      const params = service.getTemplateParameters('params-test-template');
      
      expect(params).toEqual({
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9
      });
    });

    it('should return empty object for non-existent template parameters', () => {
      const params = service.getTemplateParameters('non-existent-template');
      expect(params).toEqual({});
    });
  });

  describe('Default Templates', () => {
    it('should initialize with default templates', () => {
      const templates = service.listTemplates();
      
      // Should have all 7 default templates (including zoning template)
      expect(templates.length).toBe(7);
      
      const templateNames = templates.map(t => t.name);
      expect(templateNames).toContain('Overall Case Summary');
      expect(templateNames).toContain('Step-Specific Recommendations');
      expect(templateNames).toContain('Application Analysis');
      expect(templateNames).toContain('Final Case Summary');
      expect(templateNames).toContain('Case Completeness Validation');
      expect(templateNames).toContain('Missing Fields Detection');
    });

    it('should have correct operations for default templates', () => {
      const summaryTemplates = service.getTemplatesByOperation('generate_summary');
      const recommendationTemplates = service.getTemplatesByOperation('generate_recommendation');
      const analysisTemplates = service.getTemplatesByOperation('analyze_application');
      const finalSummaryTemplates = service.getTemplatesByOperation('generate_final_summary');
      const validationTemplates = service.getTemplatesByOperation('validate_completeness');
      const missingFieldsTemplates = service.getTemplatesByOperation('detect_missing_fields');

      expect(summaryTemplates).toHaveLength(1);
      expect(recommendationTemplates).toHaveLength(1);
      expect(analysisTemplates).toHaveLength(1);
      expect(finalSummaryTemplates).toHaveLength(1);
      expect(validationTemplates).toHaveLength(1);
      expect(missingFieldsTemplates).toHaveLength(1);
    });

    it('should validate default template schemas', () => {
      // Test overall summary schema
      const summaryTemplate = service.getTemplate('overall_summary_v1');
      expect(summaryTemplate).toBeDefined();
      
      const validSummaryResponse = JSON.stringify({
        content: 'This is a test summary',
        recommendations: ['Recommendation 1', 'Recommendation 2'],
        confidence: 0.85
      });
      
      const summaryValidation = service.validateResponse('overall_summary_v1', validSummaryResponse);
      expect(summaryValidation.isValid).toBe(true);

      // Test step recommendation schema
      const validRecommendationResponse = JSON.stringify({
        recommendations: ['Step recommendation 1'],
        priority: 'high',
        confidence: 0.9
      });
      
      const recommendationValidation = service.validateResponse('step_recommendation_v1', validRecommendationResponse);
      expect(recommendationValidation.isValid).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle template with circular references in data', () => {
      const template: Omit<PromptTemplate, 'id'> & { id: string } = {
        id: 'circular-test-template',
        name: 'Circular Test',
        version: '1.0',
        description: 'Template for testing circular references',
        operation: 'test_operation',
        template: 'Data: {{circularData}}',
        parameters: {},
        schema: z.object({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.registerTemplate(template);

      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj; // Create circular reference

      const data = { circularData: circularObj };

      // Should not throw, but handle gracefully
      const result = service.generatePrompt('circular-test-template', data);
      expect(result).toContain('[Circular Reference]');
    });

    it('should handle template with special regex characters', () => {
      const template: Omit<PromptTemplate, 'id'> & { id: string } = {
        id: 'regex-test-template',
        name: 'Regex Test',
        version: '1.0',
        description: 'Template for testing regex characters',
        operation: 'test_operation',
        template: 'Pattern: {{pattern}} and {{pattern}} again',
        parameters: {},
        schema: z.object({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      service.registerTemplate(template);

      const data = { pattern: '$^.*+?{}[]()\\|' };

      const prompt = service.generatePrompt('regex-test-template', data);
      expect(prompt).toBe('Pattern: $^.*+?{}[]()\\| and $^.*+?{}[]()\\| again');
    });
  });
});