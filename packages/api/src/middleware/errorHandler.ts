import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import type { Env } from '../types/env';
import { fail } from '../utils/response';

export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      fail(
        'VALIDATION_ERROR',
        'Invalid request payload',
        err.issues.map((i) => ({ path: i.path, message: i.message })),
      ),
      400,
    );
  }

  if (err instanceof HTTPException) {
    return c.json(
      fail(statusToCode(err.status), err.message || 'Request failed'),
      err.status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
    );
  }

  console.error('Unhandled error:', err);
  return c.json(fail('INTERNAL', 'Something went wrong'), 500);
};

function statusToCode(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE';
    case 429:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'INTERNAL' : 'ERROR';
  }
}
