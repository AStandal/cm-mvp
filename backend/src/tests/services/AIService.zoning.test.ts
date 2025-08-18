import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIService } from '../../services/AIService.js';
import { OpenRouterClient } from '../../services/OpenRouterClient.js';
import { DataService } from '../../services/DataService.js';
import { PromptTemplateService } from '../../services/PromptTemplateService.js';
import { DocumentProcessor } from '../../services/DocumentProcessor.js';
import { DocumentMetadata, ZoningPlan, BatchProcessingResult } from '../../types/index.js';

// Mock dependencies
vi.mock('../../services/OpenRouterClient.js');
vi.mock('../../services/DataService.js');
vi.mock('../../services/PromptTemplateService.js');
vi.mock('../../services/DocumentProcessor.js');

const mockOpenRouterClient = vi.mocked(OpenRouterClient);
const mockDataService = vi.mocked(DataService);
const mockPromptTemplateService = vi.mocked(PromptTemplateService);
const mockDocumentProcessor = vi.mocked(DocumentProcessor);

describe('AIService - Zoning Extensions', () => {
  let aiService: AIService;
  let openRouterClient: OpenRouterClient;
  let dataService: DataService;
  let promptTemplateService: PromptTemplateService;

  beforeEach(() => {
    openRouterClient = new mockOpenRouterClient() as any;
    dataService = new mockDataService() as any;
    promptTemplateService = new mockPromptTemplateService() as any;
    
    aiService = new AIService(openRouterClient, dataService, promptTemplateService);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('extractZoningRequirements', () => {
    const mockDocumentText = 'Sample zoning document text content...';
    const mockDocumentMetadata: DocumentMetadata = {
      fileName: 'zoning-plan.pdf',
      filePath: '/test/zoning-plan.pdf',
      fileSize: 2048,
      pageCount: 5,
      documentHash: 'abc123hash'
    };

    it('should extract zoning requirements successfully', async () => {
      const mockResponse = {
        content: JSON.stringify({
          name: 'Test Zoning Plan',
          jurisdiction: 'Test City',
          requirements: []
        }),
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 200 }
      };

      vi.mocked(openRouterClient.makeRequest).mockResolvedValue(mockResponse);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      const result = await aiService.extractZoningRequirements(mockDocumentText, mockDocumentMetadata);

      expect(result).toBeDefined();
      expect(result.name).toBe('zoning-plan');
      expect(result.documentPath).toBe(mockDocumentMetadata.filePath);
      expect(result.documentHash).toBe(mockDocumentMetadata.documentHash);
      expect(result.extractionMetadata.aiModel).toBe('gpt-4');
      expect(result.extractionMetadata.tokensUsed).toBe(300);
      expect(result.extractionMetadata.documentPages).toBe(5);

      expect(openRouterClient.makeRequest).toHaveBeenCalledWith(
        expect.stringContaining('Extract zoning requirements'),
        expect.objectContaining({
          temperature: 0.3,
          max_tokens: 4000
        })
      );

      expect(dataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'extract_zoning_requirements',
          success: true,
          model: 'gpt-4',
          tokensUsed: 300
        })
      );
    });

    it('should handle LLM request failures', async () => {
      const mockError = new Error('LLM service unavailable');
      
      vi.mocked(openRouterClient.makeRequest).mockRejectedValue(mockError);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      await expect(aiService.extractZoningRequirements(mockDocumentText, mockDocumentMetadata))
        .rejects.toThrow('Failed to extract zoning requirements: LLM service unavailable');

      expect(dataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'extract_zoning_requirements',
          success: false,
          error: 'LLM service unavailable'
        })
      );
    });

    it('should truncate long document text for LLM processing', async () => {
      const longText = 'a'.repeat(10000);
      const mockResponse = {
        content: JSON.stringify({ name: 'Test Plan' }),
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 200 }
      };

      vi.mocked(openRouterClient.makeRequest).mockResolvedValue(mockResponse);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      await aiService.extractZoningRequirements(longText, mockDocumentMetadata);

      expect(openRouterClient.makeRequest).toHaveBeenCalledWith(
        expect.stringContaining(longText.substring(0, 8000)),
        expect.any(Object)
      );
    });

    it('should create proper zoning plan structure', async () => {
      const mockResponse = {
        content: JSON.stringify({ name: 'Test Plan' }),
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 200 }
      };

      vi.mocked(openRouterClient.makeRequest).mockResolvedValue(mockResponse);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      const result = await aiService.extractZoningRequirements(mockDocumentText, mockDocumentMetadata);

      expect(result).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        documentPath: mockDocumentMetadata.filePath,
        documentHash: mockDocumentMetadata.documentHash,
        jurisdiction: expect.any(String),
        effectiveDate: expect.any(Date),
        version: expect.any(String),
        requirements: expect.any(Array),
        extractionMetadata: expect.objectContaining({
          extractedAt: expect.any(Date),
          aiModel: 'gpt-4',
          promptTemplate: 'zoning_requirements_extraction_v1',
          promptVersion: '1.0',
          confidence: expect.any(Number),
          tokensUsed: 300,
          processingDuration: expect.any(Number),
          documentPages: 5,
          extractedRequirementsCount: 0
        }),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });
  });

  describe('batchProcessZoningDocuments', () => {
    const mockFolderPath = '/test/zoning-docs';

    it('should process multiple documents successfully', async () => {
      const mockResults = [
        { documentPath: '/test/doc1.pdf', success: true, processingTime: 1000 },
        { documentPath: '/test/doc2.pdf', success: true, processingTime: 1500 }
      ];

      const mockDocumentProcessor = {
        processFolder: vi.fn().mockResolvedValue(mockResults),
        extractTextFromPDF: vi.fn().mockResolvedValue('Sample text'),
        createDocumentMetadata: vi.fn().mockResolvedValue({
          fileName: 'test.pdf',
          filePath: '/test/test.pdf',
          fileSize: 1024,
          pageCount: 2,
          documentHash: 'hash123'
        })
      };

      // Mock dynamic import
      vi.doMock('../../services/DocumentProcessor.js', () => ({
        DocumentProcessor: vi.fn(() => mockDocumentProcessor)
      }));

      const mockResponse = {
        content: JSON.stringify({ name: 'Test Plan' }),
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 200 }
      };

      vi.mocked(openRouterClient.makeRequest).mockResolvedValue(mockResponse);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      const result = await aiService.batchProcessZoningDocuments(mockFolderPath);

      expect(result).toMatchObject({
        totalDocuments: 2,
        successfulExtractions: 2,
        failedExtractions: 0,
        results: expect.arrayContaining([
          expect.objectContaining({
            documentPath: '/test/doc1.pdf',
            success: true,
            zoningPlan: expect.any(Object)
          }),
          expect.objectContaining({
            documentPath: '/test/doc2.pdf',
            success: true,
            zoningPlan: expect.any(Object)
          })
        ]),
        totalProcessingTime: expect.any(Number)
      });
    });

    it('should handle mixed success and failure scenarios', async () => {
      const mockResults = [
        { documentPath: '/test/doc1.pdf', success: true, processingTime: 1000 },
        { documentPath: '/test/doc2.pdf', success: false, error: 'Invalid PDF', processingTime: 500 }
      ];

      const mockDocumentProcessor = {
        processFolder: vi.fn().mockResolvedValue(mockResults),
        extractTextFromPDF: vi.fn().mockResolvedValue('Sample text'),
        createDocumentMetadata: vi.fn().mockResolvedValue({
          fileName: 'test.pdf',
          filePath: '/test/test.pdf',
          fileSize: 1024,
          pageCount: 2,
          documentHash: 'hash123'
        })
      };

      vi.doMock('../../services/DocumentProcessor.js', () => ({
        DocumentProcessor: vi.fn(() => mockDocumentProcessor)
      }));

      const mockResponse = {
        content: JSON.stringify({ name: 'Test Plan' }),
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 200 }
      };

      vi.mocked(openRouterClient.makeRequest).mockResolvedValue(mockResponse);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      const result = await aiService.batchProcessZoningDocuments(mockFolderPath);

      expect(result.totalDocuments).toBe(2);
      expect(result.successfulExtractions).toBe(1);
      expect(result.failedExtractions).toBe(1);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Invalid PDF');
    });

    it('should handle document processor failures', async () => {
      const mockDocumentProcessor = {
        processFolder: vi.fn().mockRejectedValue(new Error('Folder not found'))
      };

      vi.doMock('../../services/DocumentProcessor.js', () => ({
        DocumentProcessor: vi.fn(() => mockDocumentProcessor)
      }));

      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      await expect(aiService.batchProcessZoningDocuments(mockFolderPath))
        .rejects.toThrow('Failed to batch process zoning documents: Folder not found');

      expect(dataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'batch_process_zoning',
          success: false,
          error: 'Folder not found'
        })
      );
    });

    it('should handle LLM failures during batch processing', async () => {
      const mockResults = [
        { documentPath: '/test/doc1.pdf', success: true, processingTime: 1000 }
      ];

      const mockDocumentProcessor = {
        processFolder: vi.fn().mockResolvedValue(mockResults),
        extractTextFromPDF: vi.fn().mockResolvedValue('Sample text'),
        createDocumentMetadata: vi.fn().mockResolvedValue({
          fileName: 'test.pdf',
          filePath: '/test/test.pdf',
          fileSize: 1024,
          pageCount: 2,
          documentHash: 'hash123'
        })
      };

      vi.doMock('../../services/DocumentProcessor.js', () => ({
        DocumentProcessor: vi.fn(() => mockDocumentProcessor)
      }));

      vi.mocked(openRouterClient.makeRequest).mockRejectedValue(new Error('LLM timeout'));
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      const result = await aiService.batchProcessZoningDocuments(mockFolderPath);

      expect(result.totalDocuments).toBe(1);
      expect(result.successfulExtractions).toBe(0);
      expect(result.failedExtractions).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('LLM timeout');
    });

    it('should log AI interactions for batch processing', async () => {
      const mockResults = [
        { documentPath: '/test/doc1.pdf', success: true, processingTime: 1000 }
      ];

      const mockDocumentProcessor = {
        processFolder: vi.fn().mockResolvedValue(mockResults),
        extractTextFromPDF: vi.fn().mockResolvedValue('Sample text'),
        createDocumentMetadata: vi.fn().mockResolvedValue({
          fileName: 'test.pdf',
          filePath: '/test/test.pdf',
          fileSize: 1024,
          pageCount: 2,
          documentHash: 'hash123'
        })
      };

      vi.doMock('../../services/DocumentProcessor.js', () => ({
        DocumentProcessor: vi.fn(() => mockDocumentProcessor)
      }));

      const mockResponse = {
        content: JSON.stringify({ name: 'Test Plan' }),
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 200 }
      };

      vi.mocked(openRouterClient.makeRequest).mockResolvedValue(mockResponse);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      await aiService.batchProcessZoningDocuments(mockFolderPath);

      expect(dataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'batch_process_zoning',
          success: true,
          caseId: expect.stringContaining('batch-zoning-')
        })
      );
    });

    it('should calculate total processing time correctly', async () => {
      const mockResults = [
        { documentPath: '/test/doc1.pdf', success: true, processingTime: 1000 },
        { documentPath: '/test/doc2.pdf', success: true, processingTime: 1500 }
      ];

      const mockDocumentProcessor = {
        processFolder: vi.fn().mockResolvedValue(mockResults),
        extractTextFromPDF: vi.fn().mockResolvedValue('Sample text'),
        createDocumentMetadata: vi.fn().mockResolvedValue({
          fileName: 'test.pdf',
          filePath: '/test/test.pdf',
          fileSize: 1024,
          pageCount: 2,
          documentHash: 'hash123'
        })
      };

      vi.doMock('../../services/DocumentProcessor.js', () => ({
        DocumentProcessor: vi.fn(() => mockDocumentProcessor)
      }));

      const mockResponse = {
        content: JSON.stringify({ name: 'Test Plan' }),
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 200 }
      };

      vi.mocked(openRouterClient.makeRequest).mockResolvedValue(mockResponse);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      const result = await aiService.batchProcessZoningDocuments(mockFolderPath);

      expect(result.totalProcessingTime).toBeGreaterThan(0);
      expect(typeof result.totalProcessingTime).toBe('number');
    });
  });

  describe('error handling and retry logic', () => {
    const mockDocumentText = 'Sample text';
    const mockDocumentMetadata: DocumentMetadata = {
      fileName: 'test.pdf',
      filePath: '/test/test.pdf',
      fileSize: 1024,
      pageCount: 1,
      documentHash: 'hash123'
    };

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      
      vi.mocked(openRouterClient.makeRequest).mockRejectedValue(rateLimitError);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      await expect(aiService.extractZoningRequirements(mockDocumentText, mockDocumentMetadata))
        .rejects.toThrow('Failed to extract zoning requirements: Rate limit exceeded');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      
      vi.mocked(openRouterClient.makeRequest).mockRejectedValue(timeoutError);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      await expect(aiService.extractZoningRequirements(mockDocumentText, mockDocumentMetadata))
        .rejects.toThrow('Failed to extract zoning requirements: Request timeout');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('401 Unauthorized');
      
      vi.mocked(openRouterClient.makeRequest).mockRejectedValue(authError);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      await expect(aiService.extractZoningRequirements(mockDocumentText, mockDocumentMetadata))
        .rejects.toThrow('Failed to extract zoning requirements: 401 Unauthorized');
    });
  });

  describe('AI interaction logging', () => {
    const mockDocumentText = 'Sample text';
    const mockDocumentMetadata: DocumentMetadata = {
      fileName: 'test.pdf',
      filePath: '/test/test.pdf',
      fileSize: 1024,
      pageCount: 1,
      documentHash: 'hash123'
    };

    it('should log successful interactions with correct data', async () => {
      const mockResponse = {
        content: JSON.stringify({ name: 'Test Plan' }),
        model: 'gpt-4',
        tokensUsed: { input: 100, output: 200 }
      };

      vi.mocked(openRouterClient.makeRequest).mockResolvedValue(mockResponse);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      await aiService.extractZoningRequirements(mockDocumentText, mockDocumentMetadata);

      expect(dataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          caseId: expect.stringContaining('zoning-'),
          operation: 'extract_zoning_requirements',
          prompt: expect.stringContaining('Extract zoning requirements'),
          response: mockResponse.content,
          model: 'gpt-4',
          tokensUsed: 300,
          duration: expect.any(Number),
          success: true,
          timestamp: expect.any(Date),
          promptTemplate: 'zoning_requirements_extraction_v1',
          promptVersion: '1.0'
        })
      );
    });

    it('should log failed interactions with error details', async () => {
      const mockError = new Error('Processing failed');
      
      vi.mocked(openRouterClient.makeRequest).mockRejectedValue(mockError);
      vi.mocked(dataService.logAIInteraction).mockResolvedValue();

      await expect(aiService.extractZoningRequirements(mockDocumentText, mockDocumentMetadata))
        .rejects.toThrow();

      expect(dataService.logAIInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'extract_zoning_requirements',
          success: false,
          error: 'Processing failed',
          model: 'unknown',
          tokensUsed: 0
        })
      );
    });
  });
});