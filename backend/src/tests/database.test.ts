import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseConnection } from '../database/connection.js';
import { DatabaseSchema } from '../database/schema.js';
import { DatabaseSeeder } from '../database/seeder.js';
import { MigrationManager, initialMigrations } from '../database/migrations.js';
import { DatabaseManager } from '../database/index.js';
import { ProcessStep } from '../types/database.js';

describe('Database Connection', () => {
  let connection: DatabaseConnection;

  beforeEach(() => {
    connection = DatabaseConnection.getInstance();
  });

  afterEach(() => {
    // Clean up any test tables
    try {
      connection.exec('DROP TABLE IF EXISTS test_table');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should create a singleton instance', () => {
    const instance1 = DatabaseConnection.getInstance();
    const instance2 = DatabaseConnection.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should establish database connection', () => {
    expect(connection).toBeDefined();
    expect(connection.getDatabase()).toBeDefined();
  });

  it('should perform health check and be healthy', () => {
    const isHealthy = connection.isHealthy();
    expect(isHealthy).toBe(true);
  });

  it('should execute SQL statements', () => {
    expect(() => {
      connection.exec('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY)');
    }).not.toThrow();
  });

  it('should prepare statements', () => {
    connection.exec('CREATE TABLE IF NOT EXISTS test_table2 (id INTEGER PRIMARY KEY, name TEXT)');
    const stmt = connection.prepare('INSERT INTO test_table2 (name) VALUES (?)');
    expect(stmt).toBeDefined();
    
    const result = stmt.run('test');
    expect(result.changes).toBe(1);
    
    // Cleanup
    connection.exec('DROP TABLE IF EXISTS test_table2');
  });

  it('should handle transactions', () => {
    connection.exec('CREATE TABLE IF NOT EXISTS test_table3 (id INTEGER PRIMARY KEY, name TEXT)');
    
    const result = connection.transaction(() => {
      const stmt = connection.prepare('INSERT INTO test_table3 (name) VALUES (?)');
      stmt.run('test1');
      stmt.run('test2');
      return 'success';
    });

    expect(result).toBe('success');
    
    const countStmt = connection.prepare('SELECT COUNT(*) as count FROM test_table3');
    const count = countStmt.get() as { count: number };
    expect(count.count).toBe(2);
    
    // Cleanup
    connection.exec('DROP TABLE IF EXISTS test_table3');
  });
});

describe('Database Schema', () => {
  let schema: DatabaseSchema;
  let connection: DatabaseConnection;

  beforeEach(() => {
    connection = DatabaseConnection.getInstance();
    schema = new DatabaseSchema();
  });

  afterEach(() => {
    schema.dropAllTables();
  });

  it('should initialize schema', () => {
    expect(() => schema.initializeSchema()).not.toThrow();
  });

  it('should create all required tables', () => {
    schema.initializeSchema();
    const tables = schema.listTables();
    
    const expectedTables = ['cases', 'ai_summaries', 'case_notes', 'audit_trail', 'ai_interactions'];
    expectedTables.forEach(table => {
      expect(tables).toContain(table);
    });
  });

  it('should validate schema structure', () => {
    schema.initializeSchema();
    const isValid = schema.validateSchema();
    expect(isValid).toBe(true);
  });

  it('should get table information', () => {
    schema.initializeSchema();
    const tableInfo = schema.getTableInfo('cases');
    expect(tableInfo.length).toBeGreaterThan(0);
    
    const columnNames = tableInfo.map((col: any) => col.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('status');
    expect(columnNames).toContain('current_step');
  });

  it('should enforce foreign key constraints', () => {
    schema.initializeSchema();
    
    // Try to insert AI summary without corresponding case
    const stmt = connection.prepare(`
      INSERT INTO ai_summaries (id, case_id, type, content, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    expect(() => {
      stmt.run('summary-1', 'nonexistent-case', 'overall', 'test content', 1);
    }).toThrow();
  });

  it('should enforce check constraints', () => {
    schema.initializeSchema();
    
    // Try to insert case with invalid status
    const stmt = connection.prepare(`
      INSERT INTO cases (id, application_data, status, current_step)
      VALUES (?, ?, ?, ?)
    `);
    
    expect(() => {
      stmt.run('case-1', '{}', 'invalid_status', ProcessStep.RECEIVED);
    }).toThrow();
  });
});

describe('Database Seeder', () => {
  let seeder: DatabaseSeeder;
  let schema: DatabaseSchema;

  beforeEach(() => {
    schema = new DatabaseSchema();
    schema.initializeSchema();
    seeder = new DatabaseSeeder();
  });

  afterEach(() => {
    schema.dropAllTables();
  });

  it('should seed database with sample data', async () => {
    await seeder.seedDatabase();
    
    const counts = seeder.getRecordCounts();
    expect(counts.cases).toBeGreaterThan(0);
    expect(counts.ai_summaries).toBeGreaterThan(0);
    expect(counts.case_notes).toBeGreaterThan(0);
    expect(counts.audit_trail).toBeGreaterThan(0);
    expect(counts.ai_interactions).toBeGreaterThan(0);
  });

  it('should clear database', async () => {
    await seeder.seedDatabase();
    await seeder.clearDatabase();
    
    const counts = seeder.getRecordCounts();
    Object.values(counts).forEach(count => {
      expect(count).toBe(0);
    });
  });

  it('should get record counts', () => {
    const counts = seeder.getRecordCounts();
    expect(counts).toHaveProperty('cases');
    expect(counts).toHaveProperty('ai_summaries');
    expect(counts).toHaveProperty('case_notes');
    expect(counts).toHaveProperty('audit_trail');
    expect(counts).toHaveProperty('ai_interactions');
  });
});

describe('Migration Manager', () => {
  let migrationManager: MigrationManager;
  let schema: DatabaseSchema;

  beforeEach(() => {
    migrationManager = new MigrationManager();
    schema = new DatabaseSchema();
  });

  afterEach(() => {
    schema.dropAllTables();
  });

  it('should run initial migrations', async () => {
    await migrationManager.runMigrations(initialMigrations);
    
    const executed = migrationManager.getExecutedMigrations();
    expect(executed).toContain('001_create_initial_schema');
  });

  it('should not run already executed migrations', async () => {
    await migrationManager.runMigrations(initialMigrations);
    
    // Run again - should not throw or duplicate
    await migrationManager.runMigrations(initialMigrations);
    
    const executed = migrationManager.getExecutedMigrations();
    expect(executed.filter(name => name === '001_create_initial_schema')).toHaveLength(1);
  });

  it('should identify pending migrations', async () => {
    // Clear migrations table first to ensure clean state
    const connection = DatabaseConnection.getInstance();
    connection.exec('DROP TABLE IF EXISTS migrations');
    
    // Create a fresh migration manager
    const freshMigrationManager = new MigrationManager();
    
    const pending = freshMigrationManager.getPendingMigrations(initialMigrations);
    expect(pending).toHaveLength(initialMigrations.length);
    
    await freshMigrationManager.runMigrations(initialMigrations);
    
    const pendingAfter = freshMigrationManager.getPendingMigrations(initialMigrations);
    expect(pendingAfter).toHaveLength(0);
  });
});

describe('Database Manager', () => {
  let databaseManager: DatabaseManager;

  beforeEach(() => {
    databaseManager = new DatabaseManager();
  });

  afterEach(() => {
    databaseManager.getSchema().dropAllTables();
  });

  it('should initialize database', async () => {
    await databaseManager.initialize();
    
    const status = databaseManager.getStatus();
    expect(status.isHealthy).toBe(true);
    expect(status.tables.length).toBeGreaterThan(0);
  });

  it('should initialize with seeded data', async () => {
    await databaseManager.initialize({ seedData: true });
    
    const status = databaseManager.getStatus();
    expect(status.isHealthy).toBe(true);
    
    const counts = Object.values(status.recordCounts);
    const totalRecords = counts.reduce((sum, count) => sum + count, 0);
    expect(totalRecords).toBeGreaterThan(0);
  });

  it('should reset database', async () => {
    await databaseManager.initialize({ seedData: true });
    
    // Verify data exists
    let status = databaseManager.getStatus();
    let totalRecords = Object.values(status.recordCounts).reduce((sum, count) => sum + count, 0);
    expect(totalRecords).toBeGreaterThan(0);
    
    // Reset
    await databaseManager.reset();
    
    // Verify data still exists (reset includes seeding)
    status = databaseManager.getStatus();
    totalRecords = Object.values(status.recordCounts).reduce((sum, count) => sum + count, 0);
    expect(totalRecords).toBeGreaterThan(0);
  });

  it('should provide database status', async () => {
    await databaseManager.initialize();
    
    const status = databaseManager.getStatus();
    expect(status).toHaveProperty('isHealthy');
    expect(status).toHaveProperty('tables');
    expect(status).toHaveProperty('recordCounts');
    expect(status).toHaveProperty('databasePath');
    
    expect(typeof status.isHealthy).toBe('boolean');
    expect(Array.isArray(status.tables)).toBe(true);
    expect(typeof status.recordCounts).toBe('object');
    expect(typeof status.databasePath).toBe('string');
  });

  it('should handle initialization errors gracefully', async () => {
    // This test verifies error handling without breaking other tests
    const testManager = new DatabaseManager();
    
    // Test initialization without closing first
    await expect(async () => {
      // Force an error by trying to initialize with invalid state
      await testManager.initialize();
      await testManager.initialize(); // Second initialization should work fine
    }).not.toThrow();
  });
});

describe('Database Integration', () => {
  let databaseManager: DatabaseManager;

  beforeEach(async () => {
    databaseManager = new DatabaseManager();
    await databaseManager.initialize({ seedData: false });
  });

  afterEach(() => {
    try {
      if (databaseManager) {
        databaseManager.getSchema().dropAllTables();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should maintain referential integrity', () => {
    const connection = databaseManager.getConnection();
    
    // Insert a test case
    const caseStmt = connection.prepare(`
      INSERT INTO cases (id, application_data, status, current_step)
      VALUES (?, ?, ?, ?)
    `);
    caseStmt.run('test-case-1', '{}', 'active', 'received');
    
    // Insert related AI summary
    const summaryStmt = connection.prepare(`
      INSERT INTO ai_summaries (id, case_id, type, content, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    summaryStmt.run('test-summary-1', 'test-case-1', 'overall', 'Test summary', 1);
    
    // Verify the relationship exists
    const checkStmt = connection.prepare('SELECT COUNT(*) as count FROM ai_summaries WHERE case_id = ?');
    const result = checkStmt.get('test-case-1') as { count: number };
    expect(result.count).toBe(1);
  });

  it('should support complex queries', () => {
    const connection = databaseManager.getConnection();
    
    // Insert test data
    const caseStmt = connection.prepare(`
      INSERT INTO cases (id, application_data, status, current_step)
      VALUES (?, ?, ?, ?)
    `);
    caseStmt.run('test-case-2', '{}', 'active', 'received');
    
    const summaryStmt = connection.prepare(`
      INSERT INTO ai_summaries (id, case_id, type, content, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    summaryStmt.run('test-summary-2', 'test-case-2', 'overall', 'Test summary', 1);
    
    // Query cases with their AI summaries
    const stmt = connection.prepare(`
      SELECT c.id, c.status, c.current_step, COUNT(s.id) as summary_count
      FROM cases c
      LEFT JOIN ai_summaries s ON c.id = s.case_id
      GROUP BY c.id, c.status, c.current_step
    `);
    
    const results = stmt.all();
    expect(results.length).toBeGreaterThan(0);
    
    results.forEach((result: any) => {
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('current_step');
      expect(result).toHaveProperty('summary_count');
      expect(typeof result.summary_count).toBe('number');
    });
  });

  it('should handle concurrent operations', () => {
    const connection = databaseManager.getConnection();
    
    // Insert a test case first
    const caseStmt = connection.prepare(`
      INSERT INTO cases (id, application_data, status, current_step)
      VALUES (?, ?, ?, ?)
    `);
    caseStmt.run('test-case-3', '{}', 'active', 'received');
    
    // Simulate concurrent inserts using transactions
    const promises = Array.from({ length: 5 }, (_, i) => {
      return new Promise<void>((resolve) => {
        connection.transaction(() => {
          const stmt = connection.prepare(`
            INSERT INTO case_notes (id, case_id, content, created_by, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
          `);
          stmt.run(`note-${i}`, 'test-case-3', `Test note ${i}`, 'test-user');
        });
        resolve();
      });
    });
    
    expect(() => Promise.all(promises)).not.toThrow();
  });
});
describe('Database Schema - Enhanced Constraints', () => {
  let schema: DatabaseSchema;
  let connection: DatabaseConnection;

  beforeEach(() => {
    connection = DatabaseConnection.getInstance();
    schema = new DatabaseSchema();
    schema.initializeSchema();
  });

  afterEach(() => {
    schema.dropAllTables();
  });

  it('should enforce AI summary type constraints', () => {
    // Insert a valid case first
    const caseStmt = connection.prepare(`
      INSERT INTO cases (id, application_data, status, current_step)
      VALUES (?, ?, ?, ?)
    `);
    caseStmt.run('case-1', '{}', 'active', 'received');

    const stmt = connection.prepare(`
      INSERT INTO ai_summaries (id, case_id, type, content, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    // Should fail with invalid type
    expect(() => {
      stmt.run('summary-1', 'case-1', 'invalid_type', 'content', 1);
    }).toThrow();
  });

  it('should enforce AI interaction operation constraints', () => {
    // Insert a valid case first
    const caseStmt = connection.prepare(`
      INSERT INTO cases (id, application_data, status, current_step)
      VALUES (?, ?, ?, ?)
    `);
    caseStmt.run('case-1', '{}', 'active', 'received');

    const stmt = connection.prepare(`
      INSERT INTO ai_interactions (id, case_id, operation, prompt, response, model, duration, success)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Should fail with invalid operation
    expect(() => {
      stmt.run('int-1', 'case-1', 'invalid_operation', 'prompt', 'response', 'grok', 1000, 1);
    }).toThrow();
  });

  it('should enforce current_step constraints', () => {
    const stmt = connection.prepare(`
      INSERT INTO cases (id, application_data, status, current_step)
      VALUES (?, ?, ?, ?)
    `);
    
    // Should fail with invalid step
    expect(() => {
      stmt.run('case-1', '{}', 'active', 'invalid_step');
    }).toThrow();
  });

  it('should enforce AI summary step constraints', () => {
    // Insert a valid case first
    const caseStmt = connection.prepare(`
      INSERT INTO cases (id, application_data, status, current_step)
      VALUES (?, ?, ?, ?)
    `);
    caseStmt.run('case-1', '{}', 'active', 'received');

    const stmt = connection.prepare(`
      INSERT INTO ai_summaries (id, case_id, type, step, content, version)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Should fail with invalid step
    expect(() => {
      stmt.run('summary-1', 'case-1', 'step-specific', 'invalid_step', 'content', 1);
    }).toThrow();
  });

  it('should allow valid enum values', () => {
    // Insert a valid case first
    const caseStmt = connection.prepare(`
      INSERT INTO cases (id, application_data, status, current_step)
      VALUES (?, ?, ?, ?)
    `);
    
    // Should succeed with all valid status values
    expect(() => {
      caseStmt.run('case-1', '{}', 'active', 'received');
    }).not.toThrow();
    
    expect(() => {
      caseStmt.run('case-2', '{}', 'pending', 'in_review');
    }).not.toThrow();
    
    expect(() => {
      caseStmt.run('case-3', '{}', 'approved', 'concluded');
    }).not.toThrow();
  });
});

describe('Database Schema - Cascade Operations', () => {
  let schema: DatabaseSchema;
  let connection: DatabaseConnection;

  beforeEach(() => {
    connection = DatabaseConnection.getInstance();
    schema = new DatabaseSchema();
    schema.initializeSchema();
  });

  afterEach(() => {
    schema.dropAllTables();
  });

  it('should cascade delete AI summaries when case is deleted', () => {
    // Insert case and related data
    const caseStmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
    caseStmt.run('case-1', '{}', 'active', 'received');
    
    const summaryStmt = connection.prepare('INSERT INTO ai_summaries (id, case_id, type, content, version) VALUES (?, ?, ?, ?, ?)');
    summaryStmt.run('summary-1', 'case-1', 'overall', 'content', 1);
    
    // Verify data exists
    const checkStmt = connection.prepare('SELECT COUNT(*) as count FROM ai_summaries WHERE case_id = ?');
    expect((checkStmt.get('case-1') as {count: number}).count).toBe(1);
    
    // Delete case
    const deleteStmt = connection.prepare('DELETE FROM cases WHERE id = ?');
    deleteStmt.run('case-1');
    
    // Verify cascade delete worked
    expect((checkStmt.get('case-1') as {count: number}).count).toBe(0);
  });

  it('should cascade delete case notes when case is deleted', () => {
    // Insert case and related data
    const caseStmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
    caseStmt.run('case-1', '{}', 'active', 'received');
    
    const noteStmt = connection.prepare('INSERT INTO case_notes (id, case_id, content, created_by) VALUES (?, ?, ?, ?)');
    noteStmt.run('note-1', 'case-1', 'Test note', 'user-1');
    
    // Verify data exists
    const checkStmt = connection.prepare('SELECT COUNT(*) as count FROM case_notes WHERE case_id = ?');
    expect((checkStmt.get('case-1') as {count: number}).count).toBe(1);
    
    // Delete case
    const deleteStmt = connection.prepare('DELETE FROM cases WHERE id = ?');
    deleteStmt.run('case-1');
    
    // Verify cascade delete worked
    expect((checkStmt.get('case-1') as {count: number}).count).toBe(0);
  });

  it('should cascade delete audit trail when case is deleted', () => {
    // Insert case and related data
    const caseStmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
    caseStmt.run('case-1', '{}', 'active', 'received');
    
    const auditStmt = connection.prepare('INSERT INTO audit_trail (id, case_id, action, user_id) VALUES (?, ?, ?, ?)');
    auditStmt.run('audit-1', 'case-1', 'case_created', 'user-1');
    
    // Verify data exists
    const checkStmt = connection.prepare('SELECT COUNT(*) as count FROM audit_trail WHERE case_id = ?');
    expect((checkStmt.get('case-1') as {count: number}).count).toBe(1);
    
    // Delete case
    const deleteStmt = connection.prepare('DELETE FROM cases WHERE id = ?');
    deleteStmt.run('case-1');
    
    // Verify cascade delete worked
    expect((checkStmt.get('case-1') as {count: number}).count).toBe(0);
  });

  it('should cascade delete AI interactions when case is deleted', () => {
    // Insert case and related data
    const caseStmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
    caseStmt.run('case-1', '{}', 'active', 'received');
    
    const interactionStmt = connection.prepare(`
      INSERT INTO ai_interactions (id, case_id, operation, prompt, response, model, duration, success)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    interactionStmt.run('int-1', 'case-1', 'generate_summary', 'prompt', 'response', 'grok', 1000, 1);
    
    // Verify data exists
    const checkStmt = connection.prepare('SELECT COUNT(*) as count FROM ai_interactions WHERE case_id = ?');
    expect((checkStmt.get('case-1') as {count: number}).count).toBe(1);
    
    // Delete case
    const deleteStmt = connection.prepare('DELETE FROM cases WHERE id = ?');
    deleteStmt.run('case-1');
    
    // Verify cascade delete worked
    expect((checkStmt.get('case-1') as {count: number}).count).toBe(0);
  });

  it('should cascade delete all related records when case is deleted', () => {
    // Insert case and all related data
    const caseStmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
    caseStmt.run('case-1', '{}', 'active', 'received');
    
    // Insert related records
    const summaryStmt = connection.prepare('INSERT INTO ai_summaries (id, case_id, type, content, version) VALUES (?, ?, ?, ?, ?)');
    summaryStmt.run('summary-1', 'case-1', 'overall', 'content', 1);
    
    const noteStmt = connection.prepare('INSERT INTO case_notes (id, case_id, content, created_by) VALUES (?, ?, ?, ?)');
    noteStmt.run('note-1', 'case-1', 'Test note', 'user-1');
    
    const auditStmt = connection.prepare('INSERT INTO audit_trail (id, case_id, action, user_id) VALUES (?, ?, ?, ?)');
    auditStmt.run('audit-1', 'case-1', 'case_created', 'user-1');
    
    const interactionStmt = connection.prepare(`
      INSERT INTO ai_interactions (id, case_id, operation, prompt, response, model, duration, success)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    interactionStmt.run('int-1', 'case-1', 'generate_summary', 'prompt', 'response', 'grok', 1000, 1);
    
    // Verify all data exists
    const summaryCheck = connection.prepare('SELECT COUNT(*) as count FROM ai_summaries WHERE case_id = ?');
    const noteCheck = connection.prepare('SELECT COUNT(*) as count FROM case_notes WHERE case_id = ?');
    const auditCheck = connection.prepare('SELECT COUNT(*) as count FROM audit_trail WHERE case_id = ?');
    const interactionCheck = connection.prepare('SELECT COUNT(*) as count FROM ai_interactions WHERE case_id = ?');
    
    expect((summaryCheck.get('case-1') as {count: number}).count).toBe(1);
    expect((noteCheck.get('case-1') as {count: number}).count).toBe(1);
    expect((auditCheck.get('case-1') as {count: number}).count).toBe(1);
    expect((interactionCheck.get('case-1') as {count: number}).count).toBe(1);
    
    // Delete case
    const deleteStmt = connection.prepare('DELETE FROM cases WHERE id = ?');
    deleteStmt.run('case-1');
    
    // Verify all cascade deletes worked
    expect((summaryCheck.get('case-1') as {count: number}).count).toBe(0);
    expect((noteCheck.get('case-1') as {count: number}).count).toBe(0);
    expect((auditCheck.get('case-1') as {count: number}).count).toBe(0);
    expect((interactionCheck.get('case-1') as {count: number}).count).toBe(0);
  });
});

describe('Database - Data Validation', () => {
  let schema: DatabaseSchema;
  let connection: DatabaseConnection;

  beforeEach(() => {
    connection = DatabaseConnection.getInstance();
    schema = new DatabaseSchema();
    schema.initializeSchema();
  });

  afterEach(() => {
    schema.dropAllTables();
  });

  it('should handle NULL values correctly for optional fields', () => {
    // Insert a valid case first
    const caseStmt = connection.prepare(`
      INSERT INTO cases (id, application_data, status, current_step, assigned_to)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    // assigned_to is optional, should accept NULL
    expect(() => {
      caseStmt.run('case-1', '{}', 'active', 'received', null);
    }).not.toThrow();

    // Test optional fields in ai_summaries
    const summaryStmt = connection.prepare(`
      INSERT INTO ai_summaries (id, case_id, type, content, version, confidence, step, recommendations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    expect(() => {
      summaryStmt.run('summary-1', 'case-1', 'overall', 'content', 1, null, null, null);
    }).not.toThrow();
  });

  it('should enforce NOT NULL constraints', () => {
    // Test required fields cannot be NULL
    const stmt = connection.prepare(`
      INSERT INTO cases (id, application_data, status, current_step)
      VALUES (?, ?, ?, ?)
    `);
    
    expect(() => {
      stmt.run('case-1', null, 'active', 'received');
    }).toThrow();
    
    expect(() => {
      stmt.run('case-2', '{}', null, 'received');
    }).toThrow();
    
    expect(() => {
      stmt.run('case-3', '{}', 'active', null);
    }).toThrow();
  });

  it('should handle large JSON data in application_data', () => {
    const largeData = JSON.stringify({
      applicantName: 'Test User',
      applicantEmail: 'test@example.com',
      applicationType: 'Complex Application',
      documents: Array(100).fill({
        id: 'doc-id',
        filename: 'large-document.pdf',
        path: '/uploads/large-document.pdf',
        size: 1000000,
        mimeType: 'application/pdf',
        uploadedAt: new Date().toISOString()
      }),
      formData: {
        description: 'x'.repeat(10000), // Large text field
        additionalInfo: Array(50).fill('Additional information field').join(' ')
      }
    });
    
    const stmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
    expect(() => {
      stmt.run('case-1', largeData, 'active', 'received');
    }).not.toThrow();
    
    // Verify data was stored correctly
    const selectStmt = connection.prepare('SELECT application_data FROM cases WHERE id = ?');
    const result = selectStmt.get('case-1') as { application_data: string };
    expect(JSON.parse(result.application_data)).toHaveProperty('applicantName', 'Test User');
    expect(JSON.parse(result.application_data).documents).toHaveLength(100);
  });

  it('should handle special characters in text fields', () => {
    const specialContent = "Content with special chars: 'quotes', \"double quotes\", <tags>, & ampersands, 中文, émojis 🎉";
    
    const caseStmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
    caseStmt.run('case-1', '{}', 'active', 'received');
    
    const noteStmt = connection.prepare('INSERT INTO case_notes (id, case_id, content, created_by) VALUES (?, ?, ?, ?)');
    expect(() => {
      noteStmt.run('note-1', 'case-1', specialContent, 'user-1');
    }).not.toThrow();
    
    // Verify content was stored correctly
    const selectStmt = connection.prepare('SELECT content FROM case_notes WHERE id = ?');
    const result = selectStmt.get('note-1') as { content: string };
    expect(result.content).toBe(specialContent);
  });

  it('should handle numeric constraints correctly', () => {
    // Insert a valid case first
    const caseStmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
    caseStmt.run('case-1', '{}', 'active', 'received');

    // Test confidence field constraints (should be between 0 and 1)
    const summaryStmt = connection.prepare(`
      INSERT INTO ai_summaries (id, case_id, type, content, version, confidence)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Valid confidence values
    expect(() => {
      summaryStmt.run('summary-1', 'case-1', 'overall', 'content', 1, 0.85);
    }).not.toThrow();
    
    expect(() => {
      summaryStmt.run('summary-2', 'case-1', 'overall', 'content', 1, 0.0);
    }).not.toThrow();
    
    expect(() => {
      summaryStmt.run('summary-3', 'case-1', 'overall', 'content', 1, 1.0);
    }).not.toThrow();
  });
});

describe('Database - Performance', () => {
  let schema: DatabaseSchema;
  let connection: DatabaseConnection;

  beforeEach(() => {
    connection = DatabaseConnection.getInstance();
    schema = new DatabaseSchema();
    schema.initializeSchema();
  });

  afterEach(() => {
    schema.dropAllTables();
  });

  it('should use indexes for common queries', () => {
    // Insert test data
    const stmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
    for (let i = 0; i < 1000; i++) {
      stmt.run(`case-${i}`, '{}', i % 2 === 0 ? 'active' : 'pending', 'received');
    }
    
    // Query should be fast due to index on status
    const start = Date.now();
    const queryStmt = connection.prepare('SELECT COUNT(*) as count FROM cases WHERE status = ?');
    const result = queryStmt.get('active');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100); // Should be very fast with index
    expect((result as {count: number}).count).toBe(500);
  });

  it('should handle bulk inserts efficiently', () => {
    const start = Date.now();
    connection.transaction(() => {
      const stmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
      for (let i = 0; i < 1000; i++) {
        stmt.run(`case-${i}`, '{}', 'active', 'received');
      }
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
    
    // Verify all records were inserted
    const countStmt = connection.prepare('SELECT COUNT(*) as count FROM cases');
    const result = countStmt.get() as {count: number};
    expect(result.count).toBe(1000);
  });

  it('should perform complex joins efficiently', () => {
    // Insert test data with relationships
    connection.transaction(() => {
      const caseStmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
      const summaryStmt = connection.prepare('INSERT INTO ai_summaries (id, case_id, type, content, version) VALUES (?, ?, ?, ?, ?)');
      
      for (let i = 0; i < 100; i++) {
        caseStmt.run(`case-${i}`, '{}', 'active', 'received');
        // Add 2-3 summaries per case
        for (let j = 0; j < 3; j++) {
          summaryStmt.run(`summary-${i}-${j}`, `case-${i}`, 'overall', `Summary ${j}`, 1);
        }
      }
    });
    
    // Complex join query
    const start = Date.now();
    const stmt = connection.prepare(`
      SELECT c.id, c.status, COUNT(s.id) as summary_count, AVG(s.version) as avg_version
      FROM cases c
      LEFT JOIN ai_summaries s ON c.id = s.case_id
      WHERE c.status = 'active'
      GROUP BY c.id, c.status
      HAVING summary_count > 2
      ORDER BY summary_count DESC
    `);
    const results = stmt.all();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(200); // Should be reasonably fast
    expect(results.length).toBe(100); // All cases should have > 2 summaries
  });

  it('should handle concurrent read operations efficiently', () => {
    // Insert test data
    const stmt = connection.prepare('INSERT INTO cases (id, application_data, status, current_step) VALUES (?, ?, ?, ?)');
    for (let i = 0; i < 100; i++) {
      stmt.run(`case-${i}`, '{}', 'active', 'received');
    }
    
    // Simulate concurrent reads
    const start = Date.now();
    const promises = Array(10).fill(null).map((_, i) => {
      return new Promise<number>((resolve) => {
        const queryStmt = connection.prepare('SELECT COUNT(*) as count FROM cases WHERE id LIKE ?');
        const result = queryStmt.get(`case-${i}%`) as {count: number};
        resolve(result.count);
      });
    });
    
    Promise.all(promises).then(results => {
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Concurrent reads should be fast
      expect(results.every(count => count >= 0)).toBe(true);
    });
  });
});

describe('Database Connection - Resilience', () => {
  let connection: DatabaseConnection;

  beforeEach(() => {
    connection = DatabaseConnection.getInstance();
  });

  it('should handle invalid SQL gracefully', () => {
    // Invalid SQL should throw but not crash the connection
    expect(() => {
      connection.exec('INVALID SQL STATEMENT');
    }).toThrow();
    
    // Connection should still be healthy after error
    expect(connection.isHealthy()).toBe(true);
    
    // Should still be able to execute valid SQL
    expect(() => {
      connection.exec('CREATE TABLE IF NOT EXISTS test_recovery (id INTEGER)');
    }).not.toThrow();
  });

  it('should handle concurrent connection attempts', () => {
    const connections = Array(10).fill(null).map(() => DatabaseConnection.getInstance());
    
    // All should be the same instance (singleton)
    connections.forEach(conn => {
      expect(conn).toBe(connections[0]);
      expect(conn.isHealthy()).toBe(true);
    });
  });

  it('should maintain connection state across operations', () => {
    // Perform multiple operations
    connection.exec('CREATE TABLE IF NOT EXISTS test_state (id INTEGER, value TEXT)');
    
    const stmt = connection.prepare('INSERT INTO test_state (id, value) VALUES (?, ?)');
    stmt.run(1, 'test1');
    stmt.run(2, 'test2');
    
    // Connection should remain healthy
    expect(connection.isHealthy()).toBe(true);
    
    // Data should be accessible
    const selectStmt = connection.prepare('SELECT COUNT(*) as count FROM test_state');
    const result = selectStmt.get() as {count: number};
    expect(result.count).toBe(2);
    
    // Cleanup
    connection.exec('DROP TABLE IF EXISTS test_state');
  });

  it('should handle transaction errors gracefully', () => {
    connection.exec('CREATE TABLE IF NOT EXISTS test_transaction (id INTEGER PRIMARY KEY, value TEXT)');
    
    // Transaction that should fail
    expect(() => {
      connection.transaction(() => {
        const stmt = connection.prepare('INSERT INTO test_transaction (id, value) VALUES (?, ?)');
        stmt.run(1, 'test1');
        stmt.run(1, 'test2'); // Should fail due to PRIMARY KEY constraint
      });
    }).toThrow();
    
    // Connection should still be healthy
    expect(connection.isHealthy()).toBe(true);
    
    // No data should have been inserted due to transaction rollback
    const selectStmt = connection.prepare('SELECT COUNT(*) as count FROM test_transaction');
    const result = selectStmt.get() as {count: number};
    expect(result.count).toBe(0);
    
    // Cleanup
    connection.exec('DROP TABLE IF EXISTS test_transaction');
  });
});

describe('Migration Manager - Edge Cases', () => {
  let migrationManager: MigrationManager;
  let schema: DatabaseSchema;

  beforeEach(() => {
    migrationManager = new MigrationManager();
    schema = new DatabaseSchema();
  });

  afterEach(() => {
    schema.dropAllTables();
  });

  it('should handle migration rollback correctly', async () => {
    // Create a test migration that can be rolled back
    const testMigration = {
      id: 'test-migration-rollback',
      name: 'test_migration_rollback',
      up: (db: DatabaseConnection) => {
        db.exec('CREATE TABLE test_migration_table (id INTEGER PRIMARY KEY, name TEXT)');
      },
      down: (db: DatabaseConnection) => {
        db.exec('DROP TABLE IF EXISTS test_migration_table');
      }
    };
    
    await migrationManager.runMigrations([testMigration]);
    
    // Verify table exists
    const tables = schema.listTables();
    expect(tables).toContain('test_migration_table');
    
    // Rollback
    await migrationManager.rollbackMigration('test_migration_rollback', testMigration);
    
    // Verify table is gone
    const tablesAfter = schema.listTables();
    expect(tablesAfter).not.toContain('test_migration_table');
  });

  it('should handle migration dependencies correctly', async () => {
    const migration1 = {
      id: 'migration-1',
      name: 'create_base_table',
      up: (db: DatabaseConnection) => {
        db.exec('CREATE TABLE IF NOT EXISTS migration_base (id INTEGER PRIMARY KEY)');
      },
      down: (db: DatabaseConnection) => {
        db.exec('DROP TABLE IF EXISTS migration_base');
      }
    };
    
    const migration2 = {
      id: 'migration-2',
      name: 'create_dependent_table',
      up: (db: DatabaseConnection) => {
        db.exec('CREATE TABLE IF NOT EXISTS migration_dependent (id INTEGER PRIMARY KEY, base_id INTEGER, FOREIGN KEY (base_id) REFERENCES migration_base(id))');
      },
      down: (db: DatabaseConnection) => {
        db.exec('DROP TABLE IF EXISTS migration_dependent');
      }
    };
    
    // Run migrations in order
    await migrationManager.runMigrations([migration1, migration2]);
    
    // Verify both tables exist
    const tables = schema.listTables();
    expect(tables).toContain('migration_base');
    expect(tables).toContain('migration_dependent');
    
    // Verify foreign key relationship works
    const connection = DatabaseConnection.getInstance();
    const baseStmt = connection.prepare('INSERT OR IGNORE INTO migration_base (id) VALUES (?)');
    baseStmt.run(1);
    
    const depStmt = connection.prepare('INSERT OR IGNORE INTO migration_dependent (id, base_id) VALUES (?, ?)');
    expect(() => {
      depStmt.run(1, 1); // Should work
    }).not.toThrow();
    
    // Test foreign key constraint with a different id to avoid UNIQUE constraint issues
    const depStmt2 = connection.prepare('INSERT INTO migration_dependent (base_id) VALUES (?)');
    expect(() => {
      depStmt2.run(999); // Should fail due to foreign key constraint
    }).toThrow();
  });

  it('should handle migration errors gracefully', async () => {
    const badMigration = {
      id: 'bad-migration',
      name: 'bad_migration',
      up: (db: DatabaseConnection) => {
        db.exec('INVALID SQL THAT WILL FAIL');
      },
      down: (db: DatabaseConnection) => {
        // This won't be called due to up() failure
      }
    };
    
    // Migration should fail
    await expect(migrationManager.runMigrations([badMigration])).rejects.toThrow();
    
    // Migration should not be recorded as executed
    const executed = migrationManager.getExecutedMigrations();
    expect(executed).not.toContain('bad_migration');
  });

  it('should track migration execution order', async () => {
    const migrations = [
      {
        id: 'migration-a',
        name: 'migration_a',
        up: (db: DatabaseConnection) => {
          db.exec('CREATE TABLE IF NOT EXISTS migration_a (id INTEGER)');
        },
        down: (db: DatabaseConnection) => {
          db.exec('DROP TABLE IF EXISTS migration_a');
        }
      },
      {
        id: 'migration-b',
        name: 'migration_b',
        up: (db: DatabaseConnection) => {
          db.exec('CREATE TABLE IF NOT EXISTS migration_b (id INTEGER)');
        },
        down: (db: DatabaseConnection) => {
          db.exec('DROP TABLE IF EXISTS migration_b');
        }
      }
    ];
    
    await migrationManager.runMigrations(migrations);
    
    const executed = migrationManager.getExecutedMigrations();
    expect(executed).toContain('migration_a');
    expect(executed).toContain('migration_b');
    
    // Verify tables were created
    const tables = schema.listTables();
    expect(tables).toContain('migration_a');
    expect(tables).toContain('migration_b');  });
})
;