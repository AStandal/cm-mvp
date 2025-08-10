import { CaseService } from '../services/CaseService.js';
import { DataService } from '../services/DataService.js';
import { AIService } from '../services/AIService.js';
import { OpenRouterClient } from '../services/OpenRouterClient.js';
import { PromptTemplateService } from '../services/PromptTemplateService.js';
import { EvaluationService } from '../services/EvaluationService.js';

export interface ServiceContainer {
  caseService: CaseService;
  dataService: DataService;
  aiService: AIService;
  evaluationService: EvaluationService;
}

export function createServices(): ServiceContainer {
  // Initialize services
  const dataService = new DataService();

  // Create OpenRouter configuration
  const openRouterConfig = {
    modelId: process.env.DEFAULT_MODEL || 'openai/gpt-oss-20b:free',
    provider: 'openrouter' as const,
    apiKey: process.env.OPENROUTER_API_KEY || 'test-key',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    timeoutMs: 30000
  };

  const openRouterClient = new OpenRouterClient(openRouterConfig, process.env.NODE_ENV === 'test');
  const promptTemplateService = new PromptTemplateService();
  const aiService = new AIService(openRouterClient, dataService, promptTemplateService);
  const evaluationService = new EvaluationService(openRouterClient, dataService, promptTemplateService);
  const caseService = new CaseService(dataService, aiService);

  return {
    caseService,
    dataService,
    aiService,
    evaluationService
  };
}

// Global service container - lazy initialized
let serviceContainer: ServiceContainer | null = null;

export function getServices(): ServiceContainer {
  if (!serviceContainer) {
    serviceContainer = createServices();
  }
  return serviceContainer;
}

// For testing - allows injection of mock services
export function setServices(services: ServiceContainer): void {
  serviceContainer = services;
}

// Reset services (useful for testing)
export function resetServices(): void {
  serviceContainer = null;
}