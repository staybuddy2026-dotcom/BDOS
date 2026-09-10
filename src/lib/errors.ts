import { NextResponse } from 'next/server';
import { logger } from './logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  public readonly errors?: Record<string, string[]>;
  constructor(message: string, errors?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
  };
}

export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function errorResponse(error: unknown): NextResponse<ApiResponse> {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          errors: error.errors,
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode }
    );
  }

  const errMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  logger.error('Unhandled API Error', error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errMessage,
      },
    },
    { status: 500 }
  );
}

export async function handleSafeAction<T>(action: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    const result = await action();
    return { success: true, data: result };
  } catch (error) {
    logger.error('Server Action Error', error);
    if (error instanceof ValidationError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          errors: error.errors,
        },
      };
    }
    if (error instanceof AppError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
}
