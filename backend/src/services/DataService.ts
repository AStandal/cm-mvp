import { DatabaseConnection } from '../database/connection.js';
import {
    Case,
    AISummary,
    CaseNote,
    AuditEntry,
    AIInteraction,
    CaseStatus,
    ProcessStep
} from '../types/database.js';
import {
    Case as CaseModel,
    AISummary as AISummaryModel,
    ActivityLog,
    AIInteraction as AIInteractionModel
} from '../types/index.js';
import { randomUUID } from 'crypto';

export class DataService {
    private db: DatabaseConnection;

    constructor() {
        this.db = DatabaseConnection.getInstance();
    }

    private getDatabase(): DatabaseConnection {
        return this.db;
    }

    /**
     * Save a case to the database
     */
    public async saveCase(caseData: CaseModel): Promise<void> {
        try {
            const stmt = this.getDatabase().prepare(`
        INSERT OR REPLACE INTO cases (
          id, application_data, status, current_step, 
          created_at, updated_at, assigned_to
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

            const createdAtISO = caseData.createdAt.toISOString();
            const updatedAtISO = caseData.updatedAt.toISOString();

            const result = stmt.run(
                caseData.id,
                JSON.stringify(caseData.applicationData),
                caseData.status,
                caseData.currentStep,
                createdAtISO,
                updatedAtISO,
                caseData.assignedTo || null
            );

            if (result.changes === 0) {
                throw new Error(`Failed to save case with ID: ${caseData.id}`);
            }

            // Save case notes if they exist
            if (caseData.notes && caseData.notes.length > 0) {
                this.saveCaseNotes(caseData.id, caseData.notes);
            }

            // Save AI summaries if they exist
            if (caseData.aiSummaries && caseData.aiSummaries.length > 0) {
                for (const summary of caseData.aiSummaries) {
                    await this.saveSummary(summary);
                }
            }

            // Save audit trail if it exists
            if (caseData.auditTrail && caseData.auditTrail.length > 0) {
                for (const entry of caseData.auditTrail) {
                    const auditEntry: AuditEntry = {
                        id: entry.id,
                        case_id: entry.caseId,
                        action: entry.action,
                        ...(entry.details && { details: JSON.stringify(entry.details) }),
                        user_id: entry.userId,
                        timestamp: entry.timestamp.toISOString()
                    };
                    this.saveAuditEntry(auditEntry);
                }
            }

        } catch (error) {
            throw new Error(`Failed to save case: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a case by ID with all related data
     */
    public async getCase(caseId: string): Promise<CaseModel | null> {
        try {
            const stmt = this.getDatabase().prepare(`
        SELECT * FROM cases WHERE id = ?
      `);

            const caseRow = stmt.get(caseId) as Case | undefined;

            if (!caseRow) {
                return null;
            }

            // Get related data
            const [notes, aiSummaries, auditTrail] = await Promise.all([
                this.getCaseNotes(caseId),
                this.getCaseSummaries(caseId),
                this.getAuditTrail(caseId)
            ]);

            return this.mapDatabaseCaseToModel(caseRow, notes, aiSummaries, auditTrail);
        } catch (error) {
            throw new Error(`Failed to get case: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update a case with new data
     */
    public async updateCase(caseId: string, updates: Partial<CaseModel>): Promise<void> {
        try {
            const updateFields: string[] = [];
            const updateValues: any[] = [];

            if (updates.applicationData !== undefined) {
                updateFields.push('application_data = ?');
                updateValues.push(JSON.stringify(updates.applicationData));
            }

            if (updates.status !== undefined) {
                updateFields.push('status = ?');
                updateValues.push(updates.status);
            }

            if (updates.currentStep !== undefined) {
                updateFields.push('current_step = ?');
                updateValues.push(updates.currentStep);
            }

            if (updates.assignedTo !== undefined) {
                updateFields.push('assigned_to = ?');
                updateValues.push(updates.assignedTo);
            }

            // Always update the updated_at timestamp (strictly monotonic)
            const currentRow = this.db.prepare(`SELECT updated_at FROM cases WHERE id = ?`).get(caseId) as { updated_at: string } | undefined;
            const prevMs = currentRow ? new Date(currentRow.updated_at).getTime() : 0;
            const nowMs = Date.now();
            const nextMs = Math.max(nowMs, prevMs + 1);
            const nextIso = new Date(nextMs).toISOString();

            updateFields.push('updated_at = ?');
            updateValues.push(nextIso);

            if (updateFields.length === 1) { // Only updated_at was added
                throw new Error('No valid fields to update');
            }

            updateValues.push(caseId); // For WHERE clause

            const stmt = this.db.prepare(`
        UPDATE cases 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `);

            const result = stmt.run(...updateValues);

            if (result.changes === 0) {
                throw new Error(`Case with ID ${caseId} not found`);
            }
        } catch (error) {
            throw new Error(`Failed to update case: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get all cases with a specific status
     */
    public async getCasesByStatus(status: CaseStatus): Promise<CaseModel[]> {
        try {
            const stmt = this.getDatabase().prepare(`
        SELECT * FROM cases WHERE status = ? ORDER BY created_at DESC
      `);

            const caseRows = stmt.all(status) as Case[];
            const cases: CaseModel[] = [];

            for (const caseRow of caseRows) {
                const [notes, aiSummaries, auditTrail] = await Promise.all([
                    this.getCaseNotes(caseRow.id),
                    this.getCaseSummaries(caseRow.id),
                    this.getAuditTrail(caseRow.id)
                ]);

                cases.push(this.mapDatabaseCaseToModel(caseRow, notes, aiSummaries, auditTrail));
            }

            return cases;
        } catch (error) {
            throw new Error(`Failed to get cases by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get case counts for sorting (documents and notes)
     */
    public async getCaseCounts(caseIds: string[]): Promise<Map<string, { documentCount: number; noteCount: number }>> {
        try {
            if (caseIds.length === 0) {
                return new Map();
            }
            
            const counts = new Map<string, { documentCount: number; noteCount: number }>();
            
            // Get document counts from JSON data in cases table
            const docStmt = this.getDatabase().prepare(`
                SELECT id, json_array_length(json_extract(application_data, '$.documents')) as document_count
                FROM cases 
                WHERE id IN (${caseIds.map(() => '?').join(',')})
            `);
            const docCounts = docStmt.all(...caseIds) as Array<{ id: string; document_count: number }>;
            
            // Get note counts
            const noteStmt = this.getDatabase().prepare(`
                SELECT case_id, COUNT(*) as count 
                FROM case_notes 
                WHERE case_id IN (${caseIds.map(() => '?').join(',')})
                GROUP BY case_id
            `);
            const noteCounts = noteStmt.all(...caseIds) as Array<{ case_id: string; count: number }>;
            
            // Initialize all cases with 0 counts
            for (const caseId of caseIds) {
                counts.set(caseId, { documentCount: 0, noteCount: 0 });
            }
            
            // Set actual counts
            for (const docCount of docCounts) {
                const current = counts.get(docCount.id);
                if (current) {
                    current.documentCount = docCount.document_count || 0;
                }
            }
            
            for (const noteCount of noteCounts) {
                const current = counts.get(noteCount.case_id);
                if (current) {
                    current.noteCount = noteCount.count;
                }
            }
            
            return counts;
        } catch (error) {
            throw new Error(`Failed to get case counts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get all cases with filtering, sorting, and pagination
     */
    public async getAllCases(params?: {
        status?: string;
        search?: string;
        sortField?: string;
        sortDirection?: 'asc' | 'desc';
        page?: number;
        limit?: number;
    }): Promise<{ cases: CaseModel[]; total: number; page: number; limit: number }> {
        try {
            const { status, search, sortField = 'created_at', sortDirection = 'desc', page = 1, limit = 10 } = params || {};
            
            // Build the base query
            let sql = 'SELECT * FROM cases';
            const whereConditions: string[] = [];
            const queryParams: any[] = [];
            
            // Add status filter
            if (status) {
                whereConditions.push('status = ?');
                queryParams.push(status);
            }
            
            // Add search filter
            if (search) {
                whereConditions.push(`(
                    id LIKE ? OR 
                    json_extract(application_data, '$.applicantName') LIKE ? OR 
                    json_extract(application_data, '$.applicationType') LIKE ?
                )`);
                const searchPattern = `%${search}%`;
                queryParams.push(searchPattern, searchPattern, searchPattern);
            }
            
            // Add WHERE clause if there are conditions
            if (whereConditions.length > 0) {
                sql += ' WHERE ' + whereConditions.join(' AND ');
            }
            
            // Get total count for pagination
            const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
            const countStmt = this.getDatabase().prepare(countSql);
            const totalResult = countStmt.get(...queryParams) as { count: number };
            const total = totalResult.count;
            
            // Add sorting
            const validSortFields = [
                'id', 'status', 'current_step', 'created_at', 'updated_at',
                'applicant_name', 'application_type', 'submission_date'
            ];
            
            let actualSortField = sortField;
            if (sortField === 'applicantName') {
                actualSortField = 'json_extract(application_data, \'$.applicantName\')';
            } else if (sortField === 'applicationType') {
                actualSortField = 'json_extract(application_data, \'$.applicationType\')';
            } else if (sortField === 'submissionDate') {
                actualSortField = 'json_extract(application_data, \'$.submissionDate\')';
            } else if (!validSortFields.includes(sortField)) {
                actualSortField = 'created_at'; // Default fallback
            }
            
            // Handle special sorting for counts
            if (sortField === 'documentCount' || sortField === 'noteCount') {
                // For count-based sorting, we need to get all cases first, then sort by counts
                const allCasesSql = sql.replace('SELECT *', 'SELECT id');
                const allCasesStmt = this.getDatabase().prepare(allCasesSql);
                const allCaseIds = allCasesStmt.all(...queryParams) as Array<{ id: string }>;
                
                if (allCaseIds.length === 0) {
                    return { cases: [], total: 0, page, limit };
                }
                
                // Get counts for all cases
                const caseIds = allCaseIds.map(row => row.id);
                const counts = await this.getCaseCounts(caseIds);
                
                // Sort by counts
                const sortedCaseIds = caseIds.sort((a, b) => {
                    const aCount = sortField === 'documentCount' ? counts.get(a)?.documentCount || 0 : counts.get(a)?.noteCount || 0;
                    const bCount = sortField === 'documentCount' ? counts.get(b)?.documentCount || 0 : counts.get(b)?.noteCount || 0;
                    
                    if (sortDirection === 'asc') {
                        return aCount - bCount;
                    } else {
                        return bCount - aCount;
                    }
                });
                
                // Apply pagination to sorted IDs
                const startIndex = (page - 1) * limit;
                const endIndex = startIndex + limit;
                const paginatedCaseIds = sortedCaseIds.slice(startIndex, endIndex);
                
                // Get the actual case data for paginated IDs
                const cases: CaseModel[] = [];
                for (const caseId of paginatedCaseIds) {
                    const caseRow = this.getDatabase().prepare('SELECT * FROM cases WHERE id = ?').get(caseId) as Case;
                    if (caseRow) {
                        const [notes, aiSummaries, auditTrail] = await Promise.all([
                            this.getCaseNotes(caseRow.id),
                            this.getCaseSummaries(caseRow.id),
                            this.getAuditTrail(caseRow.id)
                        ]);
                        cases.push(this.mapDatabaseCaseToModel(caseRow, notes, aiSummaries, auditTrail));
                    }
                }
                
                return {
                    cases,
                    total: caseIds.length,
                    page,
                    limit
                };
            }
            
            sql += ` ORDER BY ${actualSortField} ${sortDirection.toUpperCase()}`;
            
            // Add pagination
            const offset = (page - 1) * limit;
            sql += ' LIMIT ? OFFSET ?';
            queryParams.push(limit, offset);
            
            // Execute the main query
            const stmt = this.getDatabase().prepare(sql);
            const caseRows = stmt.all(...queryParams) as Case[];
            
            // Build case models with related data
            const cases: CaseModel[] = [];
            for (const caseRow of caseRows) {
                const [notes, aiSummaries, auditTrail] = await Promise.all([
                    this.getCaseNotes(caseRow.id),
                    this.getCaseSummaries(caseRow.id),
                    this.getAuditTrail(caseRow.id)
                ]);

                cases.push(this.mapDatabaseCaseToModel(caseRow, notes, aiSummaries, auditTrail));
            }
            
            return {
                cases,
                total,
                page,
                limit
            };
        } catch (error) {
            throw new Error(`Failed to get all cases: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Save an AI summary
     */
    public async saveSummary(summary: AISummaryModel): Promise<void> {
        try {
            const stmt = this.getDatabase().prepare(`
        INSERT OR REPLACE INTO ai_summaries (
          id, case_id, type, step, content, recommendations, version, confidence, generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            const result = stmt.run(
                summary.id,
                summary.caseId,
                summary.type,
                summary.step || null,
                summary.content,
                JSON.stringify(summary.recommendations || []),
                summary.version,
                summary.confidence || 0.8,
                summary.generatedAt.toISOString()
            );

            if (result.changes === 0) {
                throw new Error(`Failed to save AI summary with ID: ${summary.id}`);
            }
        } catch (error) {
            throw new Error(`Failed to save AI summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get AI summaries for a case
     */
    public async getSummaries(caseId: string, type?: 'overall' | 'step-specific'): Promise<AISummaryModel[]> {
        try {
            let sql = 'SELECT * FROM ai_summaries WHERE case_id = ?';
            const params: any[] = [caseId];

            if (type) {
                sql += ' AND type = ?';
                params.push(type);
            }

            sql += ' ORDER BY generated_at DESC';

            const stmt = this.getDatabase().prepare(sql);
            const summaryRows = stmt.all(...params) as AISummary[];

            return summaryRows.map(summary => this.mapDatabaseSummaryToModel(summary));
        } catch (error) {
            throw new Error(`Failed to get AI summaries: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Log an activity
     */
    public async logActivity(activity: ActivityLog): Promise<void> {
        try {
            const stmt = this.getDatabase().prepare(`
        INSERT INTO audit_trail (
          id, case_id, action, details, user_id, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

            const result = stmt.run(
                activity.id,
                activity.caseId,
                activity.action,
                activity.details ? JSON.stringify(activity.details) : null,
                activity.userId,
                activity.timestamp.toISOString()
            );

            if (result.changes === 0) {
                throw new Error(`Failed to log activity with ID: ${activity.id}`);
            }
        } catch (error) {
            throw new Error(`Failed to log activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Log an AI interaction
     */
    public async logAIInteraction(interaction: AIInteractionModel): Promise<void> {
        try {
            const stmt = this.getDatabase().prepare(`
        INSERT INTO ai_interactions (
          id, case_id, operation, prompt, response, model, tokens_used, cost, duration, success, error, timestamp, step_context, prompt_template, prompt_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            const result = stmt.run(
                interaction.id,
                interaction.caseId,
                interaction.operation,
                interaction.prompt,
                interaction.response,
                interaction.model,
                interaction.tokensUsed,
                interaction.cost || null,
                interaction.duration,
                interaction.success ? 1 : 0,
                interaction.error || null,
                interaction.timestamp.toISOString(),
                interaction.stepContext || null,
                interaction.promptTemplate || null,
                interaction.promptVersion || null
            );

            if (result.changes === 0) {
                throw new Error(`Failed to log AI interaction with ID: ${interaction.id}`);
            }
        } catch (error) {
            throw new Error(`Failed to log AI interaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get AI interaction history for a case
     */
    public async getAIInteractionHistory(caseId: string): Promise<AIInteractionModel[]> {
        try {
            const stmt = this.getDatabase().prepare(`
        SELECT * FROM ai_interactions 
        WHERE case_id = ? 
        ORDER BY timestamp DESC
      `);

            const interactionRows = stmt.all(caseId) as AIInteraction[];
            return interactionRows.map(interaction => this.mapDatabaseInteractionToModel(interaction));
        } catch (error) {
            throw new Error(`Failed to get AI interaction history: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get audit trail for a case
     */
    public async getAuditTrail(caseId: string): Promise<AuditEntry[]> {
        try {
            const stmt = this.getDatabase().prepare(`
        SELECT * FROM audit_trail 
        WHERE case_id = ? 
        ORDER BY timestamp DESC
      `);

            return stmt.all(caseId) as AuditEntry[];
        } catch (error) {
            throw new Error(`Failed to get audit trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Add a case note
     */
    public async addCaseNote(caseId: string, content: string, userId: string): Promise<void> {
        try {
            const stmt = this.getDatabase().prepare(`
        INSERT INTO case_notes (
          id, case_id, content, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `);

            const result = stmt.run(
                randomUUID(),
                caseId,
                content,
                userId,
                new Date().toISOString()
            );

            if (result.changes === 0) {
                throw new Error(`Failed to add case note for case: ${caseId}`);
            }
        } catch (error) {
            throw new Error(`Failed to add case note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Execute operations in a transaction
     */
    public transaction<T>(operations: () => T): T {
        return this.getDatabase().transaction(operations);
    }

    // Private helper methods

    /**
     * Get case notes for a case
     */
    public async getCaseNotes(caseId: string): Promise<CaseNote[]> {
        try {
            const stmt = this.getDatabase().prepare(`
        SELECT * FROM case_notes 
        WHERE case_id = ? 
        ORDER BY created_at DESC
      `);

            return stmt.all(caseId) as CaseNote[];
        } catch (error) {
            throw new Error(`Failed to get case notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get AI summaries for a case (private method)
     */
    private async getCaseSummaries(caseId: string): Promise<AISummary[]> {
        try {
            const stmt = this.getDatabase().prepare(`
        SELECT * FROM ai_summaries 
        WHERE case_id = ? 
        ORDER BY generated_at DESC
      `);

            return stmt.all(caseId) as AISummary[];
        } catch (error) {
            throw new Error(`Failed to get case summaries: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Save case notes (private method)
     */
    private saveCaseNotes(caseId: string, notes: Array<{ id?: string; content: string; createdBy?: string; createdAt?: Date }>): void {
        const stmt = this.getDatabase().prepare(`
        INSERT OR REPLACE INTO case_notes (
          id, case_id, content, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `);

        for (const note of notes) {
            stmt.run(
                note.id || randomUUID(),
                caseId,
                note.content,
                note.createdBy || 'system',
                note.createdAt ? note.createdAt.toISOString() : new Date().toISOString()
            );
        }
    }

    /**
     * Save audit entry (private method)
     */
    private saveAuditEntry(entry: AuditEntry): void {
        const stmt = this.getDatabase().prepare(`
        INSERT OR REPLACE INTO audit_trail (
          id, case_id, action, details, user_id, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

        stmt.run(
            entry.id,
            entry.case_id,
            entry.action,
            entry.details || null,
            entry.user_id,
            entry.timestamp
        );
    }

    private mapDatabaseCaseToModel(
        caseRow: Case,
        notes: CaseNote[],
        aiSummaries: AISummary[],
        auditTrail: AuditEntry[]
    ): CaseModel {
        const createdAt = new Date(caseRow.created_at);
        const updatedAt = new Date(caseRow.updated_at);

        return {
            id: caseRow.id,
            applicationData: this.mapDatabaseApplicationDataToModel(JSON.parse(caseRow.application_data)),
            status: caseRow.status,
            currentStep: caseRow.current_step,
            createdAt,
            updatedAt,
            ...(caseRow.assigned_to && { assignedTo: caseRow.assigned_to }),
            notes: notes.map(note => ({
                id: note.id,
                caseId: note.case_id,
                content: note.content,
                createdBy: note.created_by,
                createdAt: new Date(note.created_at)
            })),
            aiSummaries: aiSummaries.map(this.mapDatabaseSummaryToModel),
            auditTrail: auditTrail.map(entry => ({
                id: entry.id,
                caseId: entry.case_id,
                action: entry.action,
                details: entry.details ? JSON.parse(entry.details) : undefined,
                userId: entry.user_id,
                timestamp: new Date(entry.timestamp)
            }))
        };
    }



    private mapDatabaseSummaryToModel(summaryRow: AISummary): AISummaryModel {
        const mappedSummary = {
            id: summaryRow.id,
            caseId: summaryRow.case_id,
            type: summaryRow.type,
            step: summaryRow.step as ProcessStep,
            content: summaryRow.content,
            recommendations: JSON.parse(summaryRow.recommendations || '[]'),
            confidence: summaryRow.confidence || 0,
            generatedAt: new Date(summaryRow.generated_at),
            version: summaryRow.version
        };

        return mappedSummary;
    }

    private mapDatabaseInteractionToModel(interactionRow: AIInteraction): AIInteractionModel {
        const mappedInteraction = {
            id: interactionRow.id,
            caseId: interactionRow.case_id,
            operation: interactionRow.operation,
            prompt: interactionRow.prompt,
            response: interactionRow.response,
            model: interactionRow.model,
            tokensUsed: interactionRow.tokens_used || 0,
            ...(interactionRow.cost && { cost: interactionRow.cost }),
            duration: interactionRow.duration,
            success: Boolean(interactionRow.success), // Convert integer back to boolean
            ...(interactionRow.error && { error: interactionRow.error }),
            timestamp: new Date(interactionRow.timestamp),
            ...(interactionRow.step_context && { stepContext: interactionRow.step_context as ProcessStep }),
            ...(interactionRow.prompt_template && { promptTemplate: interactionRow.prompt_template }),
            ...(interactionRow.prompt_version && { promptVersion: interactionRow.prompt_version })
        };

        return mappedInteraction;
    }

    private mapDatabaseApplicationDataToModel(dbAppData: Record<string, unknown>): import('../types/index.js').ApplicationData {
        return {
            applicantName: dbAppData.applicantName as string,
            applicantEmail: dbAppData.applicantEmail as string,
            applicationType: dbAppData.applicationType as string,
            submissionDate: new Date(dbAppData.submissionDate as string),
            documents: (dbAppData.documents as Array<Record<string, unknown>>)?.map((doc: Record<string, unknown>) => ({
                id: doc.id as string,
                filename: doc.filename as string,
                path: doc.path as string,
                size: doc.size as number,
                mimeType: doc.mimeType as string,
                uploadedAt: new Date(doc.uploadedAt as string)
            })) || [],
            formData: dbAppData.formData as Record<string, unknown> || {}
        };
    }
}