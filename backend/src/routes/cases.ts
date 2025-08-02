import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApplicationData, ErrorResponse } from '../types/index.js';
import { randomUUID } from 'crypto';
import { getServices } from './serviceFactory.js';

const router = Router();

// Validation schemas
const applicationDataSchema = z.object({
  applicantName: z.string().min(1, 'Applicant name is required').max(255),
  applicantEmail: z.string().email('Invalid email format').max(255),
  applicationType: z.string().min(1, 'Application type is required').max(100),
  submissionDate: z.string().datetime().optional(),
  documents: z.array(z.object({
    id: z.string(),
    filename: z.string(),
    path: z.string(),
    size: z.number(),
    mimeType: z.string(),
    uploadedAt: z.string().datetime()
  })).optional(),
  formData: z.record(z.any()).optional()
});

const createCaseSchema = z.object({
  applicationData: applicationDataSchema
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
            details: error.errors
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
const validateCaseId = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;
  
  // Decode the URL parameter and check if it's empty or just whitespace
  const decodedId = decodeURIComponent(id || '');
  
  if (!id || typeof id !== 'string' || decodedId.trim().length === 0) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INVALID_CASE_ID',
        message: 'Case ID is required and must be a valid string'
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
 * POST /api/cases
 * Create a new case with application data
 * Requirements: 1.1, 1.2
 */
router.post('/', validateInput(createCaseSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { applicationData } = req.body;
  const userId = req.headers['x-user-id'] as string || 'system';

  try {
    // Convert string dates to Date objects
    const processedApplicationData: ApplicationData = {
      ...applicationData,
      submissionDate: applicationData.submissionDate 
        ? new Date(applicationData.submissionDate)
        : new Date(),
      documents: applicationData.documents?.map((doc: any) => ({
        ...doc,
        uploadedAt: new Date(doc.uploadedAt)
      })) || []
    };

    // Get services and create the case
    const { caseService } = getServices();
    
    // In test mode, skip AI processing to avoid external API calls
    const newCase = process.env.NODE_ENV === 'test' 
      ? await caseService.createCaseWithoutAI(processedApplicationData, userId)
      : await caseService.createCase(processedApplicationData, userId);

    // Return the created case with 201 status
    res.status(201).json({
      success: true,
      data: {
        case: newCase
      },
      message: 'Case created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'CASE_CREATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create case',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    // Determine appropriate status code based on error type
    const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json(errorResponse);
  }
}));

/**
 * GET /api/cases/:id
 * Retrieve case details by ID
 * Requirements: 1.1, 1.2
 */
router.get('/:id', validateCaseId, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Get services and retrieve the case
    const { caseService } = getServices();
    const caseData = await caseService.getCaseById(id);

    if (!caseData) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'CASE_NOT_FOUND',
          message: `Case with ID ${id} not found`
        },
        timestamp: new Date().toISOString(),
        requestId: randomUUID()
      };
      res.status(404).json(errorResponse);
      return;
    }

    // Return the case data
    res.status(200).json({
      success: true,
      data: {
        case: caseData
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'CASE_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve case',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/cases/:id/ai-summary
 * Retrieve AI summaries for a case
 * Requirements: 1.3, 1.4, 2.1, 2.2, 2.5, 3.1
 */
router.get('/:id/ai-summary', validateCaseId, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Get services and retrieve the case
    const { caseService, dataService } = getServices();
    
    // First verify the case exists
    const caseData = await caseService.getCaseById(id);
    if (!caseData) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'CASE_NOT_FOUND',
          message: `Case with ID ${id} not found`
        },
        timestamp: new Date().toISOString(),
        requestId: randomUUID()
      };
      res.status(404).json(errorResponse);
      return;
    }

    // Get AI summaries for the case
    const summaries = await dataService.getSummaries(id);

    // Return the AI summaries
    res.status(200).json({
      success: true,
      data: {
        summaries: summaries,
        caseId: id,
        totalSummaries: summaries.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'AI_SUMMARY_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve AI summaries',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/cases/:id/ai-refresh
 * Regenerate AI summary for a case
 * Requirements: 1.3, 1.4, 2.1, 2.2, 2.5, 3.1
 */
router.post('/:id/ai-refresh', validateCaseId, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'] as string || 'system';

  try {
    // Get services
    const { caseService, aiService, dataService } = getServices();
    
    // First verify the case exists
    const caseData = await caseService.getCaseById(id);
    if (!caseData) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'CASE_NOT_FOUND',
          message: `Case with ID ${id} not found`
        },
        timestamp: new Date().toISOString(),
        requestId: randomUUID()
      };
      res.status(404).json(errorResponse);
      return;
    }

    // Generate new AI summary
    const newSummary = await aiService.generateOverallSummary(caseData);
    
    // Save the new summary
    await dataService.saveSummary(newSummary);

    // Log the AI refresh activity
    await dataService.logActivity({
      id: randomUUID(),
      caseId: id,
      action: 'ai_summary_refreshed',
      details: {
        summaryId: newSummary.id,
        summaryType: newSummary.type,
        summaryVersion: newSummary.version
      },
      userId: userId,
      timestamp: new Date()
    });

    // Return the new summary
    res.status(200).json({
      success: true,
      data: {
        summary: newSummary,
        message: 'AI summary regenerated successfully'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'AI_SUMMARY_REFRESH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to regenerate AI summary',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

export default router;