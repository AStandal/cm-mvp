import axios from 'axios';
import { 
  OpenRouterRequest, 
  OpenRouterModel,
  ModelConfig,
  ModelResponse 
} from '../types/openrouter.js';

export class OpenRouterClient {
  private client: any;
  private config: ModelConfig;
  private testMode: boolean = false;

  constructor(config: ModelConfig, testMode: boolean = false) {
    this.config = config;
    this.testMode = testMode;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs || 30000,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3001',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'ai-case-management'
      }
    });
  }

  /**
   * Make a completion request to OpenRouter API with retry logic
   */
  async makeRequest(prompt: string, options?: Partial<OpenRouterRequest>): Promise<ModelResponse> {
    const startTime = Date.now();
    const maxRetries = this.config.retryAttempts || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const request: OpenRouterRequest = {
          model: this.config.modelId,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: options?.max_tokens || this.config.maxTokens || 4000,
          temperature: options?.temperature || this.config.temperature || 0.7,
          top_p: options?.top_p || this.config.topP || 1.0,
          frequency_penalty: options?.frequency_penalty || this.config.frequencyPenalty || 0.0,
          presence_penalty: options?.presence_penalty || this.config.presencePenalty || 0.0,
          ...options
        };

        const response = await this.client.post('/chat/completions', request);
        const responseTime = Date.now() - startTime;

        if (!response.data.choices || response.data.choices.length === 0) {
          throw new Error('No choices returned from OpenRouter API');
        }

        const choice = response.data.choices[0];
        if (!choice.message || !choice.message.content) {
          throw new Error('No content in response from OpenRouter API');
        }

        return {
          content: choice.message.content,
          model: response.data.model,
          tokensUsed: {
            input: response.data.usage.prompt_tokens,
            output: response.data.usage.completion_tokens
          },
          responseTime,
          finishReason: choice.finish_reason,
          openRouterResponse: response.data
        };

      } catch (error) {
        lastError = error as Error;
        
        // Log the attempt (skip in test mode to reduce noise)
        if (!this.testMode) {
          console.warn(`OpenRouter API attempt ${attempt}/${maxRetries} failed:`, {
            model: this.config.modelId,
            error: error instanceof Error ? error.message : 'Unknown error',
            attempt
          });
        }

        // If this is the last attempt, don't wait
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying (exponential backoff) - skip in test mode
        if (!this.testMode) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // If we get here, all retries failed
    throw new Error(`OpenRouter API failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Get available models from OpenRouter
   */
  async getModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await this.client.get('/models');
      return response.data.data;
    } catch (error) {
      if (!this.testMode) {
        console.error('Failed to fetch models from OpenRouter:', error);
      }
      throw new Error('Failed to fetch available models');
    }
  }

  /**
   * Test connection to OpenRouter API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('Hello, this is a connection test.');
      return response.content.length > 0;
    } catch (error) {
      if (!this.testMode) {
        console.error('OpenRouter connection test failed:', error);
      }
      return false;
    }
  }

  /**
   * Update model configuration
   */
  updateConfig(newConfig: Partial<ModelConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update axios instance headers if API key or base URL changed
    if (newConfig.apiKey) {
      this.client.defaults.headers['Authorization'] = `Bearer ${newConfig.apiKey}`;
    }
    if (newConfig.baseUrl) {
      this.client.defaults.baseURL = newConfig.baseUrl;
    }
    if (newConfig.timeoutMs) {
      this.client.defaults.timeout = newConfig.timeoutMs;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ModelConfig {
    return { ...this.config };
  }
}

/**
 * Factory function to create OpenRouter client from environment variables
 */
export function createOpenRouterClient(): OpenRouterClient {
  const config: ModelConfig = {
    modelId: process.env.DEFAULT_MODEL || 'x-ai/grok-beta',
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
    retryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
    timeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000')
  };

  if (!config.apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  return new OpenRouterClient(config);
}