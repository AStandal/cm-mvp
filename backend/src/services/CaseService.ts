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

  // Private helper methods

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