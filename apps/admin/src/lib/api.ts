import type { ApiResponse } from '@skipper/shared';
import { API_BASE } from './env';
import { useAuthStore } from '@/stores/authStore';

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
  const ct = res.headers.get('Content-Type') ?? '';
  if (!ct.includes('application/json')) {
    throw new ApiError(
      `Non-JSON response (${res.status})`,
      res.status >= 500 ? 'INTERNAL' : 'UNEXPECTED',
      res.status,
    );
  }
  const body = (await res.json()) as ApiResponse<T>;
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

function handle401(status: number): void {
  if (status === 401) {
    const { logout, token } = useAuthStore.getState();
    if (token) logout();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
  headers?: Record<string, string>;
}

async function request(path: string, opts: RequestOptions = {}): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  const token = useAuthStore.getState().token;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.isFormData) {
      body = opts.body as BodyInit;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }

  const init: RequestInit = {
    method: opts.method ?? 'GET',
    headers,
    ...(body !== undefined && { body }),
  };
  const res = await fetch(url, init);
  if (res.status === 401) handle401(res.status);
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
    const res = await request(path, { method: 'POST', body });
    const env = await parseEnvelope<T>(res);
    return env.data as T;
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await request(path, { method: 'PATCH', body });
    const env = await parseEnvelope<T>(res);
    return env.data as T;
  },
  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await request(path, { method: 'PUT', body });
    const env = await parseEnvelope<T>(res);
    return env.data as T;
  },
  async del<T>(path: string): Promise<T> {
    const res = await request(path, { method: 'DELETE' });
    const env = await parseEnvelope<T>(res);
    return env.data as T;
  },
  async postFormData<T>(path: string, form: FormData): Promise<T> {
    const res = await request(path, { method: 'POST', body: form, isFormData: true });
    const env = await parseEnvelope<T>(res);
    return env.data as T;
  },
};
