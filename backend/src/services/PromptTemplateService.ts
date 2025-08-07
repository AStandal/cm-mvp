import { randomUUID } from 'crypto';
import { z } from 'zod';

// Template metadata interface
export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  operation: string;
  template: string;
  parameters: Record<string, any>;
  schema: z.ZodSchema;
  createdAt: Date;
  updatedAt: Date;
}

// Template registry type
type TemplateRegistry = Map<string, PromptTemplate>;

// JSON Schema definitions for AI responses
const OverallSummarySchema = z.object({
  content: z.string().min(10, 'Summary content must be at least 10 characters'),
  recommendations: z.array(z.string()).min(1, 'At least one recommendation is required'),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1')
});

const StepRecommendationSchema = z.object({
  recommendations: z.array(z.string()).min(1, 'At least one recommendation is required'),
  priority: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1')
});

const ApplicationAnalysisSchema = z.object({
  summary: z.string().min(10, 'Summary must be at least 10 characters'),
  keyPoints: z.array(z.string()),
  potentialIssues: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  priorityLevel: z.enum(['low', 'medium', 'high', 'urgent']),
  estimatedProcessingTime: z.string().min(1, 'Processing time estimate is required'),
  requiredDocuments: z.array(z.string())
});

const FinalSummarySchema = z.object({
  overallSummary: z.string().min(20, 'Final summary must be at least 20 characters'),
  keyDecisions: z.array(z.string()),
  outcomes: z.array(z.string()),
  processHistory: z.array(z.string()),
  recommendedDecision: z.enum(['approved', 'denied', 'requires_additional_info']),
  supportingRationale: z.array(z.string()).min(1, 'At least one rationale is required')
});

const CompletenessValidationSchema = z.object({
  isComplete: z.boolean(),
  missingSteps: z.array(z.string()),
  missingDocuments: z.array(z.string()),
  recommendations: z.array(z.string()),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1')
});

const MissingFieldsSchema = z.object({
  missingFields: z.array(z.object({
    fieldName: z.string().min(1, 'Field name is required'),
    fieldType: z.string().min(1, 'Field type is required'),
    importance: z.enum(['required', 'recommended', 'optional']),
    suggestedAction: z.string().min(1, 'Suggested action is required')
  })),
  completenessScore: z.number().min(0).max(100, 'Completeness score must be between 0 and 100'),
  priorityActions: z.array(z.string()),
  estimatedCompletionTime: z.string().min(1, 'Completion time estimate is required')
});

