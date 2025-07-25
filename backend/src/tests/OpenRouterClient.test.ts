import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { OpenRouterClient, createOpenRouterClient } from '../services/OpenRouterClient.js';
import { ModelConfig, OpenRouterResponse } from '../types/openrouter.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('OpenRouterClient', () => {
  let client: OpenRouterClient;
  let mockConfig: ModelConfig;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock axios instance
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      defaults: {
        headers: {},
        baseURL: '',
        timeout: 0
      }
    };

    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);

    mockConfig = {
      modelId: 'x-ai/grok-beta',
      provider: 'openrouter',
      apiKey: 'test-api-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      temperature: 0.7,
      maxTokens: 4000,
      retryAttempts: 3,
      timeoutMs: 30000
    };

    client = new OpenRouterClient(mockConfig, true); // Enable test mode
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      // Clear environment variables for this test
      const originalSiteUrl = process.env.OPENROUTER_SITE_URL;
      const originalAppName = process.env.OPENROUTER_APP_NAME;
      delete process.env.OPENROUTER_SITE_URL;
      delete process.env.OPENROUTER_APP_NAME;

      new OpenRouterClient(mockConfig, true);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: mockConfig.baseUrl,
        timeout: mockConfig.timeoutMs,
        headers: {
          'Authorization': `Bearer ${mockConfig.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3001',
          'X-Title': 'ai-case-management'
        }
      });

      // Restore environment variables
      if (originalSiteUrl) process.env.OPENROUTER_SITE_URL = originalSiteUrl;
      if (originalAppName) process.env.OPENROUTER_APP_NAME = originalAppName;
    });

    it('should use environment variables for headers when available', () => {
      const originalSiteUrl = process.env.OPENROUTER_SITE_URL;
      const originalAppName = process.env.OPENROUTER_APP_NAME;

      process.env.OPENROUTER_SITE_URL = 'https://example.com';
      process.env.OPENROUTER_APP_NAME = 'test-app';

      new OpenRouterClient(mockConfig, true);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: mockConfig.baseUrl,
        timeout: mockConfig.timeoutMs,
        headers: {
          'Authorization': `Bearer ${mockConfig.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://example.com',
          'X-Title': 'test-app'
        }
      });

      // Restore environment variables
      if (originalSiteUrl) {
        process.env.OPENROUTER_SITE_URL = originalSiteUrl;
      } else {
        delete process.env.OPENROUTER_SITE_URL;
      }
      if (originalAppName) {
        process.env.OPENROUTER_APP_NAME = originalAppName;
      } else {
        delete process.env.OPENROUTER_APP_NAME;
      }
    });
  });

  describe('makeRequest', () => {
    const mockResponse: OpenRouterResponse = {
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: 'Test response content'
        },
        finish_reason: 'stop',
        index: 0
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      },
      model: 'x-ai/grok-beta',
      created: Date.now()
    };

    it('should make successful API request', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.makeRequest('Test prompt');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        model: 'x-ai/grok-beta',
        messages: [{
          role: 'user',
          content: 'Test prompt'
        }],
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      });

      expect(result).toEqual({
        content: 'Test response content',
        model: 'x-ai/grok-beta',
        tokensUsed: {
          input: 10,
          output: 20
        },
        responseTime: expect.any(Number),
        finishReason: 'stop',
        openRouterResponse: mockResponse
      });
    });

    it('should use custom options when provided', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      await client.makeRequest('Test prompt', {
        max_tokens: 2000,
        temperature: 0.5,
        top_p: 0.9
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/chat/completions', {
        model: 'x-ai/grok-beta',
        messages: [{
          role: 'user',
          content: 'Test prompt'
        }],
        max_tokens: 2000,
        temperature: 0.5,
        top_p: 0.9,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      });
    });

    it('should handle API errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API error'));

      await expect(client.makeRequest('Test prompt')).rejects.toThrow(
        'OpenRouter API failed after 3 attempts'
      );
    });

    it('should handle empty choices response', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { ...mockResponse, choices: [] }
      });

      await expect(client.makeRequest('Test prompt')).rejects.toThrow(
        'No choices returned from OpenRouter API'
      );
    });

    it('should handle missing content in response', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          ...mockResponse,
          choices: [{
            message: { role: 'assistant', content: '' },
            finish_reason: 'stop',
            index: 0
          }]
        }
      });

      await expect(client.makeRequest('Test prompt')).rejects.toThrow(
        'No content in response from OpenRouter API'
      );
    });
  });

  describe('getModels', () => {
    it('should fetch available models', async () => {
      const mockModels = [
        {
          id: 'x-ai/grok-beta',
          name: 'Grok Beta',
          description: 'Grok model',
          context_length: 8192,
          pricing: { prompt: '0.001', completion: '0.002' },
          top_provider: { max_completion_tokens: 4096, is_moderated: false }
        }
      ];

      mockAxiosInstance.get.mockResolvedValue({ data: { data: mockModels } });

      const result = await client.getModels();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/models');
      expect(result).toEqual(mockModels);
    });

    it('should handle models fetch error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API error'));

      await expect(client.getModels()).rejects.toThrow('Failed to fetch available models');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      const mockResponse: OpenRouterResponse = {
        id: 'test-id',
        choices: [{
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop',
          index: 0
        }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        model: 'x-ai/grok-beta',
        created: Date.now()
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.testConnection();

      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Connection failed'));

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        modelId: 'openai/gpt-4',
        temperature: 0.5
      };

      client.updateConfig(newConfig);

      const config = client.getConfig();
      expect(config.modelId).toBe('openai/gpt-4');
      expect(config.temperature).toBe(0.5);
      expect(config.apiKey).toBe(mockConfig.apiKey); // Should preserve existing values
    });

    it('should update axios headers when API key changes', () => {
      client.updateConfig({ apiKey: 'new-api-key' });

      expect(mockAxiosInstance.defaults.headers['Authorization']).toBe('Bearer new-api-key');
    });

    it('should update axios baseURL when changed', () => {
      client.updateConfig({ baseUrl: 'https://new-url.com' });

      expect(mockAxiosInstance.defaults.baseURL).toBe('https://new-url.com');
    });

    it('should update axios timeout when changed', () => {
      client.updateConfig({ timeoutMs: 60000 });

      expect(mockAxiosInstance.defaults.timeout).toBe(60000);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = client.getConfig();

      expect(config).toEqual(mockConfig);
      expect(config).not.toBe(mockConfig); // Should be a copy
    });
  });
});

describe('createOpenRouterClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Store original environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should create client with environment variables', () => {
    // Set test environment variables
    process.env.OPENROUTER_API_KEY = 'env-api-key';
    process.env.DEFAULT_MODEL = 'openai/gpt-4';
    process.env.TEMPERATURE = '0.5';
    process.env.MAX_TOKENS = '2000';
    process.env.MAX_RETRY_ATTEMPTS = '5';
    process.env.REQUEST_TIMEOUT_MS = '45000';
    delete process.env.OPENROUTER_SITE_URL;
    delete process.env.OPENROUTER_APP_NAME;

    const mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      defaults: { headers: {}, baseURL: '', timeout: 0 }
    };
    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);

    const client = createOpenRouterClient();

    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 45000,
      headers: {
        'Authorization': 'Bearer env-api-key',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'ai-case-management'
      }
    });
  });

  it('should use default values when environment variables are not set', () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    delete process.env.DEFAULT_MODEL;
    delete process.env.TEMPERATURE;
    delete process.env.OPENROUTER_SITE_URL;
    delete process.env.OPENROUTER_APP_NAME;

    const mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      defaults: { headers: {}, baseURL: '', timeout: 0 }
    };
    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);

    const client = createOpenRouterClient();

    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: 30000,
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'ai-case-management'
      }
    });
  });

  it('should throw error when API key is missing', () => {
    delete process.env.OPENROUTER_API_KEY;

    expect(() => createOpenRouterClient()).toThrow(
      'OPENROUTER_API_KEY environment variable is required'
    );
  });
});