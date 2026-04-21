import { describe, it, expect } from 'vitest';
import { first, all, run } from '../../src/utils/db';

interface FakePreparedStatement {
  bind: (...args: unknown[]) => FakePreparedStatement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[]; success: boolean }>;
  run: () => Promise<{ success: boolean; meta: { changes: number } }>;
}

function makeDb(mockRows: unknown[]) {
  const bindings: unknown[][] = [];
  const stmt: FakePreparedStatement = {
    bind(...args) {
      bindings.push(args);
      return stmt;
    },
    async first<T>() {
      return (mockRows[0] ?? null) as T | null;
    },
    async all<T>() {
      return { results: mockRows as T[], success: true };
    },
    async run() {
      return { success: true, meta: { changes: mockRows.length } };
    },
  };
  const db = {
    prepare: () => stmt,
  } as unknown as D1Database;
  return { db, bindings };
}

describe('first', () => {
  it('returns the single row when the statement has one result', async () => {
    const { db } = makeDb([{ id: 'x', name: 'Skipper' }]);
    const row = await first<{ id: string; name: string }>(
      db,
      'SELECT * FROM products WHERE id = ?',
      ['x'],
    );
    expect(row).toEqual({ id: 'x', name: 'Skipper' });
  });

  it('returns null when no row matches', async () => {
    const { db } = makeDb([]);
    const row = await first<{ id: string }>(db, 'SELECT * FROM products WHERE id = ?', ['y']);
    expect(row).toBeNull();
  });

  it('passes bindings to the statement', async () => {
    const { db, bindings } = makeDb([]);
    await first(db, 'SELECT * FROM products WHERE id = ?', ['abc']);
    expect(bindings).toEqual([['abc']]);
  });
});

describe('all', () => {
  it('returns the results array', async () => {
    const { db } = makeDb([{ id: '1' }, { id: '2' }]);
    const rows = await all<{ id: string }>(db, 'SELECT id FROM products', []);
    expect(rows).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('returns an empty array when no rows match', async () => {
    const { db } = makeDb([]);
    const rows = await all(db, 'SELECT * FROM products WHERE 0', []);
    expect(rows).toEqual([]);
  });
});

describe('run', () => {
  it('returns meta with changes count', async () => {
    const { db } = makeDb([{ any: 'thing' }]);
    const result = await run(db, 'DELETE FROM products WHERE id = ?', ['x']);
    expect(result.success).toBe(true);
    expect(result.meta.changes).toBe(1);
  });
});
