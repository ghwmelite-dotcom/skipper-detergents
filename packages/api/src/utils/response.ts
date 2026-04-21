import type { ApiResponse } from '@skipper/shared';

export function ok<T>(
  data: T,
  meta?: { page?: number; per_page?: number; total?: number },
): ApiResponse<T> {
  const body: ApiResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  return body;
}

export function fail(code: string, message: string, details?: unknown): ApiResponse<never> {
  const body: ApiResponse<never> = {
    success: false,
    error: { code, message },
  };
  if (details !== undefined) {
    body.error!.details = details;
  }
  return body;
}
