import { randomUUID } from 'crypto';
import { DataService } from './DataService.js';
import { AIService } from './AIService.js';
import {
  Case,
  ApplicationData,
  CaseStatus,
  ProcessStep,
  ActivityLog
} from '../types/index.js';

export class CaseService {
  private dataService: DataService;
  private aiService: AIService;

  constructor(dataService: DataService, aiService: AIService) {
    this.dataService = dataService;
    this.aiService = aiService;
  }

  /**
   * Create a new case from application data without AI processing (for testing)
   * Requirements: 1.1, 1.2
   */
  async createCaseWithoutAI(applicationData: ApplicationData, userId: string = 'system'): Promise<Case> {
    try {
      // Validate application data
      this.validateApplicationData(applicationData);

      const caseId = randomUUID();
      const now = new Date();

      const newCase: Case = {
        id: caseId,
        applicationData,
        status: CaseStatus.ACTIVE,
        currentStep: ProcessStep.RECEIVED,
        createdAt: now,
        updatedAt: now,
        notes: [],
        aiSummaries: [],
        auditTrail: []
      };

      // Save the case to database
      await this.dataService.saveCase(newCase);

      // Log case creation activity
      await this.logActivity(caseId, 'case_created', {
        applicantName: applicationData.applicantName,
        applicationType: applicationData.applicationType,
        submissionDate: applicationData.submissionDate
      }, userId);

      return newCase;
    } catch (error) {
      throw new Error(`Failed to create case: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new case from application data
   * Requirements: 1.1, 1.2
   */
  async createCase(applicationData: ApplicationData, userId: string = 'system'): Promise<Case> {
    try {
      // Validate application data
      this.validateApplicationData(applicationData);

      const caseId = randomUUID();
      const now = new Date();

      const newCase: Case = {
        id: caseId,
        applicationData,
        status: CaseStatus.ACTIVE,
        currentStep: ProcessStep.RECEIVED,
        createdAt: now,
        updatedAt: now,
        notes: [],
        aiSummaries: [],
        auditTrail: []
      };

      // Save the case to database
      await this.dataService.saveCase(newCase);

      // Log case creation activity
      await this.logActivity(caseId, 'case_created', {
        applicantName: applicationData.applicantName,
        applicationType: applicationData.applicationType,
        submissionDate: applicationData.submissionDate
      }, userId);

      // Generate initial AI analysis
      try {
        const aiSummary = await this.aiService.generateOverallSummary(newCase);
        await this.dataService.saveSummary(aiSummary);

        // Update case with AI summary
        newCase.aiSummaries = [aiSummary];
      } catch (aiError) {
        // Log AI failure but don't fail case creation
        await this.logActivity(caseId, 'ai_analysis_failed', {
          error: aiError instanceof Error ? aiError.message : 'Unknown AI error'
        }, userId);
      }

      return newCase;
    } catch (error) {
      throw new Error(`Failed to create case: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process application data with comprehensive AI analysis and validation
   * Requirements: 1.1, 1.2, 1.5, 2.6
   */
  async processApplication(applicationData: ApplicationData, userId: string = 'system'): Promise<{
    case: Case;
    applicationAnalysis: import('../types/index.js').ApplicationAnalysis;
    missingFieldsAnalysis: import('../types/index.js').MissingFieldsAnalysis;
  }> {
    try {
      // Step 1: Extract and validate application data
      const extractedData = this.extractApplicationData(applicationData);

      // Step 2: Detect missing fields using AI
      const missingFieldsAnalysis = await this.aiService.detectMissingFields(extractedData);

      // Step 3: Analyze application using AI
      const applicationAnalysis = await this.aiService.analyzeApplication(extractedData);

      // Step 4: Create case using the standard createCase method
      const newCase = await this.createCase(extractedData, userId);

      // Step 5: Log application processing activity
      await this.logActivity(newCase.id, 'application_processed', {
        applicantName: extractedData.applicantName,
        applicationType: extractedData.applicationType,
        submissionDate: extractedData.submissionDate,
        completenessScore: missingFieldsAnalysis.completenessScore,
        priorityLevel: applicationAnalysis.priorityLevel,
        missingFieldsCount: missingFieldsAnalysis.missingFields.length
      }, userId);

      // Step 6: Add case notes for missing fields if any
      if (missingFieldsAnalysis.missingFields.length > 0) {
        const missingFieldsNote = this.generateMissingFieldsNote(missingFieldsAnalysis);
        await this.addCaseNote(newCase.id, missingFieldsNote, userId);

        // Log missing fields detection
        await this.logActivity(newCase.id, 'missing_fields_detected', {
          missingFieldsCount: missingFieldsAnalysis.missingFields.length,
          requiredFields: missingFieldsAnalysis.missingFields.filter(f => f.importance === 'required').length,
          recommendedFields: missingFieldsAnalysis.missingFields.filter(f => f.importance === 'recommended').length
        }, userId);
      }

      // Step 7: Set case status based on completeness
      if (missingFieldsAnalysis.completenessScore < 0.7) {
        await this.updateCaseStatus(newCase.id, CaseStatus.PENDING, userId);
        await this.logActivity(newCase.id, 'case_marked_incomplete', {
          completenessScore: missingFieldsAnalysis.completenessScore,
          reason: 'Low completeness score requires additional information'
        }, userId);
      }

      // Get the final case with all updates
      const finalCase = await this.dataService.getCase(newCase.id);
      if (!finalCase) {
        throw new Error('Failed to retrieve processed case');
      }

      return {
        case: finalCase,
        applicationAnalysis,
        missingFieldsAnalysis
      };

    } catch (error) {
      throw new Error(`Failed to process application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update case status with validation and workflow logic
   * Requirements: 1.6, 2.3
   */
  async updateCaseStatus(caseId: string, newStatus: CaseStatus, userId: string): Promise<Case> {
    try {
      // Get current case
      const currentCase = await this.dataService.getCase(caseId);
      if (!currentCase) {
        throw new Error(`Case with ID ${caseId} not found`);
      }

      // Validate status transition
      this.validateStatusTransition(currentCase.status, newStatus);

      // Determine new process step based on status
      const newStep = this.determineProcessStep(newStatus, currentCase.currentStep);

      // Update case in database
      await this.dataService.updateCase(caseId, {
        status: newStatus,
        currentStep: newStep,
        updatedAt: new Date()
      });

      // Log status change activity
      await this.logActivity(caseId, 'status_updated', {
        previousStatus: currentCase.status,
        newStatus,
        previousStep: currentCase.currentStep,
        newStep
      }, userId);

      // Get updated case
      const updatedCase = await this.dataService.getCase(caseId);
      if (!updatedCase) {
        throw new Error('Failed to retrieve updated case');
      }

      // Regenerate AI summary for significant status changes
      if (this.shouldRegenerateAISummary(currentCase.status, newStatus)) {
        try {
          const aiSummary = await this.aiService.generateOverallSummary(updatedCase);
          await this.dataService.saveSummary(aiSummary);
        } catch (aiError) {
          // Log AI failure but don't fail status update
          await this.logActivity(caseId, 'ai_summary_regeneration_failed', {
            error: aiError instanceof Error ? aiError.message : 'Unknown AI error'
          }, userId);
        }
      }

      return updatedCase;
    } catch (error) {
      throw new Error(`Failed to update case status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a note to a case with automatic AI summary update
   * Requirements: 2.4
   */
  async addCaseNote(caseId: string, note: string, userId: string): Promise<Case> {
    try {
      // Validate inputs
      if (!note.trim()) {
        throw new Error('Note content cannot be empty');
      }

      // Get current case
      const currentCase = await this.dataService.getCase(caseId);
      if (!currentCase) {
        throw new Error(`Case with ID ${caseId} not found`);
      }

      // Add note to database
      await this.dataService.addCaseNote(caseId, note.trim(), userId);

      // Log note addition activity
      await this.logActivity(caseId, 'note_added', {
        noteLength: note.trim().length,
        addedBy: userId
      }, userId);

      // Get updated case with new note
      const updatedCase = await this.dataService.getCase(caseId);
      if (!updatedCase) {
        throw new Error('Failed to retrieve updated case');
      }

      // Automatically regenerate AI summary to incorporate new information (Requirement 2.4)
      try {
        const aiSummary = await this.aiService.generateOverallSummary(updatedCase);
        await this.dataService.saveSummary(aiSummary);

        await this.logActivity(caseId, 'ai_summary_updated', {
          trigger: 'note_added',
          summaryVersion: aiSummary.version
        }, userId);
      } catch (aiError) {
        // Log AI failure but don't fail note addition
        await this.logActivity(caseId, 'ai_summary_update_failed', {
          trigger: 'note_added',
          error: aiError instanceof Error ? aiError.message : 'Unknown AI error'
        }, userId);
      }

      return updatedCase;
    } catch (error) {
      throw new Error(`Failed to add case note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a case by ID
   * Requirements: 4.3
   */
  async getCaseById(caseId: string): Promise<Case | null> {
    try {
      return await this.dataService.getCase(caseId);
    } catch (error) {
      throw new Error(`Failed to get case: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cases by status
   * Requirements: 4.3
   */
  async getCasesByStatus(status: CaseStatus): Promise<Case[]> {
    try {
      return await this.dataService.getCasesByStatus(status);
    } catch (error) {
      throw new Error(`Failed to get cases by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all cases with optional filtering and pagination
   * Requirements: 1.1, 1.2
   */
  async getAllCases(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ cases: Case[]; total: number; page: number; limit: number }> {
    try {
      const { status, page = 1, limit = 10 } = params || {};
      
      // Get all cases from database
      const allCases = await this.dataService.getAllCases();
      
      // Filter by status if provided
      let filteredCases = allCases;
      if (status) {
        const statusEnum = status as CaseStatus;
        filteredCases = allCases.filter(case_ => case_.status === statusEnum);
      }
      
      // Calculate pagination
      const total = filteredCases.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCases = filteredCases.slice(startIndex, endIndex);
      
      return {
        cases: paginatedCases,
        total,
        page,
        limit
      };
    } catch (error) {
      throw new Error(`Failed to get all cases: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  /**
   * Extract and normalize application data
   * Requirements: 1.1, 1.2
   */
  private extractApplicationData(rawApplicationData: ApplicationData): ApplicationData {
    // Normalize and clean application data
    const extractedData: ApplicationData = {
      applicantName: rawApplicationData.applicantName?.trim() || '',
      applicantEmail: rawApplicationData.applicantEmail?.trim().toLowerCase() || '',
      applicationType: rawApplicationData.applicationType?.trim() || '',
      submissionDate: rawApplicationData.submissionDate || new Date(),
      documents: rawApplicationData.documents || [],
      formData: this.normalizeFormData(rawApplicationData.formData || {})
    };

    return extractedData;
  }

  /**
   * Normalize form data by cleaning and standardizing values
   */
  private normalizeFormData(formData: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(formData)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.length > 0) {
            normalized[key] = trimmed;
          }
        } else if (typeof value === 'number' && !isNaN(value)) {
          normalized[key] = value;
        } else if (typeof value === 'boolean') {
          normalized[key] = value;
        } else if (Array.isArray(value) && value.length > 0) {
          normalized[key] = value;
        } else if (typeof value === 'object' && Object.keys(value).length > 0) {
          normalized[key] = value;
        }
      }
    }

    return normalized;
  }

  /**
   * Generate a case note for missing fields
   * Requirements: 1.5, 2.6
   */
  private generateMissingFieldsNote(missingFieldsAnalysis: import('../types/index.js').MissingFieldsAnalysis): string {
    const requiredFields = missingFieldsAnalysis.missingFields.filter(f => f.importance === 'required');
    const recommendedFields = missingFieldsAnalysis.missingFields.filter(f => f.importance === 'recommended');
    const optionalFields = missingFieldsAnalysis.missingFields.filter(f => f.importance === 'optional');

    let note = `**Missing Fields Analysis** (Completeness Score: ${(missingFieldsAnalysis.completenessScore * 100).toFixed(1)}%)\n\n`;

    if (requiredFields.length > 0) {
      note += `**Required Fields Missing:**\n`;
      requiredFields.forEach(field => {
        note += `- ${field.fieldName} (${field.fieldType}): ${field.suggestedAction}\n`;
      });
      note += '\n';
    }

    if (recommendedFields.length > 0) {
      note += `**Recommended Fields Missing:**\n`;
      recommendedFields.forEach(field => {
        note += `- ${field.fieldName} (${field.fieldType}): ${field.suggestedAction}\n`;
      });
      note += '\n';
    }

    if (optionalFields.length > 0) {
      note += `**Optional Fields Missing:**\n`;
      optionalFields.forEach(field => {
        note += `- ${field.fieldName} (${field.fieldType}): ${field.suggestedAction}\n`;
      });
      note += '\n';
    }

    if (missingFieldsAnalysis.priorityActions.length > 0) {
      note += `**Priority Actions:**\n`;
      missingFieldsAnalysis.priorityActions.forEach(action => {
        note += `- ${action}\n`;
      });
      note += '\n';
    }

    note += `**Estimated Completion Time:** ${missingFieldsAnalysis.estimatedCompletionTime}\n`;
    note += `**Analysis Generated:** ${missingFieldsAnalysis.analysisTimestamp.toISOString()}`;

    return note;
  }

  /**
   * Validate application data before case creation
   */
  private validateApplicationData(applicationData: ApplicationData): void {
    if (!applicationData.applicantName?.trim()) {
      throw new Error('Applicant name is required');
    }

    if (!applicationData.applicantEmail?.trim()) {
      throw new Error('Applicant email is required');
    }

    if (!this.isValidEmail(applicationData.applicantEmail)) {
      throw new Error('Invalid email format');
    }

    if (!applicationData.applicationType?.trim()) {
      throw new Error('Application type is required');
    }

    if (!applicationData.submissionDate) {
      throw new Error('Submission date is required');
    }

    if (applicationData.submissionDate > new Date()) {
      throw new Error('Submission date cannot be in the future');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate case status transitions based on workflow logic
   */
  private validateStatusTransition(currentStatus: CaseStatus, newStatus: CaseStatus): void {
    const validTransitions: Record<CaseStatus, CaseStatus[]> = {
      [CaseStatus.ACTIVE]: [CaseStatus.PENDING, CaseStatus.APPROVED, CaseStatus.DENIED, CaseStatus.WITHDRAWN],
      [CaseStatus.PENDING]: [CaseStatus.ACTIVE, CaseStatus.APPROVED, CaseStatus.DENIED, CaseStatus.WITHDRAWN],
      [CaseStatus.APPROVED]: [CaseStatus.ARCHIVED],
      [CaseStatus.DENIED]: [CaseStatus.ARCHIVED],
      [CaseStatus.WITHDRAWN]: [CaseStatus.ARCHIVED],
      [CaseStatus.ARCHIVED]: [] // No transitions from archived
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Determine process step based on case status
   */
  private determineProcessStep(status: CaseStatus, currentStep: ProcessStep): ProcessStep {
    switch (status) {
      case CaseStatus.ACTIVE:
        // Keep current step or default to received
        return currentStep === ProcessStep.CONCLUDED ? ProcessStep.RECEIVED : currentStep;
      case CaseStatus.PENDING:
        return ProcessStep.ADDITIONAL_INFO_REQUIRED;
      case CaseStatus.APPROVED:
      case CaseStatus.DENIED:
      case CaseStatus.WITHDRAWN:
        return ProcessStep.CONCLUDED;
      case CaseStatus.ARCHIVED:
        return ProcessStep.CONCLUDED;
      default:
        return currentStep;
    }
  }

  /**
   * Determine if AI summary should be regenerated for status change
   */
  private shouldRegenerateAISummary(oldStatus: CaseStatus, newStatus: CaseStatus): boolean {
    // Regenerate AI summary for significant status changes
    const significantTransitions = [
      CaseStatus.APPROVED,
      CaseStatus.DENIED,
      CaseStatus.WITHDRAWN
    ];

    return significantTransitions.includes(newStatus) && oldStatus !== newStatus;
  }

  /**
   * Log activity to audit trail
   */
  private async logActivity(caseId: string, action: string, details: Record<string, any>, userId: string): Promise<void> {
    const activity: ActivityLog = {
      id: randomUUID(),
      caseId,
      action,
      details,
      userId,
      timestamp: new Date()
    };

    await this.dataService.logActivity(activity);
  }
}