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
  formData: z.record(z.string(), z.any()).optional()
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
 * GET /api/cases
 * Retrieve all cases with optional filtering
 * Requirements: 1.1, 1.2
 */
router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { status, page = 1, limit = 10 } = req.query;

  try {
    // Get services and retrieve cases
    const { caseService } = getServices();
    const cases = await caseService.getAllCases({
      status: status as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    // Return the cases data
    res.status(200).json({
      success: true,
      data: {
        cases: cases.cases,
        total: cases.total,
        page: cases.page,
        limit: cases.limit
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'CASES_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve cases',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
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
 * Retrieve AI summary for a case
 * Requirements: 1.3, 1.4, 2.1, 2.2
 */
router.get('/:id/ai-summary', validateCaseId, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Get services and retrieve the case
    const { caseService, aiService } = getServices();
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

    // Generate AI summary
    const aiSummary = await aiService.generateOverallSummary(caseData);

    // Return the AI summary
    res.status(200).json({
      success: true,
      data: {
        aiSummary
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'AI_SUMMARY_GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to generate AI summary',
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
 * Refresh AI insights for a case
 * Requirements: 2.1, 2.4
 */
router.post('/:id/ai-refresh', validateCaseId, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Get services and retrieve the case
    const { caseService, aiService } = getServices();
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

    // Generate fresh AI summary
    const aiSummary = await aiService.generateOverallSummary(caseData);

    // Return the refreshed AI summary
    res.status(200).json({
      success: true,
      data: {
        aiSummary
      },
      message: 'AI insights refreshed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'AI_REFRESH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to refresh AI insights',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/cases/:id/notes
 * Retrieve all notes for a case
 * Requirements: 2.1, 2.2
 */
router.get('/:id/notes', validateCaseId, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Get services and retrieve notes
    const { dataService } = getServices();
    const notes = await dataService.getCaseNotes(id);

    // Return the notes data
    res.status(200).json({
      success: true,
      data: {
        notes: notes.map(note => ({
          id: note.id,
          caseId: note.case_id,
          content: note.content,
          createdBy: note.created_by,
          createdAt: note.created_at
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'NOTES_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve case notes',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/cases/:id/notes
 * Add a new note to a case
 * Requirements: 2.1, 2.2
 */
router.post('/:id/notes', validateCaseId, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.headers['x-user-id'] as string || 'system';

  // Validate content
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INVALID_NOTE_CONTENT',
        message: 'Note content is required and must be a non-empty string'
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };
    res.status(400).json(errorResponse);
    return;
  }

  try {
    // Get services and add note
    const { dataService, caseService } = getServices();
    await dataService.addCaseNote(id, content.trim(), userId);

    // Get the updated case data
    const updatedCase = await caseService.getCaseById(id);

    // Return the updated case data
    res.status(201).json({
      success: true,
      data: {
        case: updatedCase
      },
      message: 'Note added successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'NOTE_ADDITION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to add note',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

export default router;