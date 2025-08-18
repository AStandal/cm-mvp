import { ZoningErrorCodes } from '../types/index.js';

export interface ZoningError extends Error {
  code: ZoningErrorCodes;
  statusCode: number;
  details?: any;
}

export class ZoningErrorHandler {
  /**
   * Create a zoning-specific error
   */
  static createError(
    code: ZoningErrorCodes, 
    message: string, 
    statusCode: number = 500, 
    details?: any
  ): ZoningError {
    const error = new Error(message) as ZoningError;
    error.code = code;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }

  /**
   * Handle PDF processing errors
   */
  static handlePDFError(originalError: Error): ZoningError {
    if (originalError.message.includes('not found') || originalError.message.includes('does not exist')) {
      return this.createError(
        ZoningErrorCodes.INVALID_PDF,
        'PDF file not found or inaccessible',
        404,
        { originalError: originalError.message }
      );
    }

    if (originalError.message.includes('corrupted') || originalError.message.includes('invalid format')) {
      return this.createError(
        ZoningErrorCodes.INVALID_PDF,
        'PDF file is corrupted or has invalid format',
        400,
        { originalError: originalError.message }
      );
    }

    if (originalError.message.includes('no extractable text') || originalError.message.includes('empty')) {
      return this.createError(
        ZoningErrorCodes.TEXT_EXTRACTION_FAILED,
        'PDF contains no extractable text content',
        400,
        { originalError: originalError.message }
      );
    }

    return this.createError(
      ZoningErrorCodes.TEXT_EXTRACTION_FAILED,
      `Failed to process PDF: ${originalError.message}`,
      500,
      { originalError: originalError.message }
    );
  }

  /**
   * Handle LLM processing errors with retry logic
   */
  static handleLLMError(originalError: Error, retryCount: number = 0): ZoningError {
    const maxRetries = 3;

    if (originalError.message.includes('rate limit') || originalError.message.includes('429')) {
      return this.createError(
        ZoningErrorCodes.LLM_PROCESSING_FAILED,
        `LLM service rate limited. Retry ${retryCount + 1}/${maxRetries}`,
        429,
        { 
          originalError: originalError.message,
          retryCount,
          maxRetries,
          retryable: retryCount < maxRetries
        }
      );
    }

    if (originalError.message.includes('timeout') || originalError.message.includes('ECONNRESET')) {
      return this.createError(
        ZoningErrorCodes.LLM_PROCESSING_FAILED,
        `LLM service timeout. Retry ${retryCount + 1}/${maxRetries}`,
        408,
        { 
          originalError: originalError.message,
          retryCount,
          maxRetries,
          retryable: retryCount < maxRetries
        }
      );
    }

    if (originalError.message.includes('401') || originalError.message.includes('unauthorized')) {
      return this.createError(
        ZoningErrorCodes.LLM_PROCESSING_FAILED,
        'LLM service authentication failed',
        401,
        { originalError: originalError.message }
      );
    }

    if (originalError.message.includes('400') || originalError.message.includes('bad request')) {
      return this.createError(
        ZoningErrorCodes.LLM_PROCESSING_FAILED,
        'Invalid request to LLM service',
        400,
        { originalError: originalError.message }
      );
    }

    return this.createError(
      ZoningErrorCodes.LLM_PROCESSING_FAILED,
      `LLM processing failed: ${originalError.message}`,
      500,
      { 
        originalError: originalError.message,
        retryCount,
        maxRetries,
        retryable: retryCount < maxRetries
      }
    );
  }

  /**
   * Handle JSON response validation errors
   */
  static handleResponseValidationError(originalError: Error, responseContent?: string): ZoningError {
    return this.createError(
      ZoningErrorCodes.INVALID_RESPONSE_FORMAT,
      'LLM response format validation failed',
      422,
      { 
        originalError: originalError.message,
        responseContent: responseContent?.substring(0, 500), // Truncate for logging
        validationDetails: originalError.message
      }
    );
  }

  /**
   * Handle database save errors
   */
  static handleDatabaseError(originalError: Error, operation: string): ZoningError {
    if (originalError.message.includes('UNIQUE constraint failed') || originalError.message.includes('duplicate')) {
      return this.createError(
        ZoningErrorCodes.DUPLICATE_DOCUMENT,
        'Document with this hash already exists in the database',
        409,
        { 
          originalError: originalError.message,
          operation
        }
      );
    }

    if (originalError.message.includes('foreign key constraint') || originalError.message.includes('FOREIGN KEY')) {
      return this.createError(
        ZoningErrorCodes.DATABASE_SAVE_FAILED,
        'Database constraint violation - referenced record not found',
        400,
        { 
          originalError: originalError.message,
          operation
        }
      );
    }

    return this.createError(
      ZoningErrorCodes.DATABASE_SAVE_FAILED,
      `Database operation failed: ${originalError.message}`,
      500,
      { 
        originalError: originalError.message,
        operation
      }
    );
  }

  /**
   * Handle batch processing errors
   */
  static handleBatchProcessingError(originalError: Error, processedCount: number, totalCount: number): ZoningError {
    return this.createError(
      ZoningErrorCodes.BATCH_PROCESSING_FAILED,
      `Batch processing failed after processing ${processedCount}/${totalCount} documents`,
      500,
      { 
        originalError: originalError.message,
        processedCount,
        totalCount,
        partialSuccess: processedCount > 0
      }
    );
  }

  /**
   * Handle zoning plan not found errors
   */
  static handleNotFoundError(resourceType: string, resourceId: string): ZoningError {
    return this.createError(
      ZoningErrorCodes.ZONING_PLAN_NOT_FOUND,
      `${resourceType} with ID '${resourceId}' not found`,
      404,
      { resourceType, resourceId }
    );
  }

  /**
   * Implement exponential backoff for retryable operations
   */
  static calculateBackoffDelay(retryCount: number, baseDelayMs: number = 1000): number {
    return Math.min(baseDelayMs * Math.pow(2, retryCount), 30000); // Max 30 seconds
  }

  /**
   * Check if an error is retryable
   */
  static isRetryableError(error: ZoningError): boolean {
    return error.details?.retryable === true;
  }

  /**
   * Get appropriate HTTP status code for a zoning error
   */
  static getHttpStatusCode(code: ZoningErrorCodes): number {
    switch (code) {
      case ZoningErrorCodes.INVALID_PDF:
        return 400;
      case ZoningErrorCodes.TEXT_EXTRACTION_FAILED:
        return 400;
      case ZoningErrorCodes.LLM_PROCESSING_FAILED:
        return 500;
      case ZoningErrorCodes.INVALID_RESPONSE_FORMAT:
        return 422;
      case ZoningErrorCodes.DATABASE_SAVE_FAILED:
        return 500;
      case ZoningErrorCodes.DUPLICATE_DOCUMENT:
        return 409;
      case ZoningErrorCodes.ZONING_PLAN_NOT_FOUND:
        return 404;
      case ZoningErrorCodes.BATCH_PROCESSING_FAILED:
        return 500;
      default:
        return 500;
    }
  }

  /**
   * Create a user-friendly error message
   */
  static getUserFriendlyMessage(code: ZoningErrorCodes): string {
    switch (code) {
      case ZoningErrorCodes.INVALID_PDF:
        return 'The PDF file is invalid, corrupted, or cannot be accessed.';
      case ZoningErrorCodes.TEXT_EXTRACTION_FAILED:
        return 'Unable to extract text content from the PDF document.';
      case ZoningErrorCodes.LLM_PROCESSING_FAILED:
        return 'AI processing service is temporarily unavailable. Please try again later.';
      case ZoningErrorCodes.INVALID_RESPONSE_FORMAT:
        return 'AI service returned an unexpected response format.';
      case ZoningErrorCodes.DATABASE_SAVE_FAILED:
        return 'Failed to save the extracted data to the database.';
      case ZoningErrorCodes.DUPLICATE_DOCUMENT:
        return 'This document has already been processed.';
      case ZoningErrorCodes.ZONING_PLAN_NOT_FOUND:
        return 'The requested zoning plan could not be found.';
      case ZoningErrorCodes.BATCH_PROCESSING_FAILED:
        return 'Batch processing encountered errors. Some documents may have been processed successfully.';
      default:
        return 'An unexpected error occurred while processing the request.';
    }
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      if (error instanceof Error && 'code' in error) {
        const zoningError = error as ZoningError;
        if (!ZoningErrorHandler.isRetryableError(zoningError)) {
          break;
        }
      }

      // Wait before retrying
      const delay = ZoningErrorHandler.calculateBackoffDelay(attempt, baseDelayMs);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}