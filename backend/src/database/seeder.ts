import { DatabaseConnection } from './connection.js';
import { CaseStatus, ProcessStep, ApplicationData } from '../types/database.js';
import { v4 as uuidv4 } from 'uuid';

export class DatabaseSeeder {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  public async seedDatabase(): Promise<void> {
    console.log('Seeding database with sample data...');

    try {
      this.db.transaction(() => {
        this.seedCases();
        this.seedAISummaries();
        this.seedCaseNotes();
        this.seedAuditTrail();
        this.seedAIInteractions();
      });

      console.log('Database seeding completed successfully');
    } catch (error) {
      console.error('Database seeding failed:', error);
      throw error;
    }
  }

  private seedCases(): void {
    const cases = [
      {
        id: 'case-001',
        application_data: JSON.stringify({
          applicantName: 'John Doe',
          applicantEmail: 'john.doe@example.com',
          applicationType: 'Business License',
          submissionDate: new Date('2024-01-15').toISOString(),
          documents: [
            {
              id: 'doc-001',
              filename: 'business_plan.pdf',
              path: '/uploads/business_plan.pdf',
              size: 1024000,
              mimeType: 'application/pdf',
              uploadedAt: new Date('2024-01-15').toISOString()
            }
          ],
          formData: {
            businessName: 'Doe Enterprises',
            businessType: 'LLC',
            address: '123 Main St, City, State 12345'
          }
        } as ApplicationData),
        status: CaseStatus.ACTIVE,
        current_step: ProcessStep.IN_REVIEW,
        created_at: new Date('2024-01-15').toISOString(),
        updated_at: new Date('2024-01-16').toISOString(),
        assigned_to: 'user-001'
      },
      {
        id: 'case-002',
        application_data: JSON.stringify({
          applicantName: 'Jane Smith',
          applicantEmail: 'jane.smith@example.com',
          applicationType: 'Permit Application',
          submissionDate: new Date('2024-01-20').toISOString(),
          documents: [
            {
              id: 'doc-002',
              filename: 'site_plan.pdf',
              path: '/uploads/site_plan.pdf',
              size: 2048000,
              mimeType: 'application/pdf',
              uploadedAt: new Date('2024-01-20').toISOString()
            }
          ],
          formData: {
            projectName: 'Smith Construction Project',
            projectType: 'Residential',
            address: '456 Oak Ave, City, State 12345'
          }
        } as ApplicationData),
        status: CaseStatus.PENDING,
        current_step: ProcessStep.ADDITIONAL_INFO_REQUIRED,
        created_at: new Date('2024-01-20').toISOString(),
        updated_at: new Date('2024-01-22').toISOString(),
        assigned_to: 'user-002'
      }
    ];

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO cases (id, application_data, status, current_step, created_at, updated_at, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    cases.forEach(caseData => {
      stmt.run(
        caseData.id,
        caseData.application_data,
        caseData.status,
        caseData.current_step,
        caseData.created_at,
        caseData.updated_at,
        caseData.assigned_to
      );
    });

    console.log('Seeded cases table');
  }

  private seedAISummaries(): void {
    const summaries = [
      {
        id: uuidv4(),
        case_id: 'case-001',
        type: 'overall',
        step: null,
        content: 'Business license application for Doe Enterprises LLC. Complete application with all required documentation. Business plan shows strong financial projections and market analysis.',
        recommendations: JSON.stringify([
          'Review business plan financial projections',
          'Verify zoning compliance for proposed location',
          'Schedule site inspection if required'
        ]),
        confidence: 0.85,
        generated_at: new Date('2024-01-15T10:30:00').toISOString(),
        version: 1
      },
      {
        id: uuidv4(),
        case_id: 'case-001',
        type: 'step-specific',
        step: ProcessStep.IN_REVIEW,
        content: 'Case is ready for detailed review. All initial documentation is complete and meets basic requirements.',
        recommendations: JSON.stringify([
          'Conduct thorough document review',
          'Verify applicant credentials',
          'Check for any regulatory compliance issues'
        ]),
        confidence: 0.90,
        generated_at: new Date('2024-01-16T09:15:00').toISOString(),
        version: 1
      },
      {
        id: uuidv4(),
        case_id: 'case-002',
        type: 'overall',
        step: null,
        content: 'Permit application for residential construction project. Missing some required environmental impact documentation.',
        recommendations: JSON.stringify([
          'Request environmental impact assessment',
          'Verify building code compliance',
          'Schedule preliminary site review'
        ]),
        confidence: 0.75,
        generated_at: new Date('2024-01-20T14:20:00').toISOString(),
        version: 1
      }
    ];

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO ai_summaries (id, case_id, type, step, content, recommendations, confidence, generated_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    summaries.forEach(summary => {
      stmt.run(
        summary.id,
        summary.case_id,
        summary.type,
        summary.step,
        summary.content,
        summary.recommendations,
        summary.confidence,
        summary.generated_at,
        summary.version
      );
    });

    console.log('Seeded ai_summaries table');
  }

  private seedCaseNotes(): void {
    const notes = [
      {
        id: uuidv4(),
        case_id: 'case-001',
        content: 'Initial review completed. Business plan looks comprehensive and well-structured.',
        created_by: 'user-001',
        created_at: new Date('2024-01-16T11:00:00').toISOString()
      },
      {
        id: uuidv4(),
        case_id: 'case-002',
        content: 'Missing environmental impact documentation. Contacted applicant for additional information.',
        created_by: 'user-002',
        created_at: new Date('2024-01-22T15:30:00').toISOString()
      }
    ];

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO case_notes (id, case_id, content, created_by, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    notes.forEach(note => {
      stmt.run(note.id, note.case_id, note.content, note.created_by, note.created_at);
    });

    console.log('Seeded case_notes table');
  }

  private seedAuditTrail(): void {
    const auditEntries = [
      {
        id: uuidv4(),
        case_id: 'case-001',
        action: 'case_created',
        details: JSON.stringify({ status: CaseStatus.ACTIVE, step: ProcessStep.RECEIVED }),
        user_id: 'system',
        timestamp: new Date('2024-01-15T08:00:00').toISOString()
      },
      {
        id: uuidv4(),
        case_id: 'case-001',
        action: 'status_changed',
        details: JSON.stringify({ from: ProcessStep.RECEIVED, to: ProcessStep.IN_REVIEW }),
        user_id: 'user-001',
        timestamp: new Date('2024-01-16T09:00:00').toISOString()
      },
      {
        id: uuidv4(),
        case_id: 'case-002',
        action: 'case_created',
        details: JSON.stringify({ status: CaseStatus.PENDING, step: ProcessStep.RECEIVED }),
        user_id: 'system',
        timestamp: new Date('2024-01-20T10:00:00').toISOString()
      },
      {
        id: uuidv4(),
        case_id: 'case-002',
        action: 'status_changed',
        details: JSON.stringify({ from: ProcessStep.RECEIVED, to: ProcessStep.ADDITIONAL_INFO_REQUIRED }),
        user_id: 'user-002',
        timestamp: new Date('2024-01-22T14:00:00').toISOString()
      }
    ];

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO audit_trail (id, case_id, action, details, user_id, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    auditEntries.forEach(entry => {
      stmt.run(entry.id, entry.case_id, entry.action, entry.details, entry.user_id, entry.timestamp);
    });

    console.log('Seeded audit_trail table');
  }

  private seedAIInteractions(): void {
    const interactions = [
      {
        id: uuidv4(),
        case_id: 'case-001',
        operation: 'generate_summary',
        prompt: 'Generate an overall summary for this business license application...',
        response: 'Business license application for Doe Enterprises LLC. Complete application with all required documentation...',
        model: 'grok-beta',
        tokens_used: 150,
        cost: 0.0015,
        duration: 2500,
        success: true,
        error: null,
        timestamp: new Date('2024-01-15T10:30:00').toISOString()
      },
      {
        id: uuidv4(),
        case_id: 'case-001',
        operation: 'generate_recommendation',
        prompt: 'Generate step-specific recommendations for the in-review phase...',
        response: 'Case is ready for detailed review. All initial documentation is complete...',
        model: 'grok-beta',
        tokens_used: 120,
        cost: 0.0012,
        duration: 2200,
        success: true,
        error: null,
        timestamp: new Date('2024-01-16T09:15:00').toISOString()
      },
      {
        id: uuidv4(),
        case_id: 'case-002',
        operation: 'analyze_application',
        prompt: 'Analyze this permit application for completeness and compliance...',
        response: 'Permit application for residential construction project. Missing some required environmental impact documentation...',
        model: 'grok-beta',
        tokens_used: 180,
        cost: 0.0018,
        duration: 3000,
        success: true,
        error: null,
        timestamp: new Date('2024-01-20T14:20:00').toISOString()
      }
    ];

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO ai_interactions (id, case_id, operation, prompt, response, model, tokens_used, cost, duration, success, error, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    interactions.forEach(interaction => {
      stmt.run(
        interaction.id,
        interaction.case_id,
        interaction.operation,
        interaction.prompt,
        interaction.response,
        interaction.model,
        interaction.tokens_used,
        interaction.cost,
        interaction.duration,
        interaction.success ? 1 : 0,
        interaction.error,
        interaction.timestamp
      );
    });

    console.log('Seeded ai_interactions table');
  }

  public async clearDatabase(): Promise<void> {
    console.log('Clearing database...');

    const tables = ['ai_interactions', 'audit_trail', 'case_notes', 'ai_summaries', 'cases'];
    
    this.db.transaction(() => {
      tables.forEach(table => {
        this.db.exec(`DELETE FROM ${table}`);
      });
    });

    console.log('Database cleared');
  }

  public getRecordCounts(): Record<string, number> {
    const tables = ['cases', 'ai_summaries', 'case_notes', 'audit_trail', 'ai_interactions'];
    const counts: Record<string, number> = {};

    tables.forEach(table => {
      const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
      const result = stmt.get() as { count: number };
      counts[table] = result.count;
    });

    return counts;
  }
}