export class PromptTemplateService {
  private templates: TemplateRegistry = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default prompt templates
   */
  private initializeDefaultTemplates(): void {
    // Overall Summary Template
    this.registerTemplate({
      id: 'overall_summary_v1',
      name: 'Overall Case Summary',
      version: '1.0',
      description: 'Generate comprehensive case summary with recommendations',
      operation: 'generate_summary',
      template: `Please analyze the following case data and provide an overall summary.

Case ID: {{caseId}}
Status: {{status}}
Current Step: {{currentStep}}
Application Type: {{applicationType}}
Applicant: {{applicantName}}
Submission Date: {{submissionDate}}

Documents: {{documents}}

Form Data: {{formData}}

Case Notes: {{caseNotes}}

Please provide:
1. A comprehensive summary of the case
2. Key recommendations for next steps
3. Your confidence level (0-1) in the analysis

Format your response as JSON with the following structure:
{
  "content": "detailed summary here",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "confidence": 0.85
}`,
      parameters: {
        max_tokens: 1000,
        temperature: 0.3
      },
      schema: OverallSummarySchema,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Step Recommendation Template
    this.registerTemplate({
      id: 'step_recommendation_v1',
      name: 'Step-Specific Recommendations',
      version: '1.0',
      description: 'Generate recommendations for specific process steps',
      operation: 'generate_recommendation',
      template: `Please provide specific recommendations for the following case at step: {{step}}

Case ID: {{caseId}}
Current Status: {{status}}
Application Type: {{applicationType}}
Applicant: {{applicantName}}

Recent AI Summaries: {{recentSummaries}}

Case Notes: {{recentNotes}}

For step "{{step}}", please provide:
1. Specific recommendations for this step
2. Priority level (low, medium, high)
3. Confidence in recommendations (0-1)

Format your response as JSON:
{
  "recommendations": ["specific recommendation 1", "specific recommendation 2"],
  "priority": "medium",
  "confidence": 0.8
}`,
      parameters: {
        max_tokens: 800,
        temperature: 0.4
      },
      schema: StepRecommendationSchema,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Application Analysis Template
    this.registerTemplate({
      id: 'application_analysis_v1',
      name: 'Application Analysis',
      version: '1.0',
      description: 'Analyze new application submissions',
      operation: 'analyze_application',
      template: `Please analyze the following application data:

Application Type: {{applicationType}}
Applicant: {{applicantName}}
Email: {{applicantEmail}}
Submission Date: {{submissionDate}}

Documents Provided: {{documents}}

Form Data: {{formData}}

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
}`,
      parameters: {
        max_tokens: 1200,
        temperature: 0.2
      },
      schema: ApplicationAnalysisSchema,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Final Summary Template
    this.registerTemplate({
      id: 'final_summary_v1',
      name: 'Final Case Summary',
      version: '1.0',
      description: 'Generate final summary for case conclusion',
      operation: 'generate_final_summary',
      template: `Please generate a final summary for the concluded case:

Case ID: {{caseId}}
Final Status: {{status}}
Application Type: {{applicationType}}
Applicant: {{applicantName}}

Process History:
{{processHistory}}

AI Summaries Generated:
{{aiSummaries}}

Case Notes:
{{caseNotes}}

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
}`,
      parameters: {
        max_tokens: 1500,
        temperature: 0.1
      },
      schema: FinalSummarySchema,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Completeness Validation Template
    this.registerTemplate({
      id: 'completeness_validation_v1',
      name: 'Case Completeness Validation',
      version: '1.0',
      description: 'Validate case completeness before conclusion',
      operation: 'validate_completeness',
      template: `Please validate the completeness of this case:

Case ID: {{caseId}}
Current Status: {{status}}
Current Step: {{currentStep}}
Application Type: {{applicationType}}

Documents: {{documents}}
Form Data Fields: {{formDataFields}}

Process Steps Completed: {{completedSteps}}

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
}`,
      parameters: {
        max_tokens: 800,
        temperature: 0.2
      },
      schema: CompletenessValidationSchema,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Missing Fields Template
    this.registerTemplate({
      id: 'missing_fields_v1',
      name: 'Missing Fields Detection',
      version: '1.0',
      description: 'Detect missing fields in application data',
      operation: 'detect_missing_fields',
      template: `Please analyze this application for missing fields:

Application Type: {{applicationType}}
Applicant: {{applicantName}}
Email: {{applicantEmail}}

Current Form Data: {{formData}}
Documents Provided: {{documents}}

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
}`,
      parameters: {
        max_tokens: 1000,
        temperature: 0.3
      },
      schema: MissingFieldsSchema,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Register a new prompt template
   */
  registerTemplate(template: Omit<PromptTemplate, 'id'> & { id?: string }): void {
    const templateWithId: PromptTemplate = {
      ...template,
      id: template.id || randomUUID(),
      updatedAt: template.updatedAt || new Date()
    };
    
    this.templates.set(templateWithId.id, templateWithId);
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates for a specific operation
   */
  getTemplatesByOperation(operation: string): PromptTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.operation === operation);
  }

  /**
   * Get the latest version of a template by name
   */
  getLatestTemplate(templateName: string): PromptTemplate | undefined {
    const templates = Array.from(this.templates.values())
      .filter(template => template.name === templateName)
      .sort((a, b) => {
        // First sort by updatedAt, then by createdAt as fallback
        const timeDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    
    return templates[0];
  }

  /**
   * Generate a prompt from template with data substitution
   */
  generatePrompt(templateId: string, data: Record<string, any>): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let prompt = template.template;
    
    // Replace template variables with actual data
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      const replacement = this.formatValue(value);
      prompt = prompt.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
    }

    // Replace any remaining placeholders with empty strings
    prompt = prompt.replace(/\{\{[^}]+\}\}/g, '');

    return prompt;
  }

  /**
   * Validate AI response against template schema
   */
  validateResponse<T>(templateId: string, response: string): { isValid: boolean; data?: T; errors?: string[] } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return { isValid: false, errors: [`Template not found: ${templateId}`] };
    }

    try {
      // Clean the response to extract JSON from markdown if needed
      const cleanedResponse = this.extractJSONFromResponse(response);
      const parsed = JSON.parse(cleanedResponse);
      const result = template.schema.safeParse(parsed);
      
      if (result.success) {
        return { isValid: true, data: result.data as T };
      } else {
        const errors = result.error.issues?.map((err: any) => {
          const path = err.path.length > 0 ? err.path.join('.') : 'root';
          return `${path}: ${err.message}`;
        }) || ['Validation failed'];
        return { isValid: false, errors };
      }
    } catch (parseError) {
      return { 
        isValid: false, 
        errors: [`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`] 
      };
    }
  }

  /**
   * Extract JSON from markdown-formatted responses
   */
  private extractJSONFromResponse(response: string): string {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // If the response is still wrapped in markdown, try to extract just the JSON part
    if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
      cleaned = cleaned.slice(3, -3).trim();
    }
    
    return cleaned;
  }

  /**
   * Get template parameters for AI service configuration
   */
  getTemplateParameters(templateId: string): Record<string, any> {
    const template = this.getTemplate(templateId);
    return template?.parameters || {};
  }

  /**
   * List all available templates
   */
  listTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Update an existing template
   */
  updateTemplate(templateId: string, updates: Partial<PromptTemplate>): void {
    const existing = this.getTemplate(templateId);
    if (!existing) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const updated: PromptTemplate = {
      ...existing,
      ...updates,
      id: templateId, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    this.templates.set(templateId, updated);
  }

  /**
   * Delete a template
   */
  deleteTemplate(templateId: string): boolean {
    return this.templates.delete(templateId);
  }

  /**
   * Format values for template substitution
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.formatValue(item)).join(', ');
    }
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        // Handle circular references
        return '[Circular Reference]';
      }
    }
    
    return String(value);
  }
}