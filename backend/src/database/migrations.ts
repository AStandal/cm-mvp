import { DatabaseConnection } from './connection.js';
import { v4 as uuidv4 } from 'uuid';

export interface Migration {
  id: string;
  name: string;
  up: (db: DatabaseConnection) => void;
  down: (db: DatabaseConnection) => void;
}

export class MigrationManager {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
    this.initializeMigrationsTable();
  }

  private initializeMigrationsTable(): void {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    this.db.exec(sql);
  }

  public async runMigrations(migrations: Migration[]): Promise<void> {
    console.log('Running database migrations...');

    for (const migration of migrations) {
      if (!this.isMigrationExecuted(migration.name)) {
        console.log(`Running migration: ${migration.name}`);
        
        try {
          this.db.transaction(() => {
            migration.up(this.db);
            this.recordMigration(migration);
          });
          
          console.log(`Migration completed: ${migration.name}`);
        } catch (error) {
          console.error(`Migration failed: ${migration.name}`, error);
          throw error;
        }
      } else {
        console.log(`Migration already executed: ${migration.name}`);
      }
    }

    console.log('All migrations completed');
  }

  public async rollbackMigration(migrationName: string, migration: Migration): Promise<void> {
    console.log(`Rolling back migration: ${migrationName}`);

    if (!this.isMigrationExecuted(migrationName)) {
      console.log(`Migration not executed, nothing to rollback: ${migrationName}`);
      return;
    }

    try {
      this.db.transaction(() => {
        migration.down(this.db);
        this.removeMigrationRecord(migrationName);
      });
      
      console.log(`Migration rolled back: ${migrationName}`);
    } catch (error) {
      console.error(`Migration rollback failed: ${migrationName}`, error);
      throw error;
    }
  }

  private isMigrationExecuted(name: string): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM migrations WHERE name = ?');
    const result = stmt.get(name) as { count: number };
    return result.count > 0;
  }

  private recordMigration(migration: Migration): void {
    const stmt = this.db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)');
    stmt.run(migration.id, migration.name);
  }

  private removeMigrationRecord(name: string): void {
    const stmt = this.db.prepare('DELETE FROM migrations WHERE name = ?');
    stmt.run(name);
  }

  public getExecutedMigrations(): string[] {
    const stmt = this.db.prepare('SELECT name FROM migrations ORDER BY executed_at');
    const results = stmt.all() as { name: string }[];
    return results.map(r => r.name);
  }

  public getPendingMigrations(allMigrations: Migration[]): Migration[] {
    const executed = this.getExecutedMigrations();
    return allMigrations.filter(m => !executed.includes(m.name));
  }
}

// Define initial migrations
export const initialMigrations: Migration[] = [
  {
    id: uuidv4(),
    name: '001_create_initial_schema',
    up: (_db: DatabaseConnection) => {
      // This migration is handled by the schema initialization
      // We just record it as executed
      console.log('Initial schema migration - handled by schema.ts');
    },
    down: (db: DatabaseConnection) => {
      // Drop all tables
      const tables = ['ai_interactions', 'audit_trail', 'case_notes', 'ai_summaries', 'cases'];
      tables.forEach(table => {
        db.exec(`DROP TABLE IF EXISTS ${table};`);
      });
    }
  }
];

// Migration runner utility
export async function runInitialMigrations(): Promise<void> {
  const migrationManager = new MigrationManager();
  await migrationManager.runMigrations(initialMigrations);
}