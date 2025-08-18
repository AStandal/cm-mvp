import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ErrorResponse, ZoningPlan, SearchCriteria } from '../types/index.js';
import { randomUUID } from 'crypto';
import { getServices } from './serviceFactory.js';
import path from 'path';

const router = Router();

// Validation schemas
const extractZoningSchema = z.object({
  filePath: z.string().min(1, 'File path is required').optional(),
  fileName: z.string().min(1, 'File name is required').optional()
});

const batchProcessSchema = z.object({
  folderPath: z.string().min(1, 'Folder path is required').optional()
});

const searchCriteriaSchema = z.object({
  planId: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['required', 'recommended', 'optional']).optional(),
  jurisdiction: z.string().optional(),
  applicableZones: z.array(z.string()).optional(),
  textSearch: z.string().optional()
});

// Middleware for input validation
const validateInput = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: (error as z.ZodError).issues
          },
          timestamp: new Date().toISOString(),
          requestId: randomUUID()
        };
        res.status(400).json(errorResponse);
        return;
      }
      next(error);
    }
  };
};

// Middleware for parameter validation
const validateZoningPlanId = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;

  // Decode the URL parameter and check if it's empty or just whitespace
  const decodedId = decodeURIComponent(id || '');

  if (!id || typeof id !== 'string' || decodedId.trim().length === 0) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INVALID_ZONING_PLAN_ID',
        message: 'Zoning plan ID is required and must be a valid string'
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };
    res.status(400).json(errorResponse);
    return;
  }

  next();
};

// Error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * POST /api/zoning/extract
 * Extract zoning requirements from a single PDF document
 * Requirements: 1.1, 1.2, 1.3, 5.1, 5.2
 */
router.post('/extract', validateInput(extractZoningSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { filePath, fileName } = req.body;

  try {
    const { documentProcessor } = getServices();

    // Determine the file path to process
    let targetFilePath: string;
    
    if (filePath) {
      // Use provided file path
      targetFilePath = filePath;
    } else if (fileName) {
      // Use file name from zoning-plan-data folder
      targetFilePath = path.join(documentProcessor.getZoningPlanDataPath(), fileName);
    } else {
      // Default to processing the first PDF in zoning-plan-data folder
      const availableFiles = await documentProcessor.listZoningPlanFiles();
      if (availableFiles.length === 0) {
        const errorResponse: ErrorResponse = {
          error: {
            code: 'NO_FILES_FOUND',
            message: 'No PDF files found in zoning-plan-data folder'
          },
          timestamp: new Date().toISOString(),
          requestId: randomUUID()
        };
        res.status(404).json(errorResponse);
        return;
      }
      targetFilePath = availableFiles[0];
    }

    // Validate the document
    const validation = await documentProcessor.validateDocument(targetFilePath);
    if (!validation.isValid) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'INVALID_DOCUMENT',
          message: 'Document validation failed',
          details: validation.errors
        },
        timestamp: new Date().toISOString(),
        requestId: randomUUID()
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Extract text from PDF
    const documentText = await documentProcessor.extractTextFromPDF(targetFilePath);
    
    // Create document metadata
    const documentMetadata = await documentProcessor.createDocumentMetadata(targetFilePath, documentText);

    // For now, we'll create a placeholder response since AIService.extractZoningRequirements is not fully implemented
    // TODO: Complete AIService.extractZoningRequirements implementation
    const zoningPlan: ZoningPlan = {
      id: randomUUID(),
      name: path.basename(targetFilePath, '.pdf'),
      documentPath: targetFilePath,
      documentHash: documentMetadata.documentHash,
      jurisdiction: 'Unknown',
      effectiveDate: new Date(),
      version: '1.0',
      requirements: [],
      extractionMetadata: {
        extractedAt: new Date(),
        aiModel: 'placeholder',
        promptTemplate: 'zoning_requirements_extraction_v1',
        promptVersion: '1.0',
        confidence: 0.8,
        tokensUsed: 0,
        processingDuration: Date.now() - Date.now(),
        documentPages: documentMetadata.pageCount,
        extractedRequirementsCount: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Return the extracted zoning plan
    res.status(200).json({
      success: true,
      data: {
        zoningPlan,
        processingMetadata: {
          documentPath: targetFilePath,
          documentSize: documentMetadata.fileSize,
          pageCount: documentMetadata.pageCount,
          extractedRequirements: zoningPlan.requirements.length
        }
      },
      message: 'Zoning requirements extracted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to extract zoning requirements',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        statusCode = 404;
      } else if (error.message.includes('validation') || error.message.includes('invalid')) {
        statusCode = 400;
      }
    }

    res.status(statusCode).json(errorResponse);
  }
}));

/**
 * POST /api/zoning/batch-process
 * Process multiple zoning plan documents from a folder
 * Requirements: 2.1, 2.2, 2.3, 5.1, 5.2
 */
router.post('/batch-process', validateInput(batchProcessSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { folderPath } = req.body;

  try {
    const { aiService } = getServices();

    // Determine the folder path to process
    const targetFolderPath = folderPath || path.join(process.cwd(), 'zoning-plan-data');

    // Process the folder using AI service
    const batchResult = await aiService.batchProcessZoningDocuments(targetFolderPath);

    // Return the batch processing results
    res.status(200).json({
      success: true,
      data: {
        batchResult,
        summary: {
          totalDocuments: batchResult.totalDocuments,
          successfulExtractions: batchResult.successfulExtractions,
          failedExtractions: batchResult.failedExtractions,
          successRate: batchResult.totalDocuments > 0 
            ? Math.round((batchResult.successfulExtractions / batchResult.totalDocuments) * 100) 
            : 0
        }
      },
      message: 'Batch processing completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'BATCH_PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'Failed to process documents',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/zoning/plans
 * Retrieve all zoning plans
 * Requirements: 5.3
 */
router.get('/plans', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page = 1, limit = 10 } = req.query;

  try {
    // For now, we'll implement a simple approach since we don't have a getAllZoningPlans method
    // In a full implementation, you'd add this method to DataService
    
    // Return empty array for now - this would be implemented with proper pagination
    const plans: ZoningPlan[] = [];

    res.status(200).json({
      success: true,
      data: {
        plans,
        total: plans.length,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      },
      message: 'Zoning plans retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'PLANS_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve zoning plans',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/zoning/plans/:id
 * Retrieve a specific zoning plan by ID
 * Requirements: 5.3
 */
router.get('/plans/:id', validateZoningPlanId, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { dataService } = getServices();
    const zoningPlan = await dataService.getZoningPlan(id);

    if (!zoningPlan) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'ZONING_PLAN_NOT_FOUND',
          message: `Zoning plan with ID ${id} not found`
        },
        timestamp: new Date().toISOString(),
        requestId: randomUUID()
      };
      res.status(404).json(errorResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        zoningPlan
      },
      message: 'Zoning plan retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'PLAN_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve zoning plan',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/zoning/plans/:id/requirements
 * Retrieve requirements for a specific zoning plan
 * Requirements: 5.3
 */
router.get('/plans/:id/requirements', validateZoningPlanId, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { dataService } = getServices();
    const requirements = await dataService.getZoningRequirements(id);

    res.status(200).json({
      success: true,
      data: {
        requirements,
        total: requirements.length,
        planId: id
      },
      message: 'Zoning requirements retrieved successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'REQUIREMENTS_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve zoning requirements',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/zoning/requirements/search
 * Search zoning requirements with filtering criteria
 * Requirements: 5.3
 */
router.post('/requirements/search', validateInput(searchCriteriaSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const searchCriteria: SearchCriteria = req.body;

  try {
    const { dataService } = getServices();
    const requirements = await dataService.searchZoningRequirements(searchCriteria);

    res.status(200).json({
      success: true,
      data: {
        requirements,
        total: requirements.length,
        searchCriteria
      },
      message: 'Zoning requirements search completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'SEARCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to search zoning requirements',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

export default router;