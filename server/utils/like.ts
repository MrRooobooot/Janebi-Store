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
 * lower() on both sides makes the match explicit instead of relying on LIKE's
 * case folding, and keeps the explicit ESCAPE clause (drizzle's like() has none).
 */
export function likeWithEscape(column: any, pattern: string): SQL {
  return sql`lower(${column}) like lower(${pattern}) escape '\\'`;
}
