export async function first<T>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const stmt = db.prepare(sql).bind(...params);
  return (await stmt.first<T>()) ?? null;
}

export async function all<T>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.all<T>();
  return result.results ?? [];
}

export async function run(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<{ success: boolean; meta: { changes: number } }> {
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.run();
  return { success: result.success, meta: { changes: result.meta?.changes ?? 0 } };
}
