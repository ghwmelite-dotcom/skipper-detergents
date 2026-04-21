import { describe, it, expect } from 'vitest';
import { ok, fail } from '../src/utils/response';

describe('response envelope', () => {
  it('ok() wraps data in a success envelope', () => {
    const body = ok({ id: 'x' });
    expect(body).toEqual({ success: true, data: { id: 'x' } });
  });

  it('ok() includes meta when provided', () => {
    const body = ok([1, 2], { page: 1, per_page: 20, total: 2 });
    expect(body).toEqual({
      success: true,
      data: [1, 2],
      meta: { page: 1, per_page: 20, total: 2 },
    });
  });

  it('fail() produces an error envelope with code and message', () => {
    const body = fail('VALIDATION_ERROR', 'invalid email');
    expect(body).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'invalid email' },
    });
  });

  it('fail() includes details when provided', () => {
    const body = fail('VALIDATION_ERROR', 'bad input', { field: 'email' });
    expect(body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'bad input',
        details: { field: 'email' },
      },
    });
  });
});
