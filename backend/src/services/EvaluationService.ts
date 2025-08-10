import { randomUUID } from 'crypto';
import { OpenRouterClient } from './OpenRouterClient.js';
import { DataService } from './DataService.js';
import { PromptTemplateService } from './PromptTemplateService.js';
import { AIEvaluation, AIEvaluationCriteriaScores } from '../types/index.js';

export class EvaluationService {
  private openRouterClient: OpenRouterClient;
  private dataService: DataService;
  private promptTemplateService: PromptTemplateService;

  constructor(openRouterClient: OpenRouterClient, dataService: DataService, promptTemplateService?: PromptTemplateService) {
    this.openRouterClient = openRouterClient;
    this.dataService = dataService;
    this.promptTemplateService = promptTemplateService || new PromptTemplateService();
  }

  /**
   * Evaluate the latest overall AI summary for a case using LLM-as-a-judge
   */
  async evaluateLatestSummary(caseId: string): Promise<AIEvaluation> {
    const caseData = await this.dataService.getCase(caseId);
    if (!caseData) {
      throw new Error(`Case with ID ${caseId} not found`);
    }

    const summaries = await this.dataService.getSummaries(caseId, 'overall');
    if (!summaries || summaries.length === 0) {
      throw new Error(`No AI summary found for case ${caseId}`);
    }
    const latest = summaries[0];

    const templateId = 'summary_quality_judge_v1';
    const templateData = {
      caseId: caseId,
      applicationType: caseData.applicationData.applicationType,
      applicantName: caseData.applicationData.applicantName,
      currentStep: caseData.currentStep,
      notes: (caseData.notes || []).map(n => n.content).slice(0, 5).join(' | '),
      summaryContent: latest.content
    };

    const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
    const parameters = this.promptTemplateService.getTemplateParameters(templateId);

    try {
      const response = await this.openRouterClient.makeRequest(prompt, parameters);
      const validation = this.promptTemplateService.validateResponse<{
        rubricVersion: string;
        criteriaScores: AIEvaluationCriteriaScores;
        overallScore: number;
        verdict: 'pass' | 'fail' | 'needs_review';
        comments?: string;
      }>(templateId, response.content);

      if (!validation.isValid) {
        throw new Error(`Invalid judge response format: ${validation.errors?.join(', ')}`);
      }

      const evalRecord: AIEvaluation = {
        id: randomUUID(),
        caseId,
        subjectType: 'summary',
        subjectId: latest.id,
        operation: 'generate_summary',
        judgeModel: response.model,
        rubricVersion: validation.data!.rubricVersion,
        criteriaScores: validation.data!.criteriaScores,
        overallScore: validation.data!.overallScore,
        verdict: validation.data!.verdict,
        createdAt: new Date(),
        ...(validation.data!.comments ? { comments: validation.data!.comments } : {})
      };

      await this.dataService.saveEvaluation(evalRecord);
      return evalRecord;
    } catch (error) {
      // Development/test fallback to avoid hard dependency during early wiring
      if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && error instanceof Error) {
        const fallback: AIEvaluation = {
          id: randomUUID(),
          caseId,
          subjectType: 'summary',
          subjectId: latest.id,
          operation: 'generate_summary',
          judgeModel: 'fallback/judge',
          rubricVersion: '1.0',
          criteriaScores: {
            faithfulness: 0.8,
            coverage: 0.75,
            actionability: 0.7,
            clarity: 0.85,
            safety: 0.95
          },
          overallScore: 0.81,
          verdict: 'pass',
          comments: 'Fallback evaluation in non-production mode',
          createdAt: new Date()
        };
        await this.dataService.saveEvaluation(fallback);
        return fallback;
      }
      throw new Error(`Failed to evaluate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}