import { DatabaseConnection } from './connection.js';
import { DatabaseSchema } from './schema.js';
import { MigrationManager, runInitialMigrations } from './migrations.js';
import { DatabaseSeeder } from './seeder.js';

export class DatabaseManager {
  private connection: DatabaseConnection;
  private schema: DatabaseSchema;
  private migrationManager: MigrationManager;
  private seeder: DatabaseSeeder;

  constructor() {
    this.connection = DatabaseConnection.getInstance();
    this.schema = new DatabaseSchema();
    this.migrationManager = new MigrationManager();
    this.seeder = DatabaseSeeder.createTestSeeder(); // Use minimal seeder by default
  }

  public async initialize(options: {
    runMigrations?: boolean;
    seedData?: boolean;
    seedRecordCount?: number;
    dropExisting?: boolean;
  } = {}): Promise<void> {
    const { runMigrations = true, seedData = false, seedRecordCount = 20, dropExisting = false } = options;

    console.log('Initializing database...');

    try {
      // Drop existing tables if requested
      if (dropExisting) {
        console.log('Dropping existing tables...');
        this.schema.dropAllTables();
      }

      // Initialize schema
      this.schema.initializeSchema();

      // Run migrations
      if (runMigrations) {
        await runInitialMigrations();
      }

      // Validate schema
      const isValid = this.schema.validateSchema();
      if (!isValid) {
        throw new Error('Schema validation failed');
      }

      // Seed data if requested
      if (seedData) {
        // Create a new seeder with the specified record count
        const seeder = new DatabaseSeeder(seedRecordCount);
        await seeder.seedDatabase();
      }

      // Health check
      if (!this.connection.isHealthy()) {
        throw new Error('Database health check failed');
      }

      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  public getConnection(): DatabaseConnection {
    return this.connection;
  }

  public getSchema(): DatabaseSchema {
    return this.schema;
  }

  public getMigrationManager(): MigrationManager {
    return this.migrationManager;
  }

  public getSeeder(): DatabaseSeeder {
    return this.seeder;
  }

  public async reset(): Promise<void> {
    console.log('Resetting database...');
    await this.initialize({ dropExisting: true, seedData: true, seedRecordCount: 20 });
  }

  public close(): void {
    this.connection.close();
  }

  public getStatus(): {
    isHealthy: boolean;
    tables: string[];
    recordCounts: Record<string, number>;
    databasePath: string;
  } {
    return {
      isHealthy: this.connection.isHealthy(),
      tables: this.schema.listTables(),
      recordCounts: this.seeder.getRecordCounts(),
      databasePath: this.connection.getDatabasePath()
    };
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();

// Export all components
export { DatabaseConnection, dbConnection } from './connection.js';
export { DatabaseSchema } from './schema.js';
export { MigrationManager, runInitialMigrations } from './migrations.js';
export { DatabaseSeeder } from './seeder.js';
export * from '../types/database.js';