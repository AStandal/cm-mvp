import { randomUUID } from 'crypto';
import { OpenRouterClient } from './OpenRouterClient.js';
import { DataService } from './DataService.js';
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

  constructor(openRouterClient: OpenRouterClient, dataService: DataService) {
    this.openRouterClient = openRouterClient;
    this.dataService = dataService;
  }

  /**
   * Generate an overall summary of the case
   */
  async generateOverallSummary(caseData: Case): Promise<AISummary> {
    const startTime = Date.now();
    const interactionId = randomUUID();
    
    try {
      const prompt = this.buildOverallSummaryPrompt(caseData);
      
      const response = await this.openRouterClient.makeRequest(prompt, {
        max_tokens: 1000,
        temperature: 0.3
      });

      const summary = this.parseOverallSummaryResponse(response.content, caseData.id);
      
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
        promptTemplate: 'overall_summary_v1',
        promptVersion: '1.0'
      });

      return summary;
    } catch (error) {
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'generate_summary',
        prompt: this.buildOverallSummaryPrompt(caseData),
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        promptTemplate: 'overall_summary_v1',
        promptVersion: '1.0'
      });

      throw new Error(`Failed to generate overall summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate step-specific recommendations
   */
  async generateStepRecommendation(caseData: Case, step: ProcessStep): Promise<AIRecommendation> {
    const startTime = Date.now();
    const interactionId = randomUUID();
    
    try {
      const prompt = this.buildStepRecommendationPrompt(caseData, step);
      
      const response = await this.openRouterClient.makeRequest(prompt, {
        max_tokens: 800,
        temperature: 0.4
      });

      const recommendation = this.parseStepRecommendationResponse(response.content, caseData.id, step);
      
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
        promptTemplate: 'step_recommendation_v1',
        promptVersion: '1.0'
      });

      return recommendation;
    } catch (error) {
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'generate_recommendation',
        prompt: this.buildStepRecommendationPrompt(caseData, step),
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        stepContext: step,
        promptTemplate: 'step_recommendation_v1',
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
    
    try {
      const prompt = this.buildApplicationAnalysisPrompt(applicationData);
      
      const response = await this.openRouterClient.makeRequest(prompt, {
        max_tokens: 1200,
        temperature: 0.2
      });

      const analysis = this.parseApplicationAnalysisResponse(response.content);
      
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
        promptTemplate: 'application_analysis_v1',
        promptVersion: '1.0'
      });

      return analysis;
    } catch (error) {
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId,
        operation: 'analyze_application',
        prompt: this.buildApplicationAnalysisPrompt(applicationData),
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        promptTemplate: 'application_analysis_v1',
        promptVersion: '1.0'
      });

      throw new Error(`Failed to analyze application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate final summary for case conclusion
   */
  async generateFinalSummary(caseData: Case): Promise<FinalSummary> {
    const startTime = Date.now();
    const interactionId = randomUUID();
    
    try {
      const prompt = this.buildFinalSummaryPrompt(caseData);
      
      const response = await this.openRouterClient.makeRequest(prompt, {
        max_tokens: 1500,
        temperature: 0.1
      });

      const finalSummary = this.parseFinalSummaryResponse(response.content);
      
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
        promptTemplate: 'final_summary_v1',
        promptVersion: '1.0'
      });

      return finalSummary;
    } catch (error) {
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'generate_final_summary',
        prompt: this.buildFinalSummaryPrompt(caseData),
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        promptTemplate: 'final_summary_v1',
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
    
    try {
      const prompt = this.buildCompletenessValidationPrompt(caseData);
      
      const response = await this.openRouterClient.makeRequest(prompt, {
        max_tokens: 800,
        temperature: 0.2
      });

      const validation = this.parseCompletenessValidationResponse(response.content);
      
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
        promptTemplate: 'completeness_validation_v1',
        promptVersion: '1.0'
      });

      return validation;
    } catch (error) {
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId: caseData.id,
        operation: 'validate_completeness',
        prompt: this.buildCompletenessValidationPrompt(caseData),
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        promptTemplate: 'completeness_validation_v1',
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
    
    try {
      const prompt = this.buildMissingFieldsPrompt(applicationData);
      
      const response = await this.openRouterClient.makeRequest(prompt, {
        max_tokens: 1000,
        temperature: 0.3
      });

      const analysis = this.parseMissingFieldsResponse(response.content);
      
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
        promptTemplate: 'missing_fields_v1',
        promptVersion: '1.0'
      });

      return analysis;
    } catch (error) {
      // Log failed AI interaction
      await this.logAIInteraction({
        id: interactionId,
        caseId,
        operation: 'detect_missing_fields',
        prompt: this.buildMissingFieldsPrompt(applicationData),
        response: '',
        model: 'unknown',
        tokensUsed: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        promptTemplate: 'missing_fields_v1',
        promptVersion: '1.0'
      });

      throw new Error(`Failed to detect missing fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods for building prompts

  private buildOverallSummaryPrompt(caseData: Case): string {
    return `Please analyze the following case data and provide an overall summary.

Case ID: ${caseData.id}
Status: ${caseData.status}
Current Step: ${caseData.currentStep}
Application Type: ${caseData.applicationData.applicationType}
Applicant: ${caseData.applicationData.applicantName}
Submission Date: ${caseData.applicationData.submissionDate.toISOString()}

Documents: ${caseData.applicationData.documents.map(doc => doc.filename).join(', ')}

Form Data: ${JSON.stringify(caseData.applicationData.formData, null, 2)}

Case Notes: ${caseData.notes.map(note => `${note.createdAt.toISOString()}: ${note.content}`).join('\n')}

Please provide:
1. A comprehensive summary of the case
2. Key recommendations for next steps
3. Your confidence level (0-1) in the analysis

Format your response as JSON with the following structure:
{
  "content": "detailed summary here",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 0.85
}`;
  }

  private buildStepRecommendationPrompt(caseData: Case, step: ProcessStep): string {
    return `Please provide specific recommendations for the following case at step: ${step}

Case ID: ${caseData.id}
Current Status: ${caseData.status}
Application Type: ${caseData.applicationData.applicationType}
Applicant: ${caseData.applicationData.applicantName}

Recent AI Summaries: ${caseData.aiSummaries.slice(0, 3).map(summary => summary.content).join('\n---\n')}

Case Notes: ${caseData.notes.slice(-5).map(note => `${note.createdAt.toISOString()}: ${note.content}`).join('\n')}

For step "${step}", please provide:
1. Specific recommendations for this step
2. Priority level (low, medium, high)
3. Confidence in recommendations (0-1)

Format your response as JSON:
{
  "recommendations": ["specific recommendation 1", "specific recommendation 2"],
  "priority": "medium",
  "confidence": 0.8
}`;
  }

  private buildApplicationAnalysisPrompt(applicationData: ApplicationData): string {
    return `Please analyze the following application data:

Application Type: ${applicationData.applicationType}
Applicant: ${applicationData.applicantName}
Email: ${applicationData.applicantEmail}
Submission Date: ${applicationData.submissionDate.toISOString()}

Documents Provided: ${applicationData.documents.map(doc => `${doc.filename} (${doc.mimeType})`).join(', ')}

Form Data: ${JSON.stringify(applicationData.formData, null, 2)}

Please provide:
1. A summary of the application
2. Key points identified
3. Potential issues or concerns
4. Recommended actions
5. Priority level (low, medium, high, urgent)
6. Estimated processing time
7. Required documents that may be missing

Format as JSON:
{
  "summary": "application summary",
  "keyPoints": ["point 1", "point 2"],
  "potentialIssues": ["issue 1", "issue 2"],
  "recommendedActions": ["action 1", "action 2"],
  "priorityLevel": "medium",
  "estimatedProcessingTime": "2-3 business days",
  "requiredDocuments": ["document 1", "document 2"]
}`;
  }

  private buildFinalSummaryPrompt(caseData: Case): string {
    return `Please generate a final summary for the concluded case:

Case ID: ${caseData.id}
Final Status: ${caseData.status}
Application Type: ${caseData.applicationData.applicationType}
Applicant: ${caseData.applicationData.applicantName}

Process History:
${caseData.auditTrail.map(entry => `${entry.timestamp.toISOString()}: ${entry.action}`).join('\n')}

AI Summaries Generated:
${caseData.aiSummaries.map(summary => `${summary.generatedAt.toISOString()} (${summary.type}): ${summary.content}`).join('\n---\n')}

Case Notes:
${caseData.notes.map(note => `${note.createdAt.toISOString()}: ${note.content}`).join('\n')}

Please provide:
1. Overall summary of the case
2. Key decisions made
3. Final outcomes
4. Process history summary
5. Recommended decision (approved, denied, requires_additional_info)
6. Supporting rationale

Format as JSON:
{
  "overallSummary": "comprehensive case summary",
  "keyDecisions": ["decision 1", "decision 2"],
  "outcomes": ["outcome 1", "outcome 2"],
  "processHistory": ["step 1", "step 2"],
  "recommendedDecision": "approved",
  "supportingRationale": ["rationale 1", "rationale 2"]
}`;
  }

  private buildCompletenessValidationPrompt(caseData: Case): string {
    return `Please validate the completeness of this case:

Case ID: ${caseData.id}
Current Status: ${caseData.status}
Current Step: ${caseData.currentStep}
Application Type: ${caseData.applicationData.applicationType}

Documents: ${caseData.applicationData.documents.map(doc => doc.filename).join(', ')}
Form Data Fields: ${Object.keys(caseData.applicationData.formData).join(', ')}

Process Steps Completed: ${caseData.auditTrail.map(entry => entry.action).join(', ')}

Please evaluate:
1. Is the case complete for its current status?
2. What steps might be missing?
3. What documents might be missing?
4. Recommendations for completion
5. Confidence in assessment (0-1)

Format as JSON:
{
  "isComplete": true,
  "missingSteps": ["step1", "step2"],
  "missingDocuments": ["doc1", "doc2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 0.9
}`;
  }

  private buildMissingFieldsPrompt(applicationData: ApplicationData): string {
    return `Please analyze this application for missing fields:

Application Type: ${applicationData.applicationType}
Applicant: ${applicationData.applicantName}
Email: ${applicationData.applicantEmail}

Current Form Data: ${JSON.stringify(applicationData.formData, null, 2)}
Documents Provided: ${applicationData.documents.map(doc => doc.filename).join(', ')}

Please identify:
1. Missing required fields
2. Missing recommended fields
3. Missing optional fields that would be helpful
4. Completeness score (0-100)
5. Priority actions needed
6. Estimated time to complete missing items

Format as JSON:
{
  "missingFields": [
    {
      "fieldName": "field name",
      "fieldType": "text/number/file/etc",
      "importance": "required",
      "suggestedAction": "specific action needed"
    }
  ],
  "completenessScore": 75,
  "priorityActions": ["action 1", "action 2"],
  "estimatedCompletionTime": "1-2 hours"
}`;
  }

  // Private helper methods for parsing responses

  private parseOverallSummaryResponse(response: string, caseId: string): AISummary {
    try {
      const parsed = JSON.parse(response);
      return {
        id: randomUUID(),
        caseId,
        type: 'overall',
        content: parsed.content || response,
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0.5,
        generatedAt: new Date(),
        version: 1
      };
    } catch {
      return {
        id: randomUUID(),
        caseId,
        type: 'overall',
        content: response,
        recommendations: [],
        confidence: 0.5,
        generatedAt: new Date(),
        version: 1
      };
    }
  }

  private parseStepRecommendationResponse(response: string, caseId: string, step: ProcessStep): AIRecommendation {
    try {
      const parsed = JSON.parse(response);
      return {
        id: randomUUID(),
        caseId,
        step,
        recommendations: parsed.recommendations || [response],
        priority: parsed.priority || 'medium',
        confidence: parsed.confidence || 0.5,
        generatedAt: new Date()
      };
    } catch {
      return {
        id: randomUUID(),
        caseId,
        step,
        recommendations: [response],
        priority: 'medium',
        confidence: 0.5,
        generatedAt: new Date()
      };
    }
  }

  private parseApplicationAnalysisResponse(response: string): ApplicationAnalysis {
    try {
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || response,
        keyPoints: parsed.keyPoints || [],
        potentialIssues: parsed.potentialIssues || [],
        recommendedActions: parsed.recommendedActions || [],
        priorityLevel: parsed.priorityLevel || 'medium',
        estimatedProcessingTime: parsed.estimatedProcessingTime || 'Unknown',
        requiredDocuments: parsed.requiredDocuments || [],
        analysisTimestamp: new Date()
      };
    } catch {
      return {
        summary: response,
        keyPoints: [],
        potentialIssues: [],
        recommendedActions: [],
        priorityLevel: 'medium',
        estimatedProcessingTime: 'Unknown',
        requiredDocuments: [],
        analysisTimestamp: new Date()
      };
    }
  }

  private parseFinalSummaryResponse(response: string): FinalSummary {
    try {
      const parsed = JSON.parse(response);
      return {
        overallSummary: parsed.overallSummary || response,
        keyDecisions: parsed.keyDecisions || [],
        outcomes: parsed.outcomes || [],
        processHistory: parsed.processHistory || [],
        recommendedDecision: parsed.recommendedDecision || 'requires_additional_info',
        supportingRationale: parsed.supportingRationale || [],
        generatedAt: new Date()
      };
    } catch {
      return {
        overallSummary: response,
        keyDecisions: [],
        outcomes: [],
        processHistory: [],
        recommendedDecision: 'requires_additional_info',
        supportingRationale: [],
        generatedAt: new Date()
      };
    }
  }

  private parseCompletenessValidationResponse(response: string): CompletenessValidation {
    try {
      const parsed = JSON.parse(response);
      return {
        isComplete: parsed.isComplete || false,
        missingSteps: parsed.missingSteps || [],
        missingDocuments: parsed.missingDocuments || [],
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 0.5,
        validatedAt: new Date()
      };
    } catch {
      return {
        isComplete: false,
        missingSteps: [],
        missingDocuments: [],
        recommendations: [response],
        confidence: 0.5,
        validatedAt: new Date()
      };
    }
  }

  private parseMissingFieldsResponse(response: string): MissingFieldsAnalysis {
    try {
      const parsed = JSON.parse(response);
      return {
        missingFields: parsed.missingFields || [],
        completenessScore: parsed.completenessScore || 50,
        priorityActions: parsed.priorityActions || [],
        estimatedCompletionTime: parsed.estimatedCompletionTime || 'Unknown',
        analysisTimestamp: new Date()
      };
    } catch {
      return {
        missingFields: [],
        completenessScore: 50,
        priorityActions: [response],
        estimatedCompletionTime: 'Unknown',
        analysisTimestamp: new Date()
      };
    }
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