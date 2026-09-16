/**
 * Single source of truth for "this URL must never be indexed".
 * Consumed by the X-Robots-Tag middleware (server/app.ts) AND by the shell
 * injection in server/index.ts, so the header and the body's <meta name="robots">
 * can never contradict each other (a mismatch made Google report deleted URLs under
 * "Excluded by noindex" instead of "Not found").
 */
const NOINDEX_PREFIXES = [
  "/themes",
  "/wp-",
  "/admin",
  "/checkout",
  "/profile",
  "/cart",
  "/wishlist",
  "/compare",
  "/login",
  "/register",
  "/force-change-password",
];

export function shouldNoIndex(pathname: string, search?: string | URLSearchParams): boolean {
  const lower = (pathname || "").toLowerCase();
  if (NOINDEX_PREFIXES.some((p) => lower.startsWith(p))) return true;

  // ?search=<term> renders an internal search result — never a landing page.
  if (search instanceof URLSearchParams) {
    const q = search.get("search");
    return typeof q === "string" && q.trim().length > 0;
  }
  if (typeof search === "string") {
    const q = new URLSearchParams(search).get("search");
    return typeof q === "string" && q.trim().length > 0;
  }
  return false;
}
