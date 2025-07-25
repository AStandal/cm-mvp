export interface OpenRouterRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  provider?: {
    order: string[];
    allow_fallbacks: boolean;
  };
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  created: number;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider: {
    max_completion_tokens: number;
    is_moderated: boolean;
  };
}

export interface OpenRouterError {
  error: {
    type: string;
    message: string;
    code?: string;
  };
}

export interface ModelConfig {
  modelId: string;
  provider: 'openrouter';
  apiKey: string;
  baseUrl: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  fallbackModel?: string;
  retryAttempts?: number;
  timeoutMs?: number;
}

export interface ModelResponse {
  content: string;
  model: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  cost?: number;
  responseTime: number;
  finishReason: string;
  openRouterResponse?: OpenRouterResponse;
}