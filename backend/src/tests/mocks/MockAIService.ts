import { randomUUID } from 'crypto';
import {
  Case,
  ApplicationData,
  AISummary,
  AIRecommendation,
  ApplicationAnalysis,
  FinalSummary,
  CompletenessValidation,
  MissingFieldsAnalysis,
  ProcessStep
} from '../../types/index.js';

/**
 * Mock AIService for testing
 * Provides realistic test data without making actual AI API calls
 */
export class MockAIService {
  /**
   * Generate a mock overall summary
   */
  async generateOverallSummary(caseData: Case): Promise<AISummary> {
    return {
      id: randomUUID(),
      caseId: caseData.id,
      type: 'overall',
      content: `Mock AI summary for case ${caseData.id}. This is a ${caseData.applicationData.applicationType} application submitted by ${caseData.applicationData.applicantName}. The application has been received and is ready for processing.`,
      recommendations: [
        'Review application completeness',
        'Verify applicant information',
        'Process according to standard workflow'
      ],
      confidence: 0.85,
      generatedAt: new Date(),
      version: 1
    };
  }

  /**
   * Generate mock step-specific recommendations
   */
  async generateStepRecommendation(caseData: Case, step: ProcessStep): Promise<AIRecommendation> {
    return {
      id: randomUUID(),
      caseId: caseData.id,
      step,
      recommendations: [
        `Mock recommendation for ${step} step`,
        'Continue with standard processing',
        'Monitor for any issues'
      ],
      priority: 'medium',
      confidence: 0.8,
      generatedAt: new Date()
    };
  }

  /**
   * Generate mock application analysis
   */
  async analyzeApplication(applicationData: ApplicationData): Promise<ApplicationAnalysis> {
    const requiredFields = ['applicantName', 'applicantEmail', 'applicationType'];
    const completedFields = requiredFields.filter(field =>
      applicationData[field as keyof ApplicationData] &&
      String(applicationData[field as keyof ApplicationData]).trim().length > 0
    );
    const completeness = completedFields.length / requiredFields.length;

    return {
      summary: `Mock analysis for ${applicationData.applicationType} application submitted by ${applicationData.applicantName}. Application appears to be ${Math.round(completeness * 100)}% complete.`,
      keyPoints: [
        `Application type: ${applicationData.applicationType}`,
        `Applicant: ${applicationData.applicantName}`,
        `Email: ${applicationData.applicantEmail}`,
        `Submission date: ${applicationData.submissionDate?.toISOString().split('T')[0] || 'Not provided'}`
      ],
      potentialIssues: completeness < 1 ? [
        'Some required fields may be missing',
        'Additional documentation may be needed'
      ] : [
        'No major issues identified'
      ],
      recommendedActions: [
        'Review application for completeness',
        'Verify applicant information',
        'Process according to standard workflow'
      ],
      priorityLevel: completeness >= 0.8 ? 'low' : 'medium',
      estimatedProcessingTime: '2-3 business days',
      requiredDocuments: [
        'Proof of identity',
        'Supporting documentation'
      ],
      analysisTimestamp: new Date()
    };
  }

  /**
   * Generate mock final summary
   */
  async generateFinalSummary(caseData: Case): Promise<FinalSummary> {
    return {
      overallSummary: `Mock final summary for case ${caseData.id}. This ${caseData.applicationData.applicationType} application has been processed successfully.`,
      keyDecisions: [
        'Application approved for processing',
        'All required documentation verified',
        'Standard processing workflow applied'
      ],
      outcomes: [
        'Application processed successfully',
        'All requirements met'
      ],
      processHistory: [
        'Application received and validated',
        'Initial review completed',
        'Final decision rendered'
      ],
      recommendedDecision: 'approved' as const,
      supportingRationale: [
        'All required documentation provided',
        'Application meets all criteria',
        'No outstanding issues identified'
      ],
      generatedAt: new Date()
    };
  }

  /**
   * Mock case completeness validation
   */
  async validateCaseCompleteness(caseData: Case): Promise<CompletenessValidation> {
    const hasBasicInfo = !!(
      caseData.applicationData?.applicantName &&
      caseData.applicationData?.applicantEmail
    );

    return {
      isComplete: hasBasicInfo,
      confidence: hasBasicInfo ? 0.9 : 0.6,
      missingSteps: hasBasicInfo ? [] : ['RECEIVED' as ProcessStep],
      missingDocuments: hasBasicInfo ? [] : [
        'Applicant identification',
        'Supporting documentation'
      ],
      recommendations: hasBasicInfo ? [
        'Case appears complete and ready for processing'
      ] : [
        'Please provide missing required information'
      ],
      validatedAt: new Date()
    };
  }

  /**
   * Mock missing fields detection
   */
  async detectMissingFields(applicationData: ApplicationData): Promise<MissingFieldsAnalysis> {
    const requiredFields = ['applicantName', 'applicantEmail', 'applicationType'];
    const missingFieldNames = requiredFields.filter(field =>
      !applicationData[field as keyof ApplicationData] ||
      String(applicationData[field as keyof ApplicationData]).trim().length === 0
    );

    const missingFields = missingFieldNames.map(fieldName => ({
      fieldName,
      fieldType: 'string',
      importance: 'required' as const,
      suggestedAction: `Please provide ${fieldName}`
    }));

    return {
      missingFields,
      completenessScore: (requiredFields.length - missingFieldNames.length) / requiredFields.length,
      priorityActions: missingFieldNames.length === 0 ? [
        'Application appears complete'
      ] : [
        'Please provide the missing required fields',
        'Contact applicant for additional information'
      ],
      estimatedCompletionTime: missingFieldNames.length === 0 ? 'Complete' : '1-2 business days',
      analysisTimestamp: new Date()
    };
  }
}