import { sql, type SQL } from "drizzle-orm";

/**
 * Escape user input for use inside a SQLite LIKE pattern so that the
 * literal characters `\`, `%`, and `_` are matched literally instead of
 * acting as wildcards. Pair with likeWithEscape() which emits the
 * matching `ESCAPE '\'` clause.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** `%term%` with the term escaped for literal LIKE matching. */
export function containsLikePattern(input: string): string {
  return `%${escapeLikePattern(input)}%`;
}

/** Case-insensitive `%term%` with the term escaped for literal LIKE matching.
 *
 * Dialect note (verified live 2026-09-04): SQLite's LIKE is case-insensitive
 * for ASCII, while PostgreSQL's LIKE is case-sensitive — the same search
 * query returned different result counts per dialect. Comparing lower(column)
 * against the lowered pattern restores identical semantics on both dialects
 * without losing the explicit ESCAPE clause (drizzle's like() has none).
 */
export function likeWithEscape(column: any, pattern: string): SQL {
  return sql`lower(${column}) like lower(${pattern}) escape '\\'`;
}
