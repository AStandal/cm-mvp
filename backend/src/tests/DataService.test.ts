import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { DataService } from '../services/DataService.js';
import { DatabaseManager } from '../database/index.js';
import {
  Case,
  AISummary,
  ActivityLog,
  AIInteraction,
  CaseStatus,
  ProcessStep
} from '../types/index.js';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';

describe('DataService', () => {
  let dataService: DataService;
  let dbManager: DatabaseManager;
  let testDbPath: string;

  beforeAll(async () => {
    // Create a unique test database for this test suite
    const testId = `dataservice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    testDbPath = path.join(process.cwd(), 'test_data', `${testId}.db`);

    // Ensure test directory exists
    const testDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Set test environment
    process.env.NODE_ENV = 'test';

    // Initialize database for testing with custom path
    const { DatabaseConnection } = await import('../database/connection.js');
    DatabaseConnection.resetInstance();
    DatabaseConnection.getInstance(testDbPath);
    
    dbManager = new DatabaseManager();
    await dbManager.initialize({ dropExisting: true, seedData: false });

    dataService = new DataService();
  });

  afterAll(async () => {
    // Clean up test database
    dbManager.close();
    const { DatabaseConnection } = await import('../database/connection.js');
    DatabaseConnection.resetInstance();
    
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (error) {
        console.warn(`Failed to delete test database: ${error}`);
      }
    }
  });

  beforeEach(async () => {
    // Reset database before each test without seeding
    await dbManager.initialize({ dropExisting: true, seedData: false });
  });

  describe('saveCase and getCase', () => {
    it('should save and retrieve a case successfully', async () => {
      const testCase = createTestCase();

      await dataService.saveCase(testCase);
      const retrievedCase = await dataService.getCase(testCase.id);

      expect(retrievedCase).toBeDefined();
      expect(retrievedCase!.id).toBe(testCase.id);
      expect(retrievedCase!.status).toBe(testCase.status);
      expect(retrievedCase!.currentStep).toBe(testCase.currentStep);
      expect(retrievedCase!.applicationData.applicantName).toBe(testCase.applicationData.applicantName);
    });

    it('should return null for non-existent case', async () => {
      const result = await dataService.getCase('non-existent-id');
      expect(result).toBeNull();
    });

    it('should save case with notes and summaries', async () => {
      const testCase = createTestCase();

      // First save the case
      await dataService.saveCase(testCase);

      // Then add notes and summaries separately
      await dataService.addCaseNote(testCase.id, 'First note', 'user1');
      await dataService.addCaseNote(testCase.id, 'Second note', 'user2');

      const summary = createTestAISummary(testCase.id);
      await dataService.saveSummary(summary);

      const activity = createTestActivity(testCase.id);
      await dataService.logActivity(activity);

      const retrievedCase = await dataService.getCase(testCase.id);

      expect(retrievedCase).toBeDefined();
      expect(retrievedCase!.notes).toHaveLength(2);
      expect(retrievedCase!.aiSummaries).toHaveLength(1);
      expect(retrievedCase!.auditTrail).toHaveLength(1);
    });

    it('should handle case save errors gracefully', async () => {
      const invalidCase = createTestCase();
      invalidCase.status = 'invalid_status' as CaseStatus;

      await expect(dataService.saveCase(invalidCase)).rejects.toThrow();
    });
  });

  describe('updateCase', () => {
    it('should update case status successfully', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      await dataService.updateCase(testCase.id, {
        status: CaseStatus.APPROVED,
        currentStep: ProcessStep.CONCLUDED
      });

      const updatedCase = await dataService.getCase(testCase.id);
      expect(updatedCase!.status).toBe(CaseStatus.APPROVED);
      expect(updatedCase!.currentStep).toBe(ProcessStep.CONCLUDED);
    });

    it('should update assigned user', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      await dataService.updateCase(testCase.id, { assignedTo: 'user123' });

      const updatedCase = await dataService.getCase(testCase.id);
      expect(updatedCase!.assignedTo).toBe('user123');
    });

    it('should throw error for non-existent case', async () => {
      await expect(
        dataService.updateCase('non-existent', { status: CaseStatus.APPROVED })
      ).rejects.toThrow('Case with ID non-existent not found');
    });

    it('should throw error when no valid fields to update', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      await expect(
        dataService.updateCase(testCase.id, {})
      ).rejects.toThrow('No valid fields to update');
    });
  });

  describe('getCasesByStatus', () => {
    it('should retrieve cases by status', async () => {
      const activeCase = createTestCase();
      activeCase.status = CaseStatus.ACTIVE;

      const pendingCase = createTestCase();
      pendingCase.id = randomUUID();
      pendingCase.status = CaseStatus.PENDING;

      await dataService.saveCase(activeCase);
      await dataService.saveCase(pendingCase);

      const activeCases = await dataService.getCasesByStatus(CaseStatus.ACTIVE);
      const pendingCases = await dataService.getCasesByStatus(CaseStatus.PENDING);

      expect(activeCases).toHaveLength(1);
      expect(activeCases[0].id).toBe(activeCase.id);
      expect(pendingCases).toHaveLength(1);
      expect(pendingCases[0].id).toBe(pendingCase.id);
    });

    it('should return empty array for status with no cases', async () => {
      const cases = await dataService.getCasesByStatus(CaseStatus.ARCHIVED);
      expect(cases).toHaveLength(0);
    });
  });

  describe('saveSummary and getSummaries', () => {
    it('should save and retrieve AI summaries', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const summary = createTestAISummary(testCase.id);
      await dataService.saveSummary(summary);

      const summaries = await dataService.getSummaries(testCase.id);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].id).toBe(summary.id);
      expect(summaries[0].content).toBe(summary.content);
      expect(summaries[0].recommendations).toEqual(summary.recommendations);
    });

    it('should filter summaries by type', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const overallSummary = createTestAISummary(testCase.id);
      overallSummary.type = 'overall';

      const stepSummary = createTestAISummary(testCase.id);
      stepSummary.id = randomUUID();
      stepSummary.type = 'step-specific';
      stepSummary.step = ProcessStep.IN_REVIEW;

      await dataService.saveSummary(overallSummary);
      await dataService.saveSummary(stepSummary);

      const overallSummaries = await dataService.getSummaries(testCase.id, 'overall');
      const stepSummaries = await dataService.getSummaries(testCase.id, 'step-specific');

      expect(overallSummaries).toHaveLength(1);
      expect(overallSummaries[0].type).toBe('overall');
      expect(stepSummaries).toHaveLength(1);
      expect(stepSummaries[0].type).toBe('step-specific');
    });
  });

  describe('logActivity and getAuditTrail', () => {
    it('should log activity and retrieve audit trail', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const activity = createTestActivity(testCase.id);
      await dataService.logActivity(activity);

      const auditTrail = await dataService.getAuditTrail(testCase.id);
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].action).toBe(activity.action);
      expect(auditTrail[0].user_id).toBe(activity.userId);
    });

    it('should handle multiple activities', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const activity1 = createTestActivity(testCase.id);
      const activity2 = createTestActivity(testCase.id);
      activity2.id = randomUUID();
      activity2.action = 'status_updated';

      await dataService.logActivity(activity1);
      await dataService.logActivity(activity2);

      const auditTrail = await dataService.getAuditTrail(testCase.id);
      expect(auditTrail).toHaveLength(2);
    });
  });

  describe('logAIInteraction and getAIInteractionHistory', () => {
    it('should log AI interaction and retrieve history', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const interaction = createTestAIInteraction(testCase.id);
      await dataService.logAIInteraction(interaction);

      const history = await dataService.getAIInteractionHistory(testCase.id);
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(interaction.id);
      expect(history[0].operation).toBe(interaction.operation);
      expect(history[0].model).toBe(interaction.model);
      expect(history[0].stepContext).toBeUndefined();
      expect(history[0].promptTemplate).toBeUndefined();
    });

    it('should handle AI interaction with all optional fields', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const interaction = createTestAIInteraction(testCase.id);
      interaction.cost = 0.05;
      interaction.error = 'Test error';
      interaction.stepContext = ProcessStep.IN_REVIEW;
      interaction.promptTemplate = 'test-template-v1';
      interaction.promptVersion = '1.0.0';

      await dataService.logAIInteraction(interaction);

      const history = await dataService.getAIInteractionHistory(testCase.id);
      expect(history[0].cost).toBe(0.05);
      expect(history[0].error).toBe('Test error');
      expect(history[0].stepContext).toBe(ProcessStep.IN_REVIEW);
      expect(history[0].promptTemplate).toBe('test-template-v1');
      expect(history[0].promptVersion).toBe('1.0.0');
    });
  });

  describe('addCaseNote', () => {
    it('should add case note successfully', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      await dataService.addCaseNote(testCase.id, 'Test note content', 'user123');

      const updatedCase = await dataService.getCase(testCase.id);
      expect(updatedCase!.notes).toHaveLength(1);
      expect(updatedCase!.notes[0].content).toBe('Test note content');
      expect(updatedCase!.notes[0].createdBy).toBe('user123');
    });

    it('should handle multiple notes', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      await dataService.addCaseNote(testCase.id, 'First note', 'user1');
      await dataService.addCaseNote(testCase.id, 'Second note', 'user2');

      const updatedCase = await dataService.getCase(testCase.id);
      expect(updatedCase!.notes).toHaveLength(2);
    });
  });

  describe('transaction', () => {
    it('should execute operations within a transaction', async () => {
      const testCase = createTestCase();

      const result = dataService.transaction(() => {
        // Use synchronous operations within transaction
        const stmt1 = dbManager.getConnection().prepare(`
          INSERT INTO cases (id, application_data, status, current_step, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt1.run(
          testCase.id,
          JSON.stringify(testCase.applicationData),
          testCase.status,
          testCase.currentStep,
          testCase.createdAt.toISOString(),
          testCase.updatedAt.toISOString()
        );

        const stmt2 = dbManager.getConnection().prepare(`
          INSERT INTO case_notes (id, case_id, content, created_by, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt2.run(
          randomUUID(),
          testCase.id,
          'Transaction note',
          'user123',
          new Date().toISOString()
        );

        return true;
      });

      expect(result).toBe(true);
      const retrievedCase = await dataService.getCase(testCase.id);
      expect(retrievedCase).toBeDefined();
      expect(retrievedCase!.notes).toHaveLength(1);
    });

    it('should rollback on transaction failure', async () => {
      const testCase = createTestCase();

      try {
        dataService.transaction(() => {
          const stmt = dbManager.getConnection().prepare(`
            INSERT INTO cases (id, application_data, status, current_step, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            testCase.id,
            JSON.stringify(testCase.applicationData),
            testCase.status,
            testCase.currentStep,
            testCase.createdAt.toISOString(),
            testCase.updatedAt.toISOString()
          );

          throw new Error('Transaction should fail');
        });
      } catch (error) {
        // Expected to fail
      }

      const retrievedCase = await dataService.getCase(testCase.id);
      expect(retrievedCase).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Test with invalid case ID that would cause SQL issues
      const result = await dataService.getCase('');
      expect(result).toBeNull();
    });

    it('should provide meaningful error messages', async () => {
      await expect(
        dataService.updateCase('non-existent', { status: CaseStatus.APPROVED })
      ).rejects.toThrow('Failed to update case');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk case operations efficiently', async () => {
      const cases: Case[] = [];

      // Create 50 test cases
      for (let i = 0; i < 50; i++) {
        const testCase = createTestCase();
        testCase.id = `bulk-case-${i}`;
        testCase.applicationData.applicantName = `Applicant ${i}`;
        cases.push(testCase);
      }

      const startTime = Date.now();

      // Save all cases
      for (const testCase of cases) {
        await dataService.saveCase(testCase);
      }

      const saveTime = Date.now() - startTime;

      // Retrieve all cases
      const retrieveStartTime = Date.now();
      const activeCases = await dataService.getCasesByStatus(CaseStatus.ACTIVE);
      const retrieveTime = Date.now() - retrieveStartTime;

      expect(activeCases).toHaveLength(50);
      expect(saveTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(retrieveTime).toBeLessThan(1000); // Should retrieve within 1 second
    });

    it('should perform well with large audit trails', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const startTime = Date.now();

      // Add 100 audit entries
      for (let i = 0; i < 100; i++) {
        const activity = createTestActivity(testCase.id);
        activity.id = `audit-${i}`;
        activity.action = `action_${i}`;
        await dataService.logActivity(activity);
      }

      const logTime = Date.now() - startTime;

      // Retrieve audit trail
      const retrieveStartTime = Date.now();
      const auditTrail = await dataService.getAuditTrail(testCase.id);
      const retrieveTime = Date.now() - retrieveStartTime;

      expect(auditTrail).toHaveLength(100);
      expect(logTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(retrieveTime).toBeLessThan(500); // Should retrieve within 0.5 seconds
    });

    it('should handle concurrent database operations', async () => {
      const promises: Promise<void>[] = [];

      // Create 10 concurrent case save operations
      for (let i = 0; i < 10; i++) {
        const testCase = createTestCase();
        testCase.id = `concurrent-case-${i}`;
        promises.push(dataService.saveCase(testCase));
      }

      // All operations should complete successfully
      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Verify all cases were saved
      const activeCases = await dataService.getCasesByStatus(CaseStatus.ACTIVE);
      expect(activeCases).toHaveLength(10);
    });

    it('should efficiently query cases by date ranges', async () => {
      const baseDate = new Date('2024-01-01');
      const cases: Case[] = [];

      // Create cases with different dates
      for (let i = 0; i < 20; i++) {
        const testCase = createTestCase();
        testCase.id = `date-case-${i}`;
        testCase.createdAt = new Date(baseDate.getTime() + (i * 24 * 60 * 60 * 1000)); // Each case 1 day apart
        cases.push(testCase);
      }

      // Save all cases
      for (const testCase of cases) {
        await dataService.saveCase(testCase);
      }

      const startTime = Date.now();
      const allCases = await dataService.getCasesByStatus(CaseStatus.ACTIVE);
      const queryTime = Date.now() - startTime;

      expect(allCases).toHaveLength(20);
      expect(queryTime).toBeLessThan(200); // Should be very fast for date-based queries

      // Verify cases are ordered by creation date (most recent first)
      for (let i = 1; i < allCases.length; i++) {
        expect(allCases[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(allCases[i].createdAt.getTime());
      }
    });
  });

  describe('AI Integration Tracking', () => {
    it('should track AI costs and token usage accurately', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const interactions = [
        { ...createTestAIInteraction(testCase.id), id: randomUUID(), tokensUsed: 100, cost: 0.02 },
        { ...createTestAIInteraction(testCase.id), id: randomUUID(), tokensUsed: 150, cost: 0.03 },
        { ...createTestAIInteraction(testCase.id), id: randomUUID(), tokensUsed: 200, cost: 0.04 }
      ];

      for (const interaction of interactions) {
        await dataService.logAIInteraction(interaction);
      }

      const history = await dataService.getAIInteractionHistory(testCase.id);

      expect(history).toHaveLength(3);

      const totalTokens = history.reduce((sum, h) => sum + h.tokensUsed, 0);
      const totalCost = history.reduce((sum, h) => sum + (h.cost || 0), 0);

      expect(totalTokens).toBe(450);
      expect(totalCost).toBeCloseTo(0.09, 2);
    });

    it('should handle all AI operation types', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const operations = [
        'generate_summary',
        'generate_recommendation',
        'analyze_application',
        'generate_final_summary',
        'validate_completeness',
        'detect_missing_fields'
      ] as const;

      for (const operation of operations) {
        const interaction = createTestAIInteraction(testCase.id);
        interaction.id = randomUUID();
        interaction.operation = operation;
        await dataService.logAIInteraction(interaction);
      }

      const history = await dataService.getAIInteractionHistory(testCase.id);
      expect(history).toHaveLength(6);

      const operationTypes = history.map(h => h.operation);
      for (const operation of operations) {
        expect(operationTypes).toContain(operation);
      }
    });

    it('should maintain prompt template versioning', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const interactions = [
        {
          ...createTestAIInteraction(testCase.id),
          id: randomUUID(),
          promptTemplate: 'summary-template-v1',
          promptVersion: '1.0.0'
        },
        {
          ...createTestAIInteraction(testCase.id),
          id: randomUUID(),
          promptTemplate: 'summary-template-v2',
          promptVersion: '1.1.0'
        },
        {
          ...createTestAIInteraction(testCase.id),
          id: randomUUID(),
          promptTemplate: 'recommendation-template-v1',
          promptVersion: '2.0.0'
        }
      ];

      for (const interaction of interactions) {
        await dataService.logAIInteraction(interaction);
      }

      const history = await dataService.getAIInteractionHistory(testCase.id);

      expect(history).toHaveLength(3);
      expect(history.find(h => h.promptTemplate === 'summary-template-v1')).toBeDefined();
      expect(history.find(h => h.promptTemplate === 'summary-template-v2')).toBeDefined();
      expect(history.find(h => h.promptTemplate === 'recommendation-template-v1')).toBeDefined();
      expect(history.find(h => h.promptVersion === '1.0.0')).toBeDefined();
      expect(history.find(h => h.promptVersion === '1.1.0')).toBeDefined();
      expect(history.find(h => h.promptVersion === '2.0.0')).toBeDefined();
    });

    it('should aggregate AI usage metrics by case', async () => {
      const testCase1 = createTestCase();
      const testCase2 = createTestCase();
      testCase2.id = randomUUID();

      await dataService.saveCase(testCase1);
      await dataService.saveCase(testCase2);

      // Add interactions for case 1
      for (let i = 0; i < 3; i++) {
        const interaction = createTestAIInteraction(testCase1.id);
        interaction.id = randomUUID();
        interaction.cost = 0.01 * (i + 1);
        await dataService.logAIInteraction(interaction);
      }

      // Add interactions for case 2
      for (let i = 0; i < 2; i++) {
        const interaction = createTestAIInteraction(testCase2.id);
        interaction.id = randomUUID();
        interaction.cost = 0.02 * (i + 1);
        await dataService.logAIInteraction(interaction);
      }

      const history1 = await dataService.getAIInteractionHistory(testCase1.id);
      const history2 = await dataService.getAIInteractionHistory(testCase2.id);

      expect(history1).toHaveLength(3);
      expect(history2).toHaveLength(2);

      const cost1 = history1.reduce((sum, h) => sum + (h.cost || 0), 0);
      const cost2 = history2.reduce((sum, h) => sum + (h.cost || 0), 0);

      expect(cost1).toBeCloseTo(0.06, 2); // 0.01 + 0.02 + 0.03
      expect(cost2).toBeCloseTo(0.06, 2); // 0.02 + 0.04
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain referential integrity on case deletion', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      // Add related data
      await dataService.addCaseNote(testCase.id, 'Test note', 'user1');

      const summary = createTestAISummary(testCase.id);
      await dataService.saveSummary(summary);

      const activity = createTestActivity(testCase.id);
      await dataService.logActivity(activity);

      const interaction = createTestAIInteraction(testCase.id);
      await dataService.logAIInteraction(interaction);

      // Verify related data exists
      const caseWithData = await dataService.getCase(testCase.id);
      expect(caseWithData!.notes).toHaveLength(1);
      expect(caseWithData!.aiSummaries).toHaveLength(1);
      expect(caseWithData!.auditTrail).toHaveLength(1);

      const aiHistory = await dataService.getAIInteractionHistory(testCase.id);
      expect(aiHistory).toHaveLength(1);

      // Delete case by directly using database connection (simulating cascade delete)
      const stmt = dbManager.getConnection().prepare('DELETE FROM cases WHERE id = ?');
      stmt.run(testCase.id);

      // Verify case and related data are gone
      const deletedCase = await dataService.getCase(testCase.id);
      expect(deletedCase).toBeNull();

      const emptyHistory = await dataService.getAIInteractionHistory(testCase.id);
      expect(emptyHistory).toHaveLength(0);
    });

    it('should handle JSON data integrity', async () => {
      const testCase = createTestCase();

      // Test with complex nested JSON data
      testCase.applicationData.formData = {
        personalInfo: {
          name: 'John Doe',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            coordinates: { lat: 40.7128, lng: -74.0060 }
          }
        },
        documents: [
          { type: 'passport', number: 'A1234567', expiry: '2025-12-31' },
          { type: 'license', number: 'DL123456', state: 'NY' }
        ],
        preferences: {
          notifications: true,
          language: 'en',
          tags: ['urgent', 'priority', 'review-required']
        }
      };

      await dataService.saveCase(testCase);
      const retrievedCase = await dataService.getCase(testCase.id);

      expect(retrievedCase).toBeDefined();
      expect(retrievedCase!.applicationData.formData.personalInfo.name).toBe('John Doe');
      expect(retrievedCase!.applicationData.formData.personalInfo.address.coordinates.lat).toBe(40.7128);
      expect(retrievedCase!.applicationData.formData.documents).toHaveLength(2);
      expect(retrievedCase!.applicationData.formData.preferences.tags).toEqual(['urgent', 'priority', 'review-required']);
    });

    it('should validate timestamp consistency across operations', async () => {
      const beforeSave = new Date();

      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const afterSave = new Date();

      // Add a note
      await dataService.addCaseNote(testCase.id, 'Test note', 'user1');

      // Log an activity
      const activity = createTestActivity(testCase.id);
      await dataService.logActivity(activity);

      const retrievedCase = await dataService.getCase(testCase.id);

      expect(retrievedCase).toBeDefined();
      expect(retrievedCase!.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      
      // Allow small tolerance for timestamp precision differences (1 second)
      const timestampTolerance = 1000; // 1 second in milliseconds
      expect(retrievedCase!.createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime() + timestampTolerance);
      
      expect(retrievedCase!.updatedAt.getTime()).toBeGreaterThanOrEqual(retrievedCase!.createdAt.getTime());

      // Check note timestamp
      expect(retrievedCase!.notes[0].createdAt.getTime()).toBeGreaterThanOrEqual(afterSave.getTime());

      // Check audit trail timestamp
      expect(retrievedCase!.auditTrail[0].timestamp.getTime()).toBeGreaterThanOrEqual(afterSave.getTime());
    });

    it('should handle database constraint violations gracefully', async () => {
      // Test foreign key constraint by trying to add note to non-existent case
      await expect(
        dataService.addCaseNote('non-existent-case-id', 'Test note', 'user1')
      ).rejects.toThrow('Failed to add case note');

      // Test trying to save AI summary for non-existent case
      const summary = createTestAISummary('non-existent-case-id');
      await expect(
        dataService.saveSummary(summary)
      ).rejects.toThrow('Failed to save AI summary');
    });
  });

  describe('Reporting and Analytics Support', () => {
    it('should support case metrics aggregation', async () => {
      const baseDate = new Date('2024-01-01');
      const statuses = [CaseStatus.ACTIVE, CaseStatus.PENDING, CaseStatus.APPROVED, CaseStatus.DENIED];

      // Create cases with different statuses and dates
      for (let i = 0; i < 20; i++) {
        const testCase = createTestCase();
        testCase.id = `metrics-case-${i}`;
        testCase.status = statuses[i % statuses.length];
        testCase.createdAt = new Date(baseDate.getTime() + (i * 24 * 60 * 60 * 1000));
        await dataService.saveCase(testCase);
      }

      // Test aggregation by status
      const activeCases = await dataService.getCasesByStatus(CaseStatus.ACTIVE);
      const pendingCases = await dataService.getCasesByStatus(CaseStatus.PENDING);
      const approvedCases = await dataService.getCasesByStatus(CaseStatus.APPROVED);
      const deniedCases = await dataService.getCasesByStatus(CaseStatus.DENIED);

      expect(activeCases).toHaveLength(5);
      expect(pendingCases).toHaveLength(5);
      expect(approvedCases).toHaveLength(5);
      expect(deniedCases).toHaveLength(5);

      // Verify cases are properly ordered by creation date
      expect(activeCases[0].createdAt.getTime()).toBeGreaterThan(activeCases[1].createdAt.getTime());
    });

    it('should calculate processing time metrics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-10');

      const testCase = createTestCase();
      testCase.createdAt = startDate;
      testCase.updatedAt = endDate;
      testCase.status = CaseStatus.APPROVED; // Use a valid status from the enum

      await dataService.saveCase(testCase);

      const retrievedCase = await dataService.getCase(testCase.id);
      expect(retrievedCase).toBeDefined();

      const processingTime = retrievedCase!.updatedAt.getTime() - retrievedCase!.createdAt.getTime();
      const expectedProcessingTime = 9 * 24 * 60 * 60 * 1000; // 9 days in milliseconds

      expect(processingTime).toBe(expectedProcessingTime);
    });

    it('should support AI usage pattern analysis', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const operations = ['generate_summary', 'generate_recommendation', 'analyze_application'];
      const models = ['grok-beta', 'grok-2', 'grok-1'];

      // Create interactions with different operations and models
      for (let i = 0; i < 15; i++) {
        const interaction = createTestAIInteraction(testCase.id);
        interaction.id = randomUUID();
        interaction.operation = operations[i % operations.length] as any;
        interaction.model = models[i % models.length];
        interaction.tokensUsed = 100 + (i * 10);
        interaction.cost = 0.01 + (i * 0.001);
        await dataService.logAIInteraction(interaction);
      }

      const history = await dataService.getAIInteractionHistory(testCase.id);
      expect(history).toHaveLength(15);

      // Analyze usage patterns
      const operationCounts = history.reduce((acc, h) => {
        acc[h.operation] = (acc[h.operation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const modelCounts = history.reduce((acc, h) => {
        acc[h.model] = (acc[h.model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(operationCounts['generate_summary']).toBe(5);
      expect(operationCounts['generate_recommendation']).toBe(5);
      expect(operationCounts['analyze_application']).toBe(5);

      expect(modelCounts['grok-beta']).toBe(5);
      expect(modelCounts['grok-2']).toBe(5);
      expect(modelCounts['grok-1']).toBe(5);
    });

    it('should handle complex audit trail queries', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      const actions = ['case_created', 'status_updated', 'note_added', 'ai_summary_generated'];
      const users = ['user1', 'user2', 'system'];

      // Create diverse audit entries
      for (let i = 0; i < 20; i++) {
        const activity = createTestActivity(testCase.id);
        activity.id = randomUUID();
        activity.action = actions[i % actions.length];
        activity.userId = users[i % users.length];
        activity.timestamp = new Date(Date.now() + (i * 1000)); // 1 second apart
        activity.details = {
          step: i,
          metadata: { priority: i % 3 === 0 ? 'high' : 'normal' }
        };
        await dataService.logActivity(activity);
      }

      const auditTrail = await dataService.getAuditTrail(testCase.id);
      expect(auditTrail).toHaveLength(20);

      // Verify audit trail is ordered by timestamp (most recent first)
      for (let i = 1; i < auditTrail.length; i++) {
        expect(new Date(auditTrail[i - 1].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(auditTrail[i].timestamp).getTime());
      }

      // Verify different actions and users are represented
      const actionTypes = auditTrail.map(a => a.action);
      const userIds = auditTrail.map(a => a.user_id);

      expect(new Set(actionTypes).size).toBe(4); // All 4 action types
      expect(new Set(userIds).size).toBe(3); // All 3 users
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should handle extremely long text content', async () => {
      const testCase = createTestCase();
      await dataService.saveCase(testCase);

      // Create very long content (10KB)
      const longContent = 'A'.repeat(10000);

      await dataService.addCaseNote(testCase.id, longContent, 'user1');

      const summary = createTestAISummary(testCase.id);
      summary.content = longContent;
      await dataService.saveSummary(summary);

      const interaction = createTestAIInteraction(testCase.id);
      interaction.prompt = longContent;
      interaction.response = longContent;
      await dataService.logAIInteraction(interaction);

      const retrievedCase = await dataService.getCase(testCase.id);
      expect(retrievedCase!.notes[0].content).toBe(longContent);
      expect(retrievedCase!.aiSummaries[0].content).toBe(longContent);

      const history = await dataService.getAIInteractionHistory(testCase.id);
      expect(history[0].prompt).toBe(longContent);
      expect(history[0].response).toBe(longContent);
    });

    it('should handle special characters in all text fields', async () => {
      const specialChars = '🚀 Special chars: àáâãäåæçèéêë ñ 中文 العربية русский "quotes" \'apostrophes\' <tags> & symbols!';

      const testCase = createTestCase();
      testCase.applicationData.applicantName = specialChars;
      testCase.applicationData.formData = { specialField: specialChars };

      await dataService.saveCase(testCase);

      await dataService.addCaseNote(testCase.id, specialChars, 'user1');

      const summary = createTestAISummary(testCase.id);
      summary.content = specialChars;
      summary.recommendations = [specialChars, 'Normal text'];
      await dataService.saveSummary(summary);

      const retrievedCase = await dataService.getCase(testCase.id);
      expect(retrievedCase!.applicationData.applicantName).toBe(specialChars);
      expect(retrievedCase!.applicationData.formData.specialField).toBe(specialChars);
      expect(retrievedCase!.notes[0].content).toBe(specialChars);
      expect(retrievedCase!.aiSummaries[0].content).toBe(specialChars);
      expect(retrievedCase!.aiSummaries[0].recommendations[0]).toBe(specialChars);
    });

    it('should validate date boundaries and edge cases', async () => {
      const testCase = createTestCase();

      // Test with dates at boundaries
      const farPast = new Date('1900-01-01');
      const farFuture = new Date('2100-12-31');

      testCase.createdAt = farPast;
      testCase.updatedAt = farFuture;
      testCase.applicationData.submissionDate = farPast;

      await dataService.saveCase(testCase);

      const retrievedCase = await dataService.getCase(testCase.id);
      expect(retrievedCase!.createdAt.getFullYear()).toBe(1900);
      expect(retrievedCase!.updatedAt.getFullYear()).toBe(2100);
      // submissionDate is stored as JSON and comes back as string, so convert to Date
      expect(new Date(retrievedCase!.applicationData.submissionDate).getFullYear()).toBe(1900);
    });

    it('should handle empty and null values appropriately', async () => {
      const testCase = createTestCase();
      testCase.assignedTo = undefined;
      testCase.applicationData.documents = [];
      testCase.applicationData.formData = {};

      await dataService.saveCase(testCase);

      // Test with empty note content
      await expect(
        dataService.addCaseNote(testCase.id, '', 'user1')
      ).resolves.not.toThrow();

      // Test with empty AI summary
      const summary = createTestAISummary(testCase.id);
      summary.recommendations = [];
      await dataService.saveSummary(summary);

      const retrievedCase = await dataService.getCase(testCase.id);
      expect(retrievedCase!.assignedTo).toBeUndefined();
      expect(retrievedCase!.applicationData.documents).toEqual([]);
      expect(retrievedCase!.applicationData.formData).toEqual({});
      expect(retrievedCase!.notes[0].content).toBe('');
      expect(retrievedCase!.aiSummaries[0].recommendations).toEqual([]);
    });
  });

  // Helper functions for creating test data
  function createTestCase(): Case {
    return {
      id: randomUUID(),
      applicationData: {
        applicantName: 'John Doe',
        applicantEmail: 'john@example.com',
        applicationType: 'Standard Application',
        submissionDate: new Date(),
        documents: [],
        formData: { field1: 'value1', field2: 'value2' }
      },
      status: CaseStatus.ACTIVE,
      currentStep: ProcessStep.RECEIVED,
      createdAt: new Date(), // Use current timestamp for logical consistency
      updatedAt: new Date(),
      notes: [],
      aiSummaries: [],
      auditTrail: []
    };
  }

  function createTestCaseWithNotesAndSummaries(): Case {
    const testCase = createTestCase();

    testCase.notes = [
      {
        id: randomUUID(),
        caseId: testCase.id,
        content: 'First note',
        createdBy: 'user1',
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        caseId: testCase.id,
        content: 'Second note',
        createdBy: 'user2',
        createdAt: new Date()
      }
    ];

    testCase.aiSummaries = [
      createTestAISummary(testCase.id)
    ];

    testCase.auditTrail = [
      {
        id: randomUUID(),
        caseId: testCase.id,
        action: 'case_created',
        details: { source: 'test' },
        userId: 'system',
        timestamp: new Date()
      }
    ];

    return testCase;
  }

  function createTestAISummary(caseId: string): AISummary {
    return {
      id: randomUUID(),
      caseId,
      type: 'overall',
      content: 'Test AI summary content',
      recommendations: ['Recommendation 1', 'Recommendation 2'],
      confidence: 0.85,
      generatedAt: new Date(),
      version: 1
    };
  }

  function createTestActivity(caseId: string): ActivityLog {
    return {
      id: randomUUID(),
      caseId,
      action: 'case_created',
      details: { source: 'test', additionalInfo: 'test data' },
      userId: 'test-user',
      timestamp: new Date()
    };
  }

  function createTestAIInteraction(caseId: string): AIInteraction {
    return {
      id: randomUUID(),
      caseId,
      operation: 'generate_summary',
      prompt: 'Test prompt for AI',
      response: 'Test AI response',
      model: 'grok-beta',
      tokensUsed: 150,
      duration: 2500,
      success: true,
      timestamp: new Date()
    };
  }
});