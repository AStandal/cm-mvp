import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getServices } from './serviceFactory.js';

const router = Router();

const runEvalSchema = z.object({
  caseId: z.string().min(1, 'caseId is required')
});

const validateInput = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.issues
          },
          timestamp: new Date().toISOString(),
          requestId: randomUUID()
        });
        return;
      }
      next(error);
    }
  };
};

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// POST /api/internal/eval/run
router.post('/run', validateInput(runEvalSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { caseId } = req.body as { caseId: string };
  const { evaluationService } = getServices();
  const evaluation = await evaluationService.evaluateLatestSummary(caseId);

  res.status(200).json({
    success: true,
    data: { evaluation },
    message: 'Evaluation completed',
    timestamp: new Date().toISOString()
  });
}));

export default router;