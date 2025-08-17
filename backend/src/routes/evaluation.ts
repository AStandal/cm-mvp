import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ErrorResponse } from '../types/index.js';
import { 
  CreateDatasetRequestSchema, 
  AddExampleRequestSchema,
  CreateDatasetRequest,
  AddExampleRequest,
  EvaluateOutputRequestSchema,
  EvaluateOutputRequest
} from '../types/evaluation.js';
import { randomUUID } from 'crypto';
import { EvaluationService } from '../services/EvaluationService.js';
import { DataService } from '../services/DataService.js';
import { JudgeEvaluationService } from '../services/JudgeEvaluationService.js';
import { OpenRouterClient } from '../services/OpenRouterClient.js';
import { PromptTemplateService } from '../services/PromptTemplateService.js';

const router = Router();

// Initialize services - create fresh instances for each request to avoid database connection issues
const getEvaluationService = (): EvaluationService => {
  const dataService = new DataService();
  return new EvaluationService(dataService);
};

const getJudgeEvaluationService = (): JudgeEvaluationService => {
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
  return new JudgeEvaluationService(openRouterClient, promptTemplateService);
};

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
const validateDatasetId = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;

  // Decode the URL parameter and check if it's empty or just whitespace
  const decodedId = decodeURIComponent(id || '');

  if (!id || typeof id !== 'string' || decodedId.trim().length === 0) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INVALID_DATASET_ID',
        message: 'Dataset ID is required and must be a valid string'
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
 * POST /api/evaluation/datasets
 * Create a new evaluation dataset
 * Requirements: 1.1, 1.3
 */
router.post('/datasets', validateInput(CreateDatasetRequestSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const createRequest = req.body as CreateDatasetRequest;

  try {
    const service = getEvaluationService();
    const dataset = await service.createDataset(createRequest);

    // Return the created dataset with 201 status
    res.status(201).json({
      success: true,
      data: {
        dataset
      },
      message: 'Evaluation dataset created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'DATASET_CREATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create evaluation dataset',
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
 * GET /api/evaluation/datasets
 * List all evaluation datasets with optional filtering
 * Requirements: 1.1, 1.3
 */
router.get('/datasets', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { operation, createdBy, tags, limit, offset } = req.query;

  try {
    const service = getEvaluationService();
    
    // Parse query parameters
    const filters = {
      ...(operation && { operation: operation as any }), // Cast to any to avoid type issues with AIOperation
      ...(createdBy && { createdBy: createdBy as string }),
      ...(tags && { tags: Array.isArray(tags) ? tags as string[] : [tags as string] }),
      ...(limit && { limit: parseInt(limit as string) }),
      ...(offset && { offset: parseInt(offset as string) })
    };

    const datasets = await service.listDatasets(filters);

    // Return the datasets data
    res.status(200).json({
      success: true,
      data: {
        datasets,
        total: datasets.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'DATASETS_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve evaluation datasets',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

/**
 * GET /api/evaluation/datasets/:id
 * Retrieve evaluation dataset details by ID
 * Requirements: 1.1, 1.3
 */
router.get('/datasets/:id', validateDatasetId, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const service = getEvaluationService();
    const dataset = await service.getDataset(id);

    if (!dataset) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'DATASET_NOT_FOUND',
          message: `Evaluation dataset with ID ${id} not found`
        },
        timestamp: new Date().toISOString(),
        requestId: randomUUID()
      };
      res.status(404).json(errorResponse);
      return;
    }

    // Return the dataset data
    res.status(200).json({
      success: true,
      data: {
        dataset
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'DATASET_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve evaluation dataset',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/evaluation/datasets/:id/examples
 * Add a new example to an evaluation dataset
 * Requirements: 1.4
 */
router.post('/datasets/:id/examples', validateDatasetId, validateInput(AddExampleRequestSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const addExampleRequest = req.body as AddExampleRequest;

  try {
    const service = getEvaluationService();
    await service.addExampleToDataset(id, addExampleRequest);

    // Get the updated dataset to return
    const updatedDataset = await service.getDataset(id);

    // Return success response
    res.status(201).json({
      success: true,
      data: {
        dataset: updatedDataset
      },
      message: 'Example added to evaluation dataset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'EXAMPLE_ADDITION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to add example to evaluation dataset',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('validation') || error.message.includes('required')) {
        statusCode = 400;
      }
    }

    res.status(statusCode).json(errorResponse);
  }
}));

/**
 * GET /api/evaluation/datasets/:id/examples
 * Retrieve all examples for an evaluation dataset
 * Requirements: 1.4
 */
router.get('/datasets/:id/examples', validateDatasetId, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const service = getEvaluationService();
    
    // First check if dataset exists
    const dataset = await service.getDataset(id);
    if (!dataset) {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'DATASET_NOT_FOUND',
          message: `Evaluation dataset with ID ${id} not found`
        },
        timestamp: new Date().toISOString(),
        requestId: randomUUID()
      };
      res.status(404).json(errorResponse);
      return;
    }

    const examples = await service.getDatasetExamples(id);

    // Return the examples data
    res.status(200).json({
      success: true,
      data: {
        examples,
        total: examples.length,
        datasetId: id
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'EXAMPLES_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve dataset examples',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

/**
 * POST /api/evaluation/judge/evaluate
 * Evaluate a single AI output using LLM-as-a-Judge
 * Requirements: 2.1
 */
router.post('/judge/evaluate', validateInput(EvaluateOutputRequestSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const evaluateRequest = req.body as EvaluateOutputRequest;

  try {
    const service = getJudgeEvaluationService();
    const result = await service.evaluateOutput(evaluateRequest);

    // Return the evaluation result
    res.status(200).json({
      success: true,
      data: {
        evaluation: result
      },
      message: 'AI output evaluated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'EVALUATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to evaluate AI output',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('validation') || error.message.includes('required')) {
        statusCode = 400;
      } else if (error.message.includes('timeout') || error.message.includes('retry')) {
        statusCode = 408;
      }
    }

    res.status(statusCode).json(errorResponse);
  }
}));

/**
 * GET /api/evaluation/judge/models
 * Get available evaluation models
 * Requirements: 2.1
 */
router.get('/judge/models', asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  try {
    const service = getJudgeEvaluationService();
    const models = await service.getAvailableEvaluationModels();

    // Return the available models
    res.status(200).json({
      success: true,
      data: {
        models,
        total: models.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'MODELS_RETRIEVAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to retrieve evaluation models',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID()
    };

    res.status(500).json(errorResponse);
  }
}));

export default router;