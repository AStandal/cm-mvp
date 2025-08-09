import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApplicationData, ErrorResponse, CaseDocument } from '../types/index.js';
import { randomUUID } from 'crypto';
import { getServices } from './serviceFactory.js';

const router = Router();

// Diagnostic logging middleware
const logRequest = (req: Request, _res: Response, next: NextFunction): void => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};

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

const analyzeApplicationSchema = z.object({
  applicationData: applicationDataSchema
});

// Case data validation schema
const caseDataSchema = z.object({
  id: z.string().min(1, 'Case ID is required'),
  status: z.string().min(1, 'Status is required'),
  currentStep: z.string().min(1, 'Current step is required'),
  applicationData: z.object({
    applicantName: z.string().min(1, 'Applicant name is required'),
    applicantEmail: z.string().email('Invalid email format'),
    documents: z.array(z.any()).optional().default([]),
    formData: z.record(z.string(), z.any()).optional()
  }),
  notes: z.array(z.any()).optional().default([]),
  aiSummaries: z.array(z.any()).optional().default([])
});

const validateCompletenessSchema = z.object({
  caseData: caseDataSchema
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

// Error handling wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * POST /api/ai/analyze-application
 * Analyze application data and provide AI insights
 * Requirements: 1.3, 1.4, 1.5
 */
router.post('/analyze-application', logRequest, validateInput(analyzeApplicationSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { applicationData } = req.body;

  try {
    // Convert string dates to Date objects
    const processedApplicationData: ApplicationData = {
      ...applicationData,
      submissionDate: applicationData.submissionDate 
        ? new Date(applicationData.submissionDate)
        : new Date(),
      documents: applicationData.documents?.map((doc: CaseDocument) => ({
        ...doc,
        uploadedAt: new Date(doc.uploadedAt)
      })) || []
    };

    // Get services and analyze the application
    const { aiService } = getServices();
    
    const analysis = await aiService.analyzeApplication(processedApplicationData);

    // Return the analysis with 200 status
    const response = {
      success: true,
      data: {
        analysis
      },
      message: 'Application analysis completed successfully',
      timestamp: new Date().toISOString()
    };
    console.log(`[AI ROUTE DEBUG] /analyze-application response:`, JSON.stringify(response, null, 2));
    res.status(200).json(response);

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'AI_ANALYSIS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to analyze application',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    // Determine appropriate status code based on error type
    const statusCode = error instanceof Error && error.message.includes('validation') ? 400 : 500;
    res.status(statusCode).json(errorResponse);
  }
}));

/**
 * POST /api/ai/validate-completeness
 * Validate if a case is complete and ready for conclusion
 * Requirements: 3.3
 */
router.post('/validate-completeness', logRequest, validateInput(validateCompletenessSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { caseData } = req.body;

  try {
    // Get services and validate case completeness
    const { aiService } = getServices();
    
    const validation = await aiService.validateCaseCompleteness(caseData);

    // Return the validation with 200 status
    res.status(200).json({
      success: true,
      data: {
        validation
      },
      message: 'Case completeness validation completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'VALIDATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to validate case completeness',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    // Determine appropriate status code based on error type
    const statusCode = error instanceof Error && 
      (error.message.includes('validation') || error.message.includes('Invalid') || error.message.includes('Failed to validate')) 
      ? 400 : 500;
    res.status(statusCode).json(errorResponse);
  }
}));

/**
 * POST /api/ai/detect-missing-fields
 * Detect missing fields in application data
 * Requirements: 1.5
 */
router.post('/detect-missing-fields', logRequest, validateInput(analyzeApplicationSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { applicationData } = req.body;

  try {
    // Convert string dates to Date objects
    const processedApplicationData: ApplicationData = {
      ...applicationData,
      submissionDate: applicationData.submissionDate 
        ? new Date(applicationData.submissionDate)
        : new Date(),
      documents: applicationData.documents?.map((doc: CaseDocument) => ({
        ...doc,
        uploadedAt: new Date(doc.uploadedAt)
      })) || []
    };

    // Get services and detect missing fields
    const { aiService } = getServices();
    
    const missingFieldsAnalysis = await aiService.detectMissingFields(processedApplicationData);

    // Return the missing fields analysis with 200 status
    res.status(200).json({
      success: true,
      data: {
        missingFieldsAnalysis
      },
      message: 'Missing fields detection completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'MISSING_FIELDS_DETECTION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to detect missing fields',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    // Determine appropriate status code based on error type
    const statusCode = error instanceof Error && 
      (error.message.includes('validation') || error.message.includes('Invalid') || error.message.includes('Failed to detect')) 
      ? 400 : 500;
    res.status(statusCode).json(errorResponse);
  }
}));

export default router;

