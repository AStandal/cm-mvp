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

    /**
     * Save a case to the database
     */
    public async saveCase(caseData: CaseModel): Promise<void> {
        try {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO cases (
          id, application_data, status, current_step, 
          created_at, updated_at, assigned_to
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

            const result = stmt.run(
                caseData.id,
                JSON.stringify(caseData.applicationData),
                caseData.status,
                caseData.currentStep,
                caseData.createdAt.toISOString(),
                caseData.updatedAt.toISOString(),
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
            const stmt = this.db.prepare(`
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

            // Convert database row to CaseModel
            return this.mapDatabaseCaseToModel(caseRow, notes, aiSummaries, auditTrail);

        } catch (error) {
            throw new Error(`Failed to get case: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update a case's basic information
     */
    public async updateCase(caseId: string, updates: Partial<CaseModel>): Promise<void> {
        try {
            const updateFields: string[] = [];
            const updateValues: any[] = [];

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

            if (updates.applicationData !== undefined) {
                updateFields.push('application_data = ?');
                updateValues.push(JSON.stringify(updates.applicationData));
            }

            // Always update the updated_at timestamp
            updateFields.push('updated_at = ?');
            updateValues.push(new Date().toISOString());

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
                throw new Error(`Case with ID ${caseId} not found or no changes made`);
            }

        } catch (error) {
            throw new Error(`Failed to update case: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get cases by status
     */
    public async getCasesByStatus(status: CaseStatus): Promise<CaseModel[]> {
        try {
            const stmt = this.db.prepare(`
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
     * Save an AI summary
     */
    public async saveSummary(summary: AISummaryModel): Promise<void> {
        try {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO ai_summaries (
          id, case_id, type, step, content, recommendations, 
          confidence, generated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            const result = stmt.run(
                summary.id,
                summary.caseId,
                summary.type,
                summary.step || null,
                summary.content,
                JSON.stringify(summary.recommendations),
                summary.confidence,
                summary.generatedAt.toISOString(),
                summary.version
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
            let sql = `
        SELECT * FROM ai_summaries 
        WHERE case_id = ?
      `;
            const params: any[] = [caseId];

            if (type) {
                sql += ` AND type = ?`;
                params.push(type);
            }

            sql += ` ORDER BY generated_at DESC`;

            const stmt = this.db.prepare(sql);
            const summaryRows = stmt.all(...params) as AISummary[];

            return summaryRows.map(this.mapDatabaseSummaryToModel);

        } catch (error) {
            throw new Error(`Failed to get AI summaries: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Log an activity
     */
    public async logActivity(activity: ActivityLog): Promise<void> {
        try {
            const auditEntry: AuditEntry = {
                id: activity.id,
                case_id: activity.caseId,
                action: activity.action,
                ...(activity.details && { details: JSON.stringify(activity.details) }),
                user_id: activity.userId,
                timestamp: activity.timestamp.toISOString()
            };

            await this.saveAuditEntry(auditEntry);

        } catch (error) {
            throw new Error(`Failed to log activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Log an AI interaction
     */
    public async logAIInteraction(interaction: AIInteractionModel): Promise<void> {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO ai_interactions (
          id, case_id, operation, prompt, response, model, 
          tokens_used, cost, duration, success, error, timestamp,
          step_context, prompt_template, prompt_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

            const result = stmt.run(
                interaction.id,
                interaction.caseId,
                interaction.operation,
                interaction.prompt,
                interaction.response,
                interaction.model,
                interaction.tokensUsed || null,
                interaction.cost || null,
                interaction.duration,
                interaction.success ? 1 : 0, // Convert boolean to integer
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
            const stmt = this.db.prepare(`
        SELECT * FROM ai_interactions 
        WHERE case_id = ? 
        ORDER BY timestamp DESC
      `);

            const interactionRows = stmt.all(caseId) as AIInteraction[];

            return interactionRows.map(this.mapDatabaseInteractionToModel);

        } catch (error) {
            throw new Error(`Failed to get AI interaction history: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get audit trail for a case
     */
    public async getAuditTrail(caseId: string): Promise<AuditEntry[]> {
        try {
            const stmt = this.db.prepare(`
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
            const noteId = randomUUID();
            const stmt = this.db.prepare(`
        INSERT INTO case_notes (id, case_id, content, created_by, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

            const result = stmt.run(
                noteId,
                caseId,
                content,
                userId,
                new Date().toISOString()
            );

            if (result.changes === 0) {
                throw new Error(`Failed to add case note for case ID: ${caseId}`);
            }

        } catch (error) {
            throw new Error(`Failed to add case note: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Execute operations within a transaction
     */
    public transaction<T>(operations: () => T): T {
        return this.db.transaction(operations);
    }

    // Private helper methods

    private async getCaseNotes(caseId: string): Promise<CaseNote[]> {
        const stmt = this.db.prepare(`
      SELECT * FROM case_notes 
      WHERE case_id = ? 
      ORDER BY created_at ASC
    `);
        return stmt.all(caseId) as CaseNote[];
    }

    private async getCaseSummaries(caseId: string): Promise<AISummary[]> {
        const stmt = this.db.prepare(`
      SELECT * FROM ai_summaries 
      WHERE case_id = ? 
      ORDER BY generated_at DESC
    `);
        return stmt.all(caseId) as AISummary[];
    }

    private saveCaseNotes(caseId: string, notes: any[]): void {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO case_notes (id, case_id, content, created_by, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

        for (const note of notes) {
            stmt.run(
                note.id,
                caseId,
                note.content,
                note.createdBy,
                note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt
            );
        }
    }

    private saveAuditEntry(entry: AuditEntry): void {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO audit_trail (id, case_id, action, details, user_id, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        const result = stmt.run(
            entry.id,
            entry.case_id,
            entry.action,
            entry.details || null,
            entry.user_id,
            entry.timestamp
        );

        if (result.changes === 0) {
            throw new Error(`Failed to save audit entry with ID: ${entry.id}`);
        }
    }

    private mapDatabaseCaseToModel(
        caseRow: Case,
        notes: CaseNote[],
        aiSummaries: AISummary[],
        auditTrail: AuditEntry[]
    ): CaseModel {
        return {
            id: caseRow.id,
            applicationData: this.mapDatabaseApplicationDataToModel(JSON.parse(caseRow.application_data)),
            status: caseRow.status,
            currentStep: caseRow.current_step,
            createdAt: new Date(caseRow.created_at),
            updatedAt: new Date(caseRow.updated_at),
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
        return {
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
    }

    private mapDatabaseInteractionToModel(interactionRow: AIInteraction): AIInteractionModel {
        return {
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
    }

    private mapDatabaseApplicationDataToModel(dbAppData: any): import('../types/index.js').ApplicationData {
        return {
            applicantName: dbAppData.applicantName,
            applicantEmail: dbAppData.applicantEmail,
            applicationType: dbAppData.applicationType,
            submissionDate: new Date(dbAppData.submissionDate),
            documents: dbAppData.documents?.map((doc: any) => ({
                id: doc.id,
                filename: doc.filename,
                path: doc.path,
                size: doc.size,
                mimeType: doc.mimeType,
                uploadedAt: new Date(doc.uploadedAt)
            })) || [],
            formData: dbAppData.formData || {}
        };
    }
}