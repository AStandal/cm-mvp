import { randomUUID } from 'crypto';
import { OpenRouterClient } from './OpenRouterClient.js';
import { DataService } from './DataService.js';
import { PromptTemplateService } from './PromptTemplateService.js';
import {
  Case,
  ApplicationData,
  AISummary,
  AIRecommendation,
  ApplicationAnalysis,
  FinalSummary,
  CompletenessValidation,
  MissingFieldsAnalysis,
  ProcessStep,
  AIInteraction
} from '../types/index.js';

export class AIService {
  private openRouterClient: OpenRouterClient;
  private dataService: DataService;
  private promptTemplateService: PromptTemplateService;

  constructor(openRouterClient: OpenRouterClient, dataService: DataService, promptTemplateService?: PromptTemplateService) {
    this.openRouterClient = openRouterClient;
    this.dataService = dataService;
    this.promptTemplateService = promptTemplateService || new PromptTemplateService();
  }

  /**
   * Generate an overall summary of the case
   */
  async generateOverallSummary(caseData: Case): Promise<AISummary> {
    const startTime = Date.now();
    const interactionId = randomUUID();
    const templateId = 'overall_summary_v1';
    
    try {
      const templateData = this.buildOverallSummaryData(caseData);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      const parameters = this.promptTemplateService.getTemplateParameters(templateId);
      
      const response = await this.openRouterClient.makeRequest(prompt, parameters);

      // Validate response using template schema
      const validation = this.promptTemplateService.validateResponse<{
        content: string;
        recommendations: string[];
        confidence: number;
      }>(templateId, response.content);

      if (!validation.isValid) {
        throw new Error(`Invalid AI response format: ${validation.errors?.join(', ')}`);
      }

      const summary = this.createAISummary(validation.data!, caseData.id);
      
      // Log successful AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'generate_summary',
        prompt,
        response: response.content,
        model: response.model,
        tokensUsed: response.tokensUsed.input + response.tokensUsed.output,
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date(),
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      return summary;
    } catch (error) {
      const templateData = this.buildOverallSummaryData(caseData);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'generate_summary',
        prompt,
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      // In development mode, provide fallback data if AI service is unavailable
      if (process.env.NODE_ENV === 'development' && error instanceof Error && 
          (error.message.includes('401') || error.message.includes('OpenRouter API failed'))) {
        
        console.warn('AI service unavailable in development mode, providing fallback data');
        
        // Return fallback AI summary for development
        return this.createAISummary({
          content: `This is a development fallback AI summary for case ${caseData.id}. The application appears to be a ${caseData.applicationData.applicationType} application submitted by ${caseData.applicationData.applicantName}. The case is currently in ${caseData.currentStep} status.`,
          recommendations: [
            'Review application completeness',
            'Verify applicant information',
            'Check required documentation',
            'Schedule follow-up if needed'
          ],
          confidence: 0.75
        }, caseData.id);
      }
      
      throw new Error(`Failed to generate overall summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate step-specific recommendations
   */
  async generateStepRecommendation(caseData: Case, step: ProcessStep): Promise<AIRecommendation> {
    const startTime = Date.now();
    const interactionId = randomUUID();
    const templateId = 'step_recommendation_v1';
    
    try {
      const templateData = this.buildStepRecommendationData(caseData, step);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      const parameters = this.promptTemplateService.getTemplateParameters(templateId);
      
      const response = await this.openRouterClient.makeRequest(prompt, parameters);

      // Validate response using template schema
      const validation = this.promptTemplateService.validateResponse<{
        recommendations: string[];
        priority: 'low' | 'medium' | 'high';
        confidence: number;
      }>(templateId, response.content);

      if (!validation.isValid) {
        throw new Error(`Invalid AI response format: ${validation.errors?.join(', ')}`);
      }

      const recommendation = this.createAIRecommendation(validation.data!, caseData.id, step);
      
      // Log successful AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'generate_recommendation',
        prompt,
        response: response.content,
        model: response.model,
        tokensUsed: response.tokensUsed.input + response.tokensUsed.output,
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date(),
        stepContext: step,
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      return recommendation;
    } catch (error) {
      const templateData = this.buildStepRecommendationData(caseData, step);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'generate_recommendation',
        prompt,
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        stepContext: step,
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      throw new Error(`Failed to generate step recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze application data
   */
  async analyzeApplication(applicationData: ApplicationData): Promise<ApplicationAnalysis> {
    const startTime = Date.now();
    const interactionId = randomUUID();
    const caseId = 'temp-' + randomUUID(); // Temporary ID for logging
    const templateId = 'application_analysis_v1';
    
    try {
      const templateData = this.buildApplicationAnalysisData(applicationData);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      const parameters = this.promptTemplateService.getTemplateParameters(templateId);
      
      const response = await this.openRouterClient.makeRequest(prompt, parameters);

      // Validate response using template schema
      const validation = this.promptTemplateService.validateResponse<{
        summary: string;
        keyPoints: string[];
        potentialIssues: string[];
        recommendedActions: string[];
        priorityLevel: 'low' | 'medium' | 'high' | 'urgent';
        estimatedProcessingTime: string;
        requiredDocuments: string[];
      }>(templateId, response.content);

      if (!validation.isValid) {
        throw new Error(`Invalid AI response format: ${validation.errors?.join(', ')}`);
      }

      const analysis = this.createApplicationAnalysis(validation.data!);
      
      // Log successful AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId,
        operation: 'analyze_application',
        prompt,
        response: response.content,
        model: response.model,
        tokensUsed: response.tokensUsed.input + response.tokensUsed.output,
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date(),
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      return analysis;
    } catch (error) {
      const templateData = this.buildApplicationAnalysisData(applicationData);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId,
        operation: 'analyze_application',
        prompt,
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      // In development mode, provide fallback data if AI service is unavailable
      if (process.env.NODE_ENV === 'development' && error instanceof Error && 
          (error.message.includes('401') || error.message.includes('OpenRouter API failed') || 
           error.message.includes('Failed to analyze application'))) {
        
        console.warn('AI service unavailable in development mode, providing fallback data for application analysis');
        
        // Calculate completeness based on form data
        const formFields = Object.keys(applicationData.formData || {});
        const requiredFields = ['applicantName', 'applicantEmail', 'applicationType', 'caseSummary'];
        const completedFields = requiredFields.filter(field => {
          const value = applicationData[field as keyof ApplicationData] || 
                       (applicationData.formData && applicationData.formData[field]);
          return typeof value === 'string' ? value.trim() !== '' : Array.isArray(value) ? value.length > 0 : false;
        });
        
        const completeness = Math.round((completedFields.length / requiredFields.length) * 100);
        
        // Generate fallback analysis
        const fallbackAnalysis = this.createApplicationAnalysis({
          summary: `Development fallback analysis for ${applicationData.applicationType} application submitted by ${applicationData.applicantName}. Application appears to be ${completeness}% complete.`,
          keyPoints: [
            `Application type: ${applicationData.applicationType}`,
            `Applicant: ${applicationData.applicantName}`,
            `Email: ${applicationData.applicantEmail}`,
            `Documents uploaded: ${applicationData.documents.length}`,
            `Form fields completed: ${completedFields.length}/${requiredFields.length}`
          ],
          potentialIssues: completeness < 80 ? [
            'Some required fields may be missing',
            'Document uploads may be incomplete',
            'Additional information may be needed'
          ] : [],
          recommendedActions: [
            'Review all form fields for completeness',
            'Ensure all required documents are uploaded',
            'Verify contact information accuracy',
            'Complete any missing required fields'
          ],
          priorityLevel: completeness < 60 ? 'high' : completeness < 80 ? 'medium' : 'low',
          estimatedProcessingTime: '2-3 business days for initial review',
          requiredDocuments: ['Passport', 'Birth certificate', 'Proof of residence', 'Financial documents']
        });
        
        return fallbackAnalysis;
      }

      throw new Error(`Failed to analyze application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate final summary for case conclusion
   */
  async generateFinalSummary(caseData: Case): Promise<FinalSummary> {
    const startTime = Date.now();
    const interactionId = randomUUID();
    const templateId = 'final_summary_v1';
    
    try {
      const templateData = this.buildFinalSummaryData(caseData);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      const parameters = this.promptTemplateService.getTemplateParameters(templateId);
      
      const response = await this.openRouterClient.makeRequest(prompt, parameters);

      // Validate response using template schema
      const validation = this.promptTemplateService.validateResponse<{
        overallSummary: string;
        keyDecisions: string[];
        outcomes: string[];
        processHistory: string[];
        recommendedDecision: 'approved' | 'denied' | 'requires_additional_info';
        supportingRationale: string[];
      }>(templateId, response.content);

      if (!validation.isValid) {
        throw new Error(`Invalid AI response format: ${validation.errors?.join(', ')}`);
      }

      const finalSummary = this.createFinalSummary(validation.data!);
      
      // Log successful AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'generate_final_summary',
        prompt,
        response: response.content,
        model: response.model,
        tokensUsed: response.tokensUsed.input + response.tokensUsed.output,
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date(),
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      return finalSummary;
    } catch (error) {
      const templateData = this.buildFinalSummaryData(caseData);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'generate_final_summary',
        prompt,
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      throw new Error(`Failed to generate final summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate case completeness
   */
  async validateCaseCompleteness(caseData: Case): Promise<CompletenessValidation> {
    const startTime = Date.now();
    const interactionId = randomUUID();
    const templateId = 'completeness_validation_v1';
    
    try {
      const templateData = this.buildCompletenessValidationData(caseData);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      const parameters = this.promptTemplateService.getTemplateParameters(templateId);
      
      const response = await this.openRouterClient.makeRequest(prompt, parameters);

      // Validate response using template schema
      const validation = this.promptTemplateService.validateResponse<{
        isComplete: boolean;
        missingSteps: string[];
        missingDocuments: string[];
        recommendations: string[];
        confidence: number;
      }>(templateId, response.content);

      if (!validation.isValid) {
        throw new Error(`Invalid AI response format: ${validation.errors?.join(', ')}`);
      }

      const completenessValidation = this.createCompletenessValidation(validation.data!);
      
      // Log successful AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'validate_completeness',
        prompt,
        response: response.content,
        model: response.model,
        tokensUsed: response.tokensUsed.input + response.tokensUsed.output,
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date(),
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      return completenessValidation;
    } catch (error) {
      const templateData = this.buildCompletenessValidationData(caseData);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'validate_completeness',
        prompt,
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      throw new Error(`Failed to validate case completeness: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect missing fields in application data
   */
  async detectMissingFields(applicationData: ApplicationData): Promise<MissingFieldsAnalysis> {
    const startTime = Date.now();
    const interactionId = randomUUID();
    const caseId = 'temp-' + randomUUID(); // Temporary ID for logging
    const templateId = 'missing_fields_v1';
    
    try {
      const templateData = this.buildMissingFieldsData(applicationData);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      const parameters = this.promptTemplateService.getTemplateParameters(templateId);
      
      const response = await this.openRouterClient.makeRequest(prompt, parameters);

      // Validate response using template schema
      const validation = this.promptTemplateService.validateResponse<{
        missingFields: {
          fieldName: string;
          fieldType: string;
          importance: 'required' | 'recommended' | 'optional';
          suggestedAction: string;
        }[];
        completenessScore: number;
        priorityActions: string[];
        estimatedCompletionTime: string;
      }>(templateId, response.content);

      if (!validation.isValid) {
        throw new Error(`Invalid AI response format: ${validation.errors?.join(', ')}`);
      }

      const analysis = this.createMissingFieldsAnalysis(validation.data!);
      
      // Log successful AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId,
        operation: 'detect_missing_fields',
        prompt,
        response: response.content,
        model: response.model,
        tokensUsed: response.tokensUsed.input + response.tokensUsed.output,
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date(),
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      return analysis;
    } catch (error) {
      const templateData = this.buildMissingFieldsData(applicationData);
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId,
        operation: 'detect_missing_fields',
        prompt,
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        promptTemplate: templateId,
        promptVersion: '1.0'
      });

      throw new Error(`Failed to detect missing fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods for building template data

  private buildOverallSummaryData(caseData: Case): Record<string, any> {
    return {
      caseId: caseData.id,
      status: caseData.status,
      currentStep: caseData.currentStep,
      applicationType: caseData.applicationData.applicationType,
      applicantName: caseData.applicationData.applicantName,
      submissionDate: caseData.applicationData.submissionDate.toISOString(),
      documents: caseData.applicationData.documents.map(doc => doc.filename).join(', '),
      formData: JSON.stringify(caseData.applicationData.formData, null, 2),
      caseNotes: caseData.notes.map(note => `${note.createdAt.toISOString()}: ${note.content}`).join('\n')
    };
  }

  private buildStepRecommendationData(caseData: Case, step: ProcessStep): Record<string, any> {
    return {
      step,
      caseId: caseData.id,
      status: caseData.status,
      applicationType: caseData.applicationData.applicationType,
      applicantName: caseData.applicationData.applicantName,
      recentSummaries: caseData.aiSummaries.slice(0, 3).map(summary => summary.content).join('\n---\n'),
      recentNotes: caseData.notes.slice(-5).map(note => `${note.createdAt.toISOString()}: ${note.content}`).join('\n')
    };
  }

  private buildApplicationAnalysisData(applicationData: ApplicationData): Record<string, any> {
    return {
      applicationType: applicationData.applicationType,
      applicantName: applicationData.applicantName,
      applicantEmail: applicationData.applicantEmail,
      submissionDate: applicationData.submissionDate.toISOString(),
      documents: applicationData.documents.map(doc => `${doc.filename} (${doc.mimeType})`).join(', '),
      // Preserve form data structure instead of converting to JSON string
      formData: applicationData.formData,
      // Add individual form fields for better AI analysis
      applicantFirm: applicationData.formData?.applicantFirm || '',
      phoneNumber: applicationData.formData?.phoneNumber || '',
      dateOfBirth: applicationData.formData?.dateOfBirth || '',
      streetAddress: applicationData.formData?.streetAddress || '',
      city: applicationData.formData?.city || '',
      stateProvince: applicationData.formData?.stateProvince || '',
      postalCode: applicationData.formData?.postalCode || '',
      country: applicationData.formData?.country || '',
      applicationCategory: applicationData.formData?.applicationCategory || '',
      caseSummary: applicationData.formData?.caseSummary || '',
      documentDescriptions: applicationData.formData?.documentDescriptions || []
    };
  }

  private buildFinalSummaryData(caseData: Case): Record<string, any> {
    return {
      caseId: caseData.id,
      status: caseData.status,
      applicationType: caseData.applicationData.applicationType,
      applicantName: caseData.applicationData.applicantName,
      processHistory: caseData.auditTrail.map(entry => `${entry.timestamp.toISOString()}: ${entry.action}`).join('\n'),
      aiSummaries: caseData.aiSummaries.map(summary => `${summary.generatedAt.toISOString()} (${summary.type}): ${summary.content}`).join('\n---\n'),
      caseNotes: caseData.notes.map(note => `${note.createdAt.toISOString()}: ${note.content}`).join('\n')
    };
  }

  private buildCompletenessValidationData(caseData: Case): Record<string, any> {
    return {
      caseId: caseData.id,
      status: caseData.status,
      currentStep: caseData.currentStep,
      applicationType: caseData.applicationData.applicationType,
      documents: caseData.applicationData.documents.map(doc => doc.filename).join(', '),
      formDataFields: Object.keys(caseData.applicationData.formData).join(', '),
      completedSteps: caseData.auditTrail.map(entry => entry.action).join(', ')
    };
  }

  private buildMissingFieldsData(applicationData: ApplicationData): Record<string, any> {
    return {
      applicationType: applicationData.applicationType,
      applicantName: applicationData.applicantName,
      applicantEmail: applicationData.applicantEmail,
      // Preserve form data structure instead of converting to JSON string
      formData: applicationData.formData,
      documents: applicationData.documents.map(doc => doc.filename).join(', ')
    };
  }

  // Private helper methods for creating response objects

  private createAISummary(data: { content: string; recommendations: string[]; confidence: number }, caseId: string): AISummary {
    return {
      id: randomUUID(),
      caseId,
      type: 'overall',
      content: data.content,
      recommendations: data.recommendations,
      confidence: data.confidence,
      generatedAt: new Date(),
      version: 1
    };
  }

  private createAIRecommendation(data: { recommendations: string[]; priority: 'low' | 'medium' | 'high'; confidence: number }, caseId: string, step: ProcessStep): AIRecommendation {
    return {
      id: randomUUID(),
      caseId,
      step,
      recommendations: data.recommendations,
      priority: data.priority,
      confidence: data.confidence,
      generatedAt: new Date()
    };
  }

  private createApplicationAnalysis(data: {
    summary: string;
    keyPoints: string[];
    potentialIssues: string[];
    recommendedActions: string[];
    priorityLevel: 'low' | 'medium' | 'high' | 'urgent';
    estimatedProcessingTime: string;
    requiredDocuments: string[];
  }): ApplicationAnalysis {
    return {
      summary: data.summary,
      keyPoints: data.keyPoints,
      potentialIssues: data.potentialIssues,
      recommendedActions: data.recommendedActions,
      priorityLevel: data.priorityLevel,
      estimatedProcessingTime: data.estimatedProcessingTime,
      requiredDocuments: data.requiredDocuments,
      analysisTimestamp: new Date()
    };
  }

  private createFinalSummary(data: {
    overallSummary: string;
    keyDecisions: string[];
    outcomes: string[];
    processHistory: string[];
    recommendedDecision: 'approved' | 'denied' | 'requires_additional_info';
    supportingRationale: string[];
  }): FinalSummary {
    return {
      overallSummary: data.overallSummary,
      keyDecisions: data.keyDecisions,
      outcomes: data.outcomes,
      processHistory: data.processHistory,
      recommendedDecision: data.recommendedDecision,
      supportingRationale: data.supportingRationale,
      generatedAt: new Date()
    };
  }

  private createCompletenessValidation(data: {
    isComplete: boolean;
    missingSteps: string[];
    missingDocuments: string[];
    recommendations: string[];
    confidence: number;
  }): CompletenessValidation {
    return {
      isComplete: data.isComplete,
      missingSteps: data.missingSteps as ProcessStep[],
      missingDocuments: data.missingDocuments,
      recommendations: data.recommendations,
      confidence: data.confidence,
      validatedAt: new Date()
    };
  }

  private createMissingFieldsAnalysis(data: {
    missingFields: {
      fieldName: string;
      fieldType: string;
      importance: 'required' | 'recommended' | 'optional';
      suggestedAction: string;
    }[];
    completenessScore: number;
    priorityActions: string[];
    estimatedCompletionTime: string;
  }): MissingFieldsAnalysis {
    return {
      missingFields: data.missingFields,
      completenessScore: data.completenessScore,
      priorityActions: data.priorityActions,
      estimatedCompletionTime: data.estimatedCompletionTime,
      analysisTimestamp: new Date()
    };
  }

  private async logAIInteraction(interaction: AIInteraction): Promise<void> {
    try {
      await this.dataService.logAIInteraction(interaction);
    } catch (error) {
      console.error('Failed to log AI interaction:', error);
      // Don't throw here to avoid breaking the main operation
    }
  }
}