import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database.Database;
  private readonly dbPath: string;

  private constructor(customPath?: string) {
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
    
    // Ensure directory exists for custom paths
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
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
    
    console.log(`Database connected: ${this.dbPath}`);
  }

  public static getInstance(customPath?: string): DatabaseConnection {
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
      DatabaseConnection.instance = new DatabaseConnection(customPath);
    }
    return DatabaseConnection.instance;
  }

  public static resetInstance(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.close();
      DatabaseConnection.instance = null as any;
    }
  }

  public getDatabase(): Database.Database {
    return this.db;
  }

  public close(): void {
    if (this.db) {
      try {
        this.db.close();
        console.log('Database connection closed');
      } catch (error) {
        console.warn('Warning: Error closing database:', error);
      }
    }
  }

  public getDatabasePath(): string {
    return this.dbPath;
  }

  // Transaction helper
  public transaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  // Prepare statement helper
  public prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  // Execute SQL helper
  public exec(sql: string): void {
    this.db.exec(sql);
  }

  // Health check
  public isHealthy(): boolean {
    try {
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