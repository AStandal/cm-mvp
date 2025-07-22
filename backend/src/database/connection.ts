import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database.Database;
  private readonly dbPath: string;

  private constructor() {
    // Create data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Set database path
    this.dbPath = path.join(dataDir, 'case_management.db');
    
    // Initialize database connection
    this.db = new Database(this.dbPath);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Set WAL mode for better performance
    this.db.pragma('journal_mode = WAL');
    
    console.log(`Database connected: ${this.dbPath}`);
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getDatabase(): Database.Database {
    return this.db;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      console.log('Database connection closed');
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