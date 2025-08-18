import { DatabaseConnection } from './connection.js';

export class DatabaseSchema {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    public initializeSchema(): void {
        console.log('Initializing database schema...');

        try {
            // Use a transaction to ensure atomicity for table creation
            this.db.transaction(() => {
                // Create tables in order (respecting foreign key dependencies)
                this.createCasesTable();
                this.createAISummariesTable();
                this.createCaseNotesTable();
                this.createAuditTrailTable();
                this.createAIInteractionsTable();
                this.createEvaluationDatasetsTable();
                this.createEvaluationExamplesTable();
                this.createJudgeEvaluationsTable();
                this.createZoningPlansTable();
                this.createZoningRequirementsTable();

                // Create indexes within the same transaction to ensure tables exist
                this.createIndexesInTransaction();
            });

            // Verify all tables were created
            const tables = this.listTables();
            const requiredTables = ['cases', 'ai_summaries', 'case_notes', 'audit_trail', 'ai_interactions', 'evaluation_datasets', 'evaluation_examples', 'judge_evaluations', 'zoning_plans', 'zoning_requirements'];
            const missingTables = requiredTables.filter(table => !tables.includes(table));

            if (missingTables.length > 0) {
                throw new Error(`Failed to create tables: ${missingTables.join(', ')}`);
            }

            console.log('Database schema initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database schema:', error);
            throw error;
        }
    }

    private createCasesTable(): void {
        const sql = `
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        application_data TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'pending', 'approved', 'denied', 'withdrawn', 'archived')),
        current_step TEXT NOT NULL CHECK (current_step IN ('received', 'in_review', 'additional_info_required', 'ready_for_decision', 'concluded')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        assigned_to TEXT
      );
    `;
        this.db.exec(sql);
        console.log('Created cases table');
    }

    private createAISummariesTable(): void {
        const sql = `
      CREATE TABLE IF NOT EXISTS ai_summaries (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('overall', 'step-specific')),
        step TEXT CHECK (step IN ('received', 'in_review', 'additional_info_required', 'ready_for_decision', 'concluded')),
        content TEXT NOT NULL,
        recommendations TEXT,
        confidence REAL,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
    `;
        this.db.exec(sql);
        console.log('Created ai_summaries table');
    }

    private createCaseNotesTable(): void {
        const sql = `
      CREATE TABLE IF NOT EXISTS case_notes (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
    `;
        this.db.exec(sql);
        console.log('Created case_notes table');
    }

    private createAuditTrailTable(): void {
        const sql = `
      CREATE TABLE IF NOT EXISTS audit_trail (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        user_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
    `;
        this.db.exec(sql);
        console.log('Created audit_trail table');
    }

    private createAIInteractionsTable(): void {
        const sql = `
      CREATE TABLE IF NOT EXISTS ai_interactions (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('generate_summary', 'generate_recommendation', 'analyze_application', 'generate_final_summary', 'validate_completeness', 'detect_missing_fields', 'extract_zoning_requirements', 'batch_process_zoning')),
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        model TEXT NOT NULL,
        tokens_used INTEGER,
        cost REAL,
        duration INTEGER NOT NULL,
        success BOOLEAN NOT NULL,
        error TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        step_context TEXT,
        prompt_template TEXT,
        prompt_version TEXT,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
    `;
        this.db.exec(sql);
        console.log('Created ai_interactions table');
    }

    private createEvaluationDatasetsTable(): void {
        const sql = `
      CREATE TABLE IF NOT EXISTS evaluation_datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        operation TEXT NOT NULL,
        metadata TEXT NOT NULL,
        statistics TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
        this.db.exec(sql);
        console.log('Created evaluation_datasets table');
    }

    private createEvaluationExamplesTable(): void {
        const sql = `
      CREATE TABLE IF NOT EXISTS evaluation_examples (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL,
        input_data TEXT NOT NULL,
        expected_output TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dataset_id) REFERENCES evaluation_datasets(id) ON DELETE CASCADE
      );
    `;
        this.db.exec(sql);
        console.log('Created evaluation_examples table');
    }

    private createJudgeEvaluationsTable(): void {
        const sql = `
      CREATE TABLE IF NOT EXISTS judge_evaluations (
        id TEXT PRIMARY KEY,
        interaction_id TEXT NOT NULL,
        evaluation_model TEXT NOT NULL,
        scores TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (interaction_id) REFERENCES ai_interactions(id) ON DELETE CASCADE
      );
    `;
        this.db.exec(sql);
        console.log('Created judge_evaluations table');
    }

    private createZoningPlansTable(): void {
        const sql = `
      CREATE TABLE IF NOT EXISTS zoning_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        document_path TEXT NOT NULL,
        document_hash TEXT NOT NULL UNIQUE,
        jurisdiction TEXT NOT NULL,
        effective_date DATETIME NOT NULL,
        version TEXT NOT NULL,
        extraction_metadata TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
        this.db.exec(sql);
        console.log('Created zoning_plans table');
    }

    private createZoningRequirementsTable(): void {
        const sql = `
      CREATE TABLE IF NOT EXISTS zoning_requirements (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT,
        requirement TEXT NOT NULL,
        description TEXT NOT NULL,
        criteria TEXT NOT NULL,
        reference_docs TEXT NOT NULL,
        priority TEXT NOT NULL CHECK (priority IN ('required', 'recommended', 'optional')),
        applicable_zones TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES zoning_plans(id) ON DELETE CASCADE
      );
    `;
        this.db.exec(sql);
        console.log('Created zoning_requirements table');
    }

    private createIndexesInTransaction(): void {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);',
            'CREATE INDEX IF NOT EXISTS idx_cases_current_step ON cases(current_step);',
            'CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);',
            'CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);',
            'CREATE INDEX IF NOT EXISTS idx_ai_summaries_case_id ON ai_summaries(case_id);',
            'CREATE INDEX IF NOT EXISTS idx_ai_summaries_type ON ai_summaries(type);',
            'CREATE INDEX IF NOT EXISTS idx_ai_summaries_step ON ai_summaries(step);',
            'CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);',
            'CREATE INDEX IF NOT EXISTS idx_case_notes_created_at ON case_notes(created_at);',
            'CREATE INDEX IF NOT EXISTS idx_audit_trail_case_id ON audit_trail(case_id);',
            'CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp);',
            'CREATE INDEX IF NOT EXISTS idx_ai_interactions_case_id ON ai_interactions(case_id);',
            'CREATE INDEX IF NOT EXISTS idx_ai_interactions_operation ON ai_interactions(operation);',
            'CREATE INDEX IF NOT EXISTS idx_ai_interactions_timestamp ON ai_interactions(timestamp);',
            'CREATE INDEX IF NOT EXISTS idx_evaluation_datasets_operation ON evaluation_datasets(operation);',
            'CREATE INDEX IF NOT EXISTS idx_evaluation_datasets_created_at ON evaluation_datasets(created_at);',
            'CREATE INDEX IF NOT EXISTS idx_evaluation_examples_dataset_id ON evaluation_examples(dataset_id);',
            'CREATE INDEX IF NOT EXISTS idx_judge_evaluations_interaction_id ON judge_evaluations(interaction_id);',
            'CREATE INDEX IF NOT EXISTS idx_judge_evaluations_evaluation_model ON judge_evaluations(evaluation_model);',
            'CREATE INDEX IF NOT EXISTS idx_judge_evaluations_created_at ON judge_evaluations(created_at);',
            'CREATE INDEX IF NOT EXISTS idx_zoning_plans_jurisdiction ON zoning_plans(jurisdiction);',
            'CREATE INDEX IF NOT EXISTS idx_zoning_plans_effective_date ON zoning_plans(effective_date);',
            'CREATE INDEX IF NOT EXISTS idx_zoning_plans_document_hash ON zoning_plans(document_hash);',
            'CREATE INDEX IF NOT EXISTS idx_zoning_requirements_plan_id ON zoning_requirements(plan_id);',
            'CREATE INDEX IF NOT EXISTS idx_zoning_requirements_category ON zoning_requirements(category);',
            'CREATE INDEX IF NOT EXISTS idx_zoning_requirements_priority ON zoning_requirements(priority);'
        ];

        indexes.forEach(indexSql => {
            try {
                this.db.exec(indexSql);
            } catch (error) {
                console.error(`Failed to create index: ${indexSql}`, error);
                // Don't throw on index creation failure - log and continue
                console.warn('Continuing without this index...');
            }
        });

        console.log('Created database indexes');
    }



    public dropAllTables(): void {
        console.log('Dropping all tables...');

        try {
            // Use a transaction to ensure atomicity
            this.db.transaction(() => {
                const tables = ['judge_evaluations', 'evaluation_examples', 'evaluation_datasets', 'zoning_requirements', 'zoning_plans', 'ai_interactions', 'audit_trail', 'case_notes', 'ai_summaries', 'cases'];
                tables.forEach(table => {
                    this.db.exec(`DROP TABLE IF EXISTS ${table};`);
                });
            });

            console.log('All tables dropped');
        } catch (error) {
            console.error('Failed to drop tables:', error);
            throw error;
        }
    }

    public getTableInfo(tableName: string): Array<{ cid: number; name: string; type: string; notnull: number; dflt_value: string | null; pk: number }> {
        const stmt = this.db.prepare(`PRAGMA table_info(${tableName})`);
        return stmt.all() as Array<{ cid: number; name: string; type: string; notnull: number; dflt_value: string | null; pk: number }>;
    }

    public listTables(): string[] {
        const stmt = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
        const tables = stmt.all() as { name: string }[];
        return tables.map(t => t.name);
    }

    public validateSchema(): boolean {
        try {
            const expectedTables = ['cases', 'ai_summaries', 'case_notes', 'audit_trail', 'ai_interactions', 'evaluation_datasets', 'evaluation_examples', 'judge_evaluations', 'zoning_plans', 'zoning_requirements'];
            const actualTables = this.listTables();

            // Check if all expected tables exist
            const missingTables = expectedTables.filter(table => !actualTables.includes(table));
            if (missingTables.length > 0) {
                console.error('Missing tables:', missingTables);
                return false;
            }

            // Validate each table structure
            for (const table of expectedTables) {
                try {
                    const tableInfo = this.getTableInfo(table);
                    if (tableInfo.length === 0) {
                        console.error(`Table ${table} has no columns`);
                        return false;
                    }
                } catch (error) {
                    console.error(`Failed to get table info for ${table}:`, error);
                    return false;
                }
            }

            console.log('Schema validation passed');
            return true;
        } catch (error) {
            console.error('Schema validation failed:', error);
            return false;
        }
    }
}   