import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private static testInstances: Map<string, DatabaseConnection> = new Map();
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  private readonly instanceId: string;
  private isInitialized = false;

  private constructor(customPath?: string, instanceId?: string) {
    this.instanceId = instanceId || 'default';
    
    // Use custom path for testing or default path for production
    if (customPath) {
      this.dbPath = customPath;
    } else {
      // Create data directory if it doesn't exist
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.dbPath = path.join(dataDir, 'case_management.db');
    }
    
    // Ensure directory exists for custom paths (but not for in-memory databases)
    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private initialize(): void {
    if (this.isInitialized && this.db) {
      return;
    }

    // Initialize database connection
    this.db = new Database(this.dbPath);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Set WAL mode for better performance in production, but use DELETE mode for tests
    if (process.env.NODE_ENV === 'test') {
      this.db.pragma('journal_mode = DELETE');
      this.db.pragma('synchronous = OFF');
    } else {
      this.db.pragma('journal_mode = WAL');
    }
    
    this.isInitialized = true;
    console.log(`Database connected: ${this.dbPath}`);
  }

  public static getInstance(customPath?: string, instanceId?: string): DatabaseConnection {
    // If we're in test mode and have an instanceId, use test instances
    if (process.env.NODE_ENV === 'test' && instanceId) {
      if (!DatabaseConnection.testInstances.has(instanceId)) {
        const instance = new DatabaseConnection(customPath, instanceId);
        DatabaseConnection.testInstances.set(instanceId, instance);
      }
      return DatabaseConnection.testInstances.get(instanceId)!;
    }
    
    // For production or when no instanceId is provided, use singleton pattern
    if (!DatabaseConnection.instance || customPath) {
      if (DatabaseConnection.instance && customPath) {
        // Close existing connection if we need a new path
        try {
          DatabaseConnection.instance.close();
        } catch (error) {
          // Ignore close errors during test cleanup
          console.warn('Warning: Error closing database connection:', error);
        }
      }
      DatabaseConnection.instance = new DatabaseConnection(customPath, instanceId);
    }
    return DatabaseConnection.instance;
  }

  public static resetInstance(instanceId?: string): void {
    if (process.env.NODE_ENV === 'test' && instanceId) {
      // Reset specific test instance
      const instance = DatabaseConnection.testInstances.get(instanceId);
      if (instance) {
        instance.close();
        DatabaseConnection.testInstances.delete(instanceId);
      }
    } else {
      // Reset main singleton instance
      if (DatabaseConnection.instance) {
        DatabaseConnection.instance.close();
        DatabaseConnection.instance = null;
      }
    }
  }

  public static resetAllTestInstances(): void {
    for (const [instanceId, instance] of DatabaseConnection.testInstances) {
      try {
        instance.close();
      } catch (error) {
        console.warn(`Warning: Error closing test instance ${instanceId}:`, error);
      }
    }
    DatabaseConnection.testInstances.clear();
  }

  public getDatabase(): Database.Database {
    if (!this.isInitialized || !this.db) {
      this.initialize();
    }
    return this.db!;
  }

  public close(): void {
    if (this.db && this.isInitialized) {
      try {
        this.db.close();
        this.db = null;
        this.isInitialized = false;
        console.log('Database connection closed');
      } catch (error) {
        console.warn('Warning: Error closing database:', error);
      }
    }
  }

  public getDatabasePath(): string {
    return this.dbPath;
  }

  public getInstanceId(): string {
    return this.instanceId;
  }

  // Transaction helper
  public transaction<T>(fn: () => T): T {
    const database = this.getDatabase();
    const transaction = database.transaction(fn);
    return transaction();
  }

  // Prepare statement helper
  public prepare(sql: string): Database.Statement {
    const database = this.getDatabase();
    return database.prepare(sql);
  }

  // Execute SQL helper
  public exec(sql: string): void {
    const database = this.getDatabase();
    database.exec(sql);
  }

  // Health check
  public isHealthy(): boolean {
    try {
      if (!this.isInitialized || !this.db) {
        return false;
      }
      const result = this.db.prepare('SELECT 1 as health').get() as { health: number } | undefined;
      return result !== undefined && result.health === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const dbConnection = DatabaseConnection.getInstance();