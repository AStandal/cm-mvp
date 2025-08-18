import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DocumentProcessor } from '../../services/DocumentProcessor.js';
import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('pdf-parse');
vi.mock('crypto', () => {
  const hashMap = new Map();
  let hashCounter = 0;
  
  return {
    default: {
      createHash: vi.fn(() => {
        let content = '';
        return {
          update: vi.fn((data) => {
            content = data.toString();
          }),
          digest: vi.fn(() => {
            if (!hashMap.has(content)) {
              hashMap.set(content, `hash${hashCounter++}`);
            }
            return hashMap.get(content);
          })
        };
      })
    },
    createHash: vi.fn(() => {
      let content = '';
      return {
        update: vi.fn((data) => {
          content = data.toString();
        }),
        digest: vi.fn(() => {
          if (!hashMap.has(content)) {
            hashMap.set(content, `hash${hashCounter++}`);
          }
          return hashMap.get(content);
        })
      };
    })
  };
});

const mockFs = vi.mocked(fs);
const mockPdfParse = vi.mocked(pdfParse);

describe('DocumentProcessor', () => {
  let documentProcessor: DocumentProcessor;

  beforeEach(() => {
    documentProcessor = new DocumentProcessor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('extractTextFromPDF', () => {
    it('should extract text from a valid PDF file', async () => {
      const filePath = '/test/document.pdf';
      const mockBuffer = Buffer.from('mock pdf content');
      const mockPdfData = {
        text: 'Extracted PDF text content',
        numpages: 5
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockBuffer);
      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await documentProcessor.extractTextFromPDF(filePath);

      expect(result).toBe('Extracted PDF text content');
      expect(mockFs.access).toHaveBeenCalledWith(filePath, fs.constants.R_OK);
      expect(mockFs.readFile).toHaveBeenCalledWith(filePath);
      expect(mockPdfParse).toHaveBeenCalledWith(mockBuffer);
    });

    it('should throw error when file is not accessible', async () => {
      const filePath = '/test/nonexistent.pdf';
      
      mockFs.access.mockRejectedValue(new Error('File not found'));

      await expect(documentProcessor.extractTextFromPDF(filePath))
        .rejects.toThrow('Failed to extract text from PDF: File not found');
    });

    it('should throw error when PDF contains no extractable text', async () => {
      const filePath = '/test/empty.pdf';
      const mockBuffer = Buffer.from('mock pdf content');
      const mockPdfData = {
        text: '',
        numpages: 1
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockBuffer);
      mockPdfParse.mockResolvedValue(mockPdfData);

      await expect(documentProcessor.extractTextFromPDF(filePath))
        .rejects.toThrow('Failed to extract text from PDF: PDF contains no extractable text');
    });

    it('should throw error when PDF parsing fails', async () => {
      const filePath = '/test/corrupt.pdf';
      const mockBuffer = Buffer.from('mock pdf content');

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockBuffer);
      mockPdfParse.mockRejectedValue(new Error('Invalid PDF format'));

      await expect(documentProcessor.extractTextFromPDF(filePath))
        .rejects.toThrow('Failed to extract text from PDF: Invalid PDF format');
    });
  });

  describe('validateDocument', () => {
    it('should validate a correct PDF file', async () => {
      const filePath = '/test/valid.pdf';
      const mockBuffer = Buffer.from('%PDF-1.4 mock content');
      const mockStats = { size: 1024 };
      const mockPdfData = { text: 'content', numpages: 1 };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue(mockStats as any);
      mockFs.readFile.mockResolvedValue(mockBuffer);
      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await documentProcessor.validateDocument(filePath);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-existent file', async () => {
      const filePath = '/test/nonexistent.pdf';
      
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const result = await documentProcessor.validateDocument(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File does not exist or is not readable');
    });

    it('should reject unsupported file format', async () => {
      const filePath = '/test/document.txt';
      
      mockFs.access.mockResolvedValue(undefined);

      const result = await documentProcessor.validateDocument(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported file format: .txt. Supported formats: .pdf');
    });

    it('should reject empty file', async () => {
      const filePath = '/test/empty.pdf';
      const mockStats = { size: 0 };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue(mockStats as any);

      const result = await documentProcessor.validateDocument(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should reject file that exceeds maximum size', async () => {
      const filePath = '/test/large.pdf';
      const mockStats = { size: 60 * 1024 * 1024 }; // 60MB

      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue(mockStats as any);

      const result = await documentProcessor.validateDocument(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size (60MB) exceeds maximum allowed size (50MB)');
    });

    it('should reject invalid PDF format', async () => {
      const filePath = '/test/invalid.pdf';
      const mockBuffer = Buffer.from('not a pdf file');
      const mockStats = { size: 1024 };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue(mockStats as any);
      mockFs.readFile.mockResolvedValue(mockBuffer);

      const result = await documentProcessor.validateDocument(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid PDF file format');
    });

    it('should reject corrupted PDF', async () => {
      const filePath = '/test/corrupt.pdf';
      const mockBuffer = Buffer.from('%PDF-1.4 corrupted content');
      const mockStats = { size: 1024 };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue(mockStats as any);
      mockFs.readFile.mockResolvedValue(mockBuffer);
      mockPdfParse.mockRejectedValue(new Error('Corrupted PDF'));

      const result = await documentProcessor.validateDocument(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PDF validation failed: Corrupted PDF');
    });
  });

  describe('processFolder', () => {
    it('should process all PDF files in a folder successfully', async () => {
      const folderPath = '/test/folder';
      const mockStats = { isDirectory: () => true };
      const files = ['doc1.pdf', 'doc2.pdf', 'readme.txt'];
      const mockBuffer = Buffer.from('%PDF-1.4 content');
      const mockPdfData = { text: 'content', numpages: 1 };

      mockFs.stat.mockResolvedValue(mockStats as any);
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockBuffer);
      mockPdfParse.mockResolvedValue(mockPdfData);

      const results = await documentProcessor.processFolder(folderPath);

      expect(results).toHaveLength(2); // Only PDF files
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].documentPath).toBe(path.join(folderPath, 'doc1.pdf'));
      expect(results[1].documentPath).toBe(path.join(folderPath, 'doc2.pdf'));
    });

    it('should handle mixed success and failure scenarios', async () => {
      const folderPath = '/test/folder';
      const mockDirStats = { isDirectory: () => true };
      const mockFileStats = { size: 1024, isDirectory: () => false };
      const files = ['valid.pdf', 'corrupt.pdf'];
      const mockBuffer = Buffer.from('%PDF-1.4 content');
      const mockPdfData = { text: 'content', numpages: 1 };

      // Mock folder stat
      mockFs.stat.mockResolvedValueOnce(mockDirStats as any);
      mockFs.readdir.mockResolvedValue(files as any);
      
      // Mock first file as valid - all validation and processing steps succeed
      // validateDocument calls
      mockFs.access.mockResolvedValueOnce(undefined);
      mockFs.stat.mockResolvedValueOnce(mockFileStats as any);
      mockFs.readFile.mockResolvedValueOnce(mockBuffer);
      mockPdfParse.mockResolvedValueOnce(mockPdfData);
      
      // extractTextFromPDF calls
      mockFs.access.mockResolvedValueOnce(undefined);
      mockFs.readFile.mockResolvedValueOnce(mockBuffer);
      mockPdfParse.mockResolvedValueOnce(mockPdfData);
      
      // createDocumentMetadata calls
      mockFs.stat.mockResolvedValueOnce(mockFileStats as any);
      mockFs.readFile.mockResolvedValueOnce(mockBuffer); // for hash calculation
      mockFs.readFile.mockResolvedValueOnce(mockBuffer); // for page count
      mockPdfParse.mockResolvedValueOnce(mockPdfData);
      
      // Mock second file as invalid - validation fails at access check
      mockFs.access.mockRejectedValueOnce(new Error('File not found'));

      const results = await documentProcessor.processFolder(folderPath);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Validation failed');
    });

    it('should return empty array when no PDF files found', async () => {
      const folderPath = '/test/empty';
      const mockStats = { isDirectory: () => true };
      const files = ['readme.txt', 'image.jpg'];

      mockFs.stat.mockResolvedValue(mockStats as any);
      mockFs.readdir.mockResolvedValue(files as any);

      const results = await documentProcessor.processFolder(folderPath);

      expect(results).toHaveLength(0);
    });

    it('should throw error when path is not a directory', async () => {
      const folderPath = '/test/file.pdf';
      const mockStats = { isDirectory: () => false };

      mockFs.stat.mockResolvedValue(mockStats as any);

      await expect(documentProcessor.processFolder(folderPath))
        .rejects.toThrow('Path is not a directory: /test/file.pdf');
    });

    it('should throw error when folder does not exist', async () => {
      const folderPath = '/test/nonexistent';

      mockFs.stat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await expect(documentProcessor.processFolder(folderPath))
        .rejects.toThrow('Failed to process folder: ENOENT: no such file or directory');
    });
  });

  describe('createDocumentMetadata', () => {
    it('should create metadata for a PDF file', async () => {
      const filePath = '/test/document.pdf';
      const extractedText = 'Sample text content';
      const mockStats = { size: 2048 };
      const mockBuffer = Buffer.from('%PDF-1.4 content');
      const mockPdfData = { numpages: 3 };

      mockFs.stat.mockResolvedValue(mockStats as any);
      mockFs.readFile.mockResolvedValue(mockBuffer);
      mockPdfParse.mockResolvedValue(mockPdfData);

      const result = await documentProcessor.createDocumentMetadata(filePath, extractedText);

      expect(result.fileName).toBe('document.pdf');
      expect(result.filePath).toBe(filePath);
      expect(result.fileSize).toBe(2048);
      expect(result.pageCount).toBe(3);
      expect(result.documentHash).toBeDefined();
      expect(typeof result.documentHash).toBe('string');
    });

    it('should handle PDF parsing errors gracefully', async () => {
      const filePath = '/test/document.pdf';
      const mockStats = { size: 1024 };
      const mockBuffer = Buffer.from('content');

      mockFs.stat.mockResolvedValue(mockStats as any);
      mockFs.readFile.mockResolvedValue(mockBuffer);
      mockPdfParse.mockRejectedValue(new Error('PDF parsing failed'));

      const result = await documentProcessor.createDocumentMetadata(filePath);

      expect(result.fileName).toBe('document.pdf');
      expect(result.pageCount).toBe(0); // Should default to 0 on error
    });
  });

  describe('getZoningPlanDataPath', () => {
    it('should return correct zoning plan data path', () => {
      const result = documentProcessor.getZoningPlanDataPath();
      
      expect(result).toBe(path.join(process.cwd(), 'zoning-plan-data'));
    });
  });

  describe('listZoningPlanFiles', () => {
    it('should list all PDF files in zoning plan data folder', async () => {
      const files = ['plan1.pdf', 'plan2.pdf', 'readme.txt', 'plan3.pdf'];
      const expectedPath = path.join(process.cwd(), 'zoning-plan-data');

      mockFs.readdir.mockResolvedValue(files as any);

      const result = await documentProcessor.listZoningPlanFiles();

      expect(mockFs.readdir).toHaveBeenCalledWith(expectedPath);
      expect(result).toHaveLength(3);
      expect(result).toEqual([
        path.join(expectedPath, 'plan1.pdf'),
        path.join(expectedPath, 'plan2.pdf'),
        path.join(expectedPath, 'plan3.pdf')
      ]);
    });

    it('should handle folder read errors', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      await expect(documentProcessor.listZoningPlanFiles())
        .rejects.toThrow('Failed to list zoning plan files: Permission denied');
    });
  });

  describe('hash calculation', () => {
    it('should calculate consistent hash for same file content', async () => {
      const filePath1 = '/test/doc1.pdf';
      const filePath2 = '/test/doc2.pdf';
      const sameContent = Buffer.from('identical content');
      const mockStats = { size: 1024 };
      const mockPdfData = { numpages: 1 };

      // Mock same content for both files
      mockFs.stat.mockResolvedValue(mockStats as any);
      mockFs.readFile.mockResolvedValue(sameContent);
      mockPdfParse.mockResolvedValue(mockPdfData);

      const [metadata1, metadata2] = await Promise.all([
        documentProcessor.createDocumentMetadata(filePath1),
        documentProcessor.createDocumentMetadata(filePath2)
      ]);

      expect(metadata1.documentHash).toBe(metadata2.documentHash);
    });

    it('should calculate different hash for different file content', async () => {
      const filePath1 = '/test/doc1.pdf';
      const filePath2 = '/test/doc2.pdf';
      const content1 = Buffer.from('content one');
      const content2 = Buffer.from('content two');
      const mockStats = { size: 1024 };
      const mockPdfData = { numpages: 1 };

      mockFs.stat.mockResolvedValue(mockStats as any);
      mockPdfParse.mockResolvedValue(mockPdfData);

      // Mock different content for each call
      mockFs.readFile.mockResolvedValueOnce(content1);
      mockFs.readFile.mockResolvedValueOnce(content2);

      const [metadata1, metadata2] = await Promise.all([
        documentProcessor.createDocumentMetadata(filePath1),
        documentProcessor.createDocumentMetadata(filePath2)
      ]);

      expect(metadata1.documentHash).not.toBe(metadata2.documentHash);
    });
  });
});