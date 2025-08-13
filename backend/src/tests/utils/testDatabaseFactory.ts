import path from 'path';
import fs from 'fs';
import { DatabaseConnection } from '../../database/connection.js';
import { DatabaseManager } from '../../database/index.js';

export type TestDatabaseType = 'memory' | 'file';

export interface TestDatabaseConfig {
  type: TestDatabaseType;
  testSuiteName?: string;
  migrations?: boolean;
  seedData?: boolean;
}

/**
 * Factory for creating test databases with different strategies
 * - Unit tests: In-memory databases for speed and isolation
 * - Integration tests: File-based databases for realistic behavior
 */
export class TestDatabaseFactory {
  private static instances: Map<string, DatabaseConnection> = new Map();
  private static managers: Map<string, DatabaseManager> = new Map();

  /**
   * Create a test database based on configuration
   */
  static async createDatabase(config: TestDatabaseConfig): Promise<{
    connection: DatabaseConnection;
    manager: DatabaseManager;
    cleanup: () => Promise<void>;
  }> {
    const instanceKey = config.testSuiteName || `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    let dbPath: string;
    let connection: DatabaseConnection;
    let manager: DatabaseManager;

    if (config.type === 'memory') {
      // In-memory database for unit tests
      dbPath = ':memory:';
      connection = DatabaseConnection.getInstance(dbPath, instanceKey);
    } else {
      // File-based database for integration tests
      const testId = `${instanceKey}_${Date.now()}`;
      dbPath = path.join(process.cwd(), 'test_data', `${testId}.db`);
      
      // Ensure test directory exists
      const testDir = path.dirname(dbPath);
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      
      connection = DatabaseConnection.getInstance(dbPath, instanceKey);
    }

    // Initialize database manager
    manager = new DatabaseManager();
    
    if (config.migrations !== false) {
      await manager.initialize({ 
        dropExisting: true, 
        seedData: config.seedData || false 
      });
    }

    // Store instances for cleanup
    this.instances.set(instanceKey, connection);
    this.managers.set(instanceKey, manager);

    const cleanup = async () => {
      await this.cleanup(instanceKey, dbPath);
    };

    return { connection, manager, cleanup };
  }

  /**
   * Create an in-memory database for unit tests
   */
  static async createMemoryDatabase(testSuiteName?: string): Promise<{
    connection: DatabaseConnection;
    manager: DatabaseManager;
    cleanup: () => Promise<void>;
  }> {
    return this.createDatabase({
      type: 'memory',
      ...(testSuiteName && { testSuiteName }),
      migrations: true,
      seedData: false
    });
  }

  /**
   * Create a file-based database for integration tests
   */
  static async createFileDatabase(testSuiteName?: string): Promise<{
    connection: DatabaseConnection;
    manager: DatabaseManager;
    cleanup: () => Promise<void>;
  }> {
    return this.createDatabase({
      type: 'file',
      ...(testSuiteName && { testSuiteName }),
      migrations: true,
      seedData: false
    });
  }

  /**
   * Cleanup database instance
   */
  private static async cleanup(instanceKey: string, dbPath: string): Promise<void> {
    const connection = this.instances.get(instanceKey);
    const manager = this.managers.get(instanceKey);

    if (manager) {
      manager.close();
      this.managers.delete(instanceKey);
    }

    if (connection) {
      const connectionInstanceId = connection.getInstanceId();
      connection.close();
      this.instances.delete(instanceKey);
      
      // Reset the specific test instance
      DatabaseConnection.resetInstance(connectionInstanceId);
    }

    // Remove file-based test database
    if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
      } catch (error) {
        console.warn(`Warning: Could not remove test database file ${dbPath}:`, error);
      }
    }
  }

  /**
   * Cleanup all test databases
   */
  static async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.instances.keys()).map(async (key) => {
      const connection = this.instances.get(key);
      const dbPath = connection?.getDatabasePath() || '';
      await this.cleanup(key, dbPath);
    });

    await Promise.all(cleanupPromises);
    
    // Also cleanup any remaining test instances
    DatabaseConnection.resetAllTestInstances();
  }
}

/**
 * Vitest hooks for unit tests (in-memory database)
 */
export function setupUnitTestDatabase(testSuiteName?: string) {
  let cleanup: (() => Promise<void>) | null = null;
  let manager: DatabaseManager | null = null;

  return {
    beforeAll: async () => {
      const { manager: dbManager, cleanup: cleanupFn } = await TestDatabaseFactory.createMemoryDatabase(testSuiteName);
      manager = dbManager;
      cleanup = cleanupFn;
    },
    afterAll: async () => {
      if (cleanup) {
        await cleanup();
      }
    },
    beforeEach: async () => {
      // For unit tests, reset the database for each test to ensure isolation
      if (manager) {
        await manager.initialize({ dropExisting: true, seedData: false });
      }
    }
  };
}

/**
 * Vitest hooks for integration tests (file-based database)
 */
export function setupIntegrationTestDatabase(testSuiteName?: string) {
  let cleanup: (() => Promise<void>) | null = null;

  return {
    beforeAll: async () => {
      const { cleanup: cleanupFn } = await TestDatabaseFactory.createFileDatabase(testSuiteName);
      cleanup = cleanupFn;
    },
    afterAll: async () => {
      if (cleanup) {
        await cleanup();
      }
    },
    beforeEach: async () => {
      // For integration tests, we might want to clear data between tests
      // but keep the same database file
    }
  };
}

/**
 * Vitest hooks for API tests (file-based database with test data)
 */
export function setupAPITestDatabase(testSuiteName?: string) {
  let cleanup: (() => Promise<void>) | null = null;
  let manager: DatabaseManager | null = null;

  return {
    beforeAll: async () => {
      const { manager: dbManager, cleanup: cleanupFn } = await TestDatabaseFactory.createFileDatabase(testSuiteName);
      manager = dbManager;
      cleanup = cleanupFn;
    },
    afterAll: async () => {
      if (cleanup) {
        await cleanup();
      }
    },
    beforeEach: async () => {
      // For API tests, reset the database for each test to ensure clean state
      if (manager) {
        await manager.initialize({ dropExisting: true, seedData: false });
      }
    },
    getManager: () => manager
  };
}

/**
 * Helper to determine test type based on file path or test name
 */
export function getTestType(testFilePath: string): TestDatabaseType {
  const fileName = path.basename(testFilePath);
  
  // Unit tests: Service classes, utilities, pure logic
  if (fileName.includes('Service.test') || 
      fileName.includes('Client.test') || 
      fileName.includes('Template.test') ||
      fileName.includes('types.test')) {
    return 'memory';
  }
  
  // Integration tests: API tests, database tests, full workflow tests
  if (fileName.includes('api.test') || 
      fileName.includes('database.test') || 
      fileName.includes('integration.test')) {
    return 'file';
  }
  
  // Default to memory for faster execution
  return 'memory';
}