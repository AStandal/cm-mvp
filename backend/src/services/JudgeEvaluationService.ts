import { randomUUID } from 'crypto';
import { DatabaseConnection } from '../database/connection.js';
import { OpenRouterClient } from './OpenRouterClient.js';
import { PromptTemplateService } from './PromptTemplateService.js';
import {
  JudgeEvaluationResult,
  EvaluateOutputRequest,
  JudgeEvaluationResultSchema,
  EvaluationModelConfig,
  AvailableEvaluationModel
} from '../types/evaluation.js';
import { AIInteraction } from '../types/index.js';
import { ModelConfig } from '../types/openrouter.js';

export class JudgeEvaluationService {
  private db: DatabaseConnection;
  private openRouterClient: OpenRouterClient;
  private promptTemplateService: PromptTemplateService;

  constructor(openRouterClient: OpenRouterClient, promptTemplateService?: PromptTemplateService) {
    this.db = DatabaseConnection.getInstance();
    this.openRouterClient = openRouterClient;
    this.promptTemplateService = promptTemplateService || new PromptTemplateService();
    
    // Initialize judge evaluation templates
    this.initializeJudgeEvaluationTemplates();
  }

  /**
   * Initialize judge evaluation prompt templates
   */
  private initializeJudgeEvaluationTemplates(): void {
    // Register basic judge evaluation template
    this.promptTemplateService.registerTemplate({
      id: 'judge_evaluation_v1',
      name: 'LLM-as-a-Judge Evaluation',
      version: '1.0',
      description: 'Evaluate AI output quality using structured scoring criteria',
      operation: 'judge_evaluation',
      template: `You are an expert AI evaluator. Your task is to evaluate the quality of an AI-generated response using specific criteria.

**Original Input:**
{{originalInput}}

**AI Response to Evaluate:**
{{aiResponse}}

**Evaluation Criteria:**
Please evaluate the AI response on the following dimensions using a scale of 1-10 (where 1 is very poor and 10 is excellent):

1. **Faithfulness** (1-10): How accurately does the response reflect the information in the input? Does it contain any hallucinations or factual errors?

2. **Completeness** (1-10): How thoroughly does the response address all aspects of the input? Are there any important points missing?

3. **Relevance** (1-10): How well does the response stay on topic and address the specific question or task?

4. **Clarity** (1-10): How clear, well-structured, and easy to understand is the response?

{{#if customCriteria}}
**Additional Criteria:**
{{#each customCriteria}}
5. **{{@key}}** (1-10): {{this}}
{{/each}}
{{/if}}

**Instructions:**
- Provide scores for each criterion
- Give detailed reasoning for each score
- Be objective and consistent in your evaluation
- Consider the context and intended use case

**Response Format (JSON):**
{
  "scores": {
    "overall": <1-10>,
    "faithfulness": <1-10>,
    "completeness": <1-10>,
    "relevance": <1-10>,
    "clarity": <1-10>{{#if customCriteria}},
    "taskSpecific": {
      {{#each customCriteria}}
      "{{@key}}": <1-10>{{#unless @last}},{{/unless}}
      {{/each}}
    }{{/if}}
  },
  "reasoning": {
    "overall": "<detailed explanation for overall score>",
    "faithfulness": "<detailed explanation for faithfulness score>",
    "completeness": "<detailed explanation for completeness score>",
    "relevance": "<detailed explanation for relevance score>",
    "clarity": "<detailed explanation for clarity score>"{{#if customCriteria}},
    "taskSpecific": {
      {{#each customCriteria}}
      "{{@key}}": "<detailed explanation for {{@key}} score>"{{#unless @last}},{{/unless}}
      {{/each}}
    }{{/if}}
  }
}`,
      parameters: {
        temperature: 0.1,
        max_tokens: 2000,
        top_p: 0.9
      },
      schema: JudgeEvaluationResultSchema,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Register bias mitigation template with chain-of-thought
    this.promptTemplateService.registerTemplate({
      id: 'judge_evaluation_cot_v1',
      name: 'LLM-as-a-Judge with Chain-of-Thought',
      version: '1.0',
      description: 'Evaluate AI output quality with chain-of-thought reasoning for bias mitigation',
      operation: 'judge_evaluation',
      template: `You are an expert AI evaluator. Your task is to evaluate the quality of an AI-generated response using structured scoring criteria with careful reasoning.

**Original Input:**
{{originalInput}}

**AI Response to Evaluate:**
{{aiResponse}}

{{#if fewShotExamples}}
**Reference Examples:**
Here are some examples of how to evaluate similar responses:

{{#each fewShotExamples}}
Example {{@index}}:
Input: {{this.input}}
Output: {{this.output}}
Score: {{this.score}}/10
Reasoning: {{this.reasoning}}

{{/each}}
{{/if}}

**Step-by-Step Evaluation Process:**

First, let me carefully analyze the AI response step by step:

1. **Initial Assessment**: What is the AI response trying to accomplish? What was requested in the original input?

2. **Content Analysis**: What specific information, claims, or recommendations does the AI response contain?

3. **Quality Evaluation**: Now I'll evaluate each dimension:

**Faithfulness Analysis:**
- Are all facts and claims in the response accurate and supported by the input?
- Are there any hallucinations or unsupported statements?
- Does the response stay true to the source information?

**Completeness Analysis:**
- Does the response address all parts of the original request?
- Are there any important aspects that were overlooked?
- Is the level of detail appropriate for the request?

**Relevance Analysis:**
- Does the response directly address the question or task?
- Is all information provided relevant to the request?
- Are there any off-topic elements?

**Clarity Analysis:**
- Is the response well-structured and easy to follow?
- Is the language clear and appropriate for the audience?
- Are complex concepts explained adequately?

{{#if customCriteria}}
**Additional Criteria Analysis:**
{{#each customCriteria}}
**{{@key}} Analysis:**
- {{this}}
{{/each}}
{{/if}}

**Final Evaluation (JSON):**
{
  "scores": {
    "overall": <1-10>,
    "faithfulness": <1-10>,
    "completeness": <1-10>,
    "relevance": <1-10>,
    "clarity": <1-10>{{#if customCriteria}},
    "taskSpecific": {
      {{#each customCriteria}}
      "{{@key}}": <1-10>{{#unless @last}},{{/unless}}
      {{/each}}
    }{{/if}}
  },
  "reasoning": {
    "overall": "<comprehensive explanation considering all factors>",
    "faithfulness": "<specific reasoning for faithfulness score>",
    "completeness": "<specific reasoning for completeness score>",
    "relevance": "<specific reasoning for relevance score>",
    "clarity": "<specific reasoning for clarity score>"{{#if customCriteria}},
    "taskSpecific": {
      {{#each customCriteria}}
      "{{@key}}": "<specific reasoning for {{@key}} score>"{{#unless @last}},{{/unless}}
      {{/each}}
    }{{/if}}
  }
}`,
      parameters: {
        temperature: 0.1,
        max_tokens: 3000,
        top_p: 0.9
      },
      schema: JudgeEvaluationResultSchema,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Evaluate a single AI output using LLM-as-a-Judge
   */
  async evaluateOutput(request: EvaluateOutputRequest): Promise<JudgeEvaluationResult> {
    const startTime = Date.now();
    const evaluationId = randomUUID();

    try {
      // Get the AI interaction to evaluate
      const interaction = await this.getAIInteraction(request.input.interactionId);
      if (!interaction) {
        throw new Error(`AI interaction with ID ${request.input.interactionId} not found`);
      }

      // Choose template based on options
      const templateId = request.options?.includeChainOfThought 
        ? 'judge_evaluation_cot_v1' 
        : 'judge_evaluation_v1';

      // Build template data
      const templateData = {
        originalInput: interaction.prompt,
        aiResponse: interaction.response,
        customCriteria: request.input.customCriteria,
        fewShotExamples: request.input.fewShotExamples
      };

      // Generate evaluation prompt
      const prompt = this.promptTemplateService.generatePrompt(templateId, templateData);
      const parameters = this.promptTemplateService.getTemplateParameters(templateId);

      // Make evaluation request with retries
      const response = await this.makeEvaluationRequest(
        prompt, 
        parameters, 
        request.options?.maxRetries || 3,
        request.options?.timeoutMs || 30000
      );

      // Parse and validate response
      const evaluationData = this.parseEvaluationResponse(response.content);
      
      // Calculate overall score if not provided
      if (!evaluationData.scores.overall) {
        evaluationData.scores.overall = this.calculateOverallScore(evaluationData.scores);
      }

      // Create evaluation result
      const evaluationResult: JudgeEvaluationResult = {
        id: evaluationId,
        interactionId: request.input.interactionId,
        evaluationModel: request.input.evaluationModel,
        scores: evaluationData.scores,
        reasoning: evaluationData.reasoning,
        metadata: {
          evaluatedAt: new Date(),
          evaluationDuration: Date.now() - startTime,
          evaluationCost: response.cost,
          evaluationTokens: response.tokensUsed,
          confidence: this.calculateConfidence(evaluationData.scores),
          flags: this.generateQualityFlags(evaluationData.scores)
        }
      };

      // Validate the result
      const validatedResult = JudgeEvaluationResultSchema.parse(evaluationResult);

      // Save to database
      await this.saveEvaluationResult(validatedResult);

      return validatedResult;

    } catch (error) {
      throw new Error(`Failed to evaluate output: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get AI interaction by ID
   */
  private async getAIInteraction(interactionId: string): Promise<AIInteraction | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM ai_interactions WHERE id = ?
      `);
      
      const row = stmt.get(interactionId) as any;
      if (!row) return null;

      return {
        id: row.id,
        caseId: row.case_id,
        operation: row.operation,
        prompt: row.prompt,
        response: row.response,
        model: row.model,
        tokensUsed: row.tokens_used,
        cost: row.cost,
        duration: row.duration,
        success: row.success,
        error: row.error,
        timestamp: new Date(row.timestamp),
        stepContext: row.step_context,
        promptTemplate: row.prompt_template,
        promptVersion: row.prompt_version
      };
    } catch (error) {
      throw new Error(`Failed to get AI interaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make evaluation request with retry logic
   */
  private async makeEvaluationRequest(
    prompt: string, 
    parameters: any, 
    maxRetries: number,
    timeoutMs: number
  ): Promise<{ content: string; cost?: number; tokensUsed?: number }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.openRouterClient.makeRequest(prompt, {
          ...parameters,
          timeout: timeoutMs
        });

        const result: { content: string; cost?: number; tokensUsed?: number } = {
          content: response.content
        };

        if (response.cost !== undefined) {
          result.cost = response.cost;
        }

        if (response.tokensUsed) {
          result.tokensUsed = response.tokensUsed.input + response.tokensUsed.output;
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Evaluation request failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Parse evaluation response from AI
   */
  private parseEvaluationResponse(content: string): { scores: any; reasoning: any } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in evaluation response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.scores || !parsed.reasoning) {
        throw new Error('Invalid evaluation response format: missing scores or reasoning');
      }

      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse evaluation response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate overall score from individual scores
   */
  private calculateOverallScore(scores: any): number {
    const coreScores = [
      scores.faithfulness,
      scores.completeness,
      scores.relevance,
      scores.clarity
    ].filter(score => typeof score === 'number');

    if (coreScores.length === 0) {
      throw new Error('No valid scores found for overall calculation');
    }

    return Math.round(coreScores.reduce((sum, score) => sum + score, 0) / coreScores.length);
  }

  /**
   * Calculate confidence based on score consistency
   */
  private calculateConfidence(scores: any): number {
    const coreScores = [
      scores.faithfulness,
      scores.completeness,
      scores.relevance,
      scores.clarity
    ].filter(score => typeof score === 'number');

    if (coreScores.length === 0) return 0;

    // Calculate standard deviation
    const mean = coreScores.reduce((sum, score) => sum + score, 0) / coreScores.length;
    const variance = coreScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / coreScores.length;
    const stdDev = Math.sqrt(variance);

    // Convert to confidence (lower std dev = higher confidence)
    // Max std dev for scores 1-10 is ~4.5, so we normalize
    const confidence = Math.max(0, 1 - (stdDev / 4.5));
    
    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate quality flags based on scores
   */
  private generateQualityFlags(scores: any): string[] {
    const flags: string[] = [];
    const coreScores = [scores.faithfulness, scores.completeness, scores.relevance, scores.clarity];
    const average = coreScores.reduce((sum, score) => sum + score, 0) / coreScores.length;

    if (average >= 8) flags.push('high_quality');
    if (average <= 4) flags.push('low_quality');
    if (scores.faithfulness <= 3) flags.push('potential_hallucination');
    if (scores.completeness <= 3) flags.push('incomplete_response');
    if (scores.relevance <= 3) flags.push('off_topic');
    if (scores.clarity <= 3) flags.push('unclear_response');

    // Check for score consistency
    const stdDev = Math.sqrt(coreScores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / coreScores.length);
    if (stdDev >= 2) flags.push('inconsistent_quality');
    if (stdDev <= 0.5) flags.push('consistent_quality');

    return flags;
  }

  /**
   * Save evaluation result to database
   */
  private async saveEvaluationResult(result: JudgeEvaluationResult): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO judge_evaluations (
          id, interaction_id, evaluation_model, scores, reasoning, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        result.id,
        result.interactionId,
        result.evaluationModel,
        JSON.stringify(result.scores),
        JSON.stringify(result.reasoning),
        JSON.stringify(result.metadata),
        result.metadata.evaluatedAt.toISOString()
      );
    } catch (error) {
      throw new Error(`Failed to save evaluation result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available evaluation models
   */
  async getAvailableEvaluationModels(): Promise<AvailableEvaluationModel[]> {
    try {
      // Get models from OpenRouter
      const models = await this.openRouterClient.getModels();
      
      // Filter and format for evaluation use
      const evaluationModels: AvailableEvaluationModel[] = models
        .filter(model => 
          // Filter for models suitable for evaluation
          model.id.includes('gpt-4') || 
          model.id.includes('claude') || 
          model.id.includes('grok') ||
          model.id.includes('llama')
        )
        .map(model => ({
          id: model.id,
          name: model.name || model.id,
          provider: this.extractProvider(model.id),
          description: `${model.name || model.id} - Suitable for AI output evaluation`,
          costPer1kTokens: model.pricing?.prompt ? parseFloat(model.pricing.prompt) : undefined,
          maxTokens: model.context_length || undefined,
          supportedCriteria: ['faithfulness', 'completeness', 'relevance', 'clarity'],
          recommended: model.id.includes('gpt-4') || model.id.includes('claude-3')
        }));

      return evaluationModels;
    } catch {
      // Return default models if API call fails
      return this.getDefaultEvaluationModels();
    }
  }

  /**
   * Extract provider from model ID
   */
  private extractProvider(modelId: string): string {
    if (modelId.includes('gpt')) return 'OpenAI';
    if (modelId.includes('claude')) return 'Anthropic';
    if (modelId.includes('grok')) return 'xAI';
    if (modelId.includes('llama')) return 'Meta';
    return 'Unknown';
  }

  /**
   * Get default evaluation models
   */
  private getDefaultEvaluationModels(): AvailableEvaluationModel[] {
    return [
      {
        id: 'openai/gpt-4',
        name: 'GPT-4',
        provider: 'OpenAI',
        description: 'Advanced language model excellent for evaluation tasks',
        costPer1kTokens: 0.03,
        maxTokens: 8192,
        supportedCriteria: ['faithfulness', 'completeness', 'relevance', 'clarity'],
        recommended: true
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        description: 'Highly capable model with strong reasoning abilities',
        costPer1kTokens: 0.015,
        maxTokens: 4096,
        supportedCriteria: ['faithfulness', 'completeness', 'relevance', 'clarity'],
        recommended: true
      },
      {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        description: 'Cost-effective model suitable for basic evaluation tasks',
        costPer1kTokens: 0.001,
        maxTokens: 4096,
        supportedCriteria: ['faithfulness', 'completeness', 'relevance', 'clarity'],
        recommended: false
      }
    ];
  }

  /**
   * Configure evaluation model settings
   */
  configureEvaluationModel(config: EvaluationModelConfig): void {
    // Update OpenRouter client configuration
    const updateConfig: Partial<ModelConfig> = {
      modelId: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    };

    // Only add optional properties if they are defined
    if (config.topP !== undefined) {
      updateConfig.topP = config.topP;
    }
    if (config.frequencyPenalty !== undefined) {
      updateConfig.frequencyPenalty = config.frequencyPenalty;
    }
    if (config.presencePenalty !== undefined) {
      updateConfig.presencePenalty = config.presencePenalty;
    }

    this.openRouterClient.updateConfig(updateConfig);
  }
}