import type { ApiResponse } from '@skipper/shared';
import { API_BASE } from './env';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseEnvelope<T>(res: Response): Promise<ApiResponse<T>> {
  const clone = res.clone();
  const contentType = clone.headers.get('Content-Type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      `Non-JSON response (${clone.status})`,
      clone.status >= 500 ? 'INTERNAL' : 'UNEXPECTED',
      clone.status,
    );
  }
  const body = (await clone.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new ApiError(
      body.error?.message ?? 'Request failed',
      body.error?.code ?? 'ERROR',
      res.status,
      body.error?.details,
    );
  }
  return body;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, init);
  return res;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await request(path);
    const body = await parseEnvelope<T>(res);
    return body.data as T;
  },
  async getPaginated<T>(
    path: string,
  ): Promise<{ data: T[]; meta: { page: number; per_page: number; total: number } }> {
    const res = await request(path);
    const body = await parseEnvelope<T[]>(res);
    return {
      data: (body.data ?? []) as T[],
      meta: {
        page: body.meta?.page ?? 1,
        per_page: body.meta?.per_page ?? 20,
        total: body.meta?.total ?? 0,
      },
    };
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const envelope = await parseEnvelope<T>(res);
    return envelope.data as T;
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await request(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const envelope = await parseEnvelope<T>(res);
    return envelope.data as T;
  },
};
