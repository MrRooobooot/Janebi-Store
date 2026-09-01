// BlogPosting JSON-LD builder (SEO cluster 2026-09-02c)
// Honesty gate: only fields that actually exist on the fetched post data are
// emitted — no fabricated defaults, no placeholder values.

export interface BlogPostingInput {
  id: string;
  title: string;
  excerpt: string;
  body: string; // paragraphs separated by \n\n
  image?: string | null;
  author?: string | null;
  category?: string | null;
  createdAt?: string | null; // raw ISO date from DB
  updatedAt?: string | null; // raw ISO date from DB (may not exist)
  tags?: string | null; // comma-separated SEO tags from DB
}

/** Resolve a possibly-relative image path against the site origin. */
function absoluteImageUrl(image: string, origin: string): string {
  return image.startsWith('http') ? image : `${origin.replace(/\/$/, '')}${image}`;
}

/**
 * Build a schema.org BlogPosting object from real DB fields only.
 * Returns null when the post lacks a usable headline.
 */
export function buildBlogPostingJsonLd(
  post: BlogPostingInput,
  origin: string = 'https://janebiarena.ir'
): Record<string, unknown> | null {
  const headline = typeof post.title === 'string' ? post.title.trim() : '';
  if (!headline) return null;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline,
    mainEntityOfPage: `${origin.replace(/\/$/, '')}/blog`,
  };

  if (post.id) jsonLd.identifier = post.id;

  // datePublished — only when the DB createdAt parses as a real date
  if (post.createdAt) {
    const d = new Date(post.createdAt);
    if (!Number.isNaN(d.getTime())) jsonLd.datePublished = d.toISOString();
  }

  // dateModified — only when the post actually carries an updatedAt field
  if (post.updatedAt) {
    const d = new Date(post.updatedAt);
    if (!Number.isNaN(d.getTime())) jsonLd.dateModified = d.toISOString();
  }

  // author — only when the DB author name exists and is non-empty
  const author = typeof post.author === 'string' ? post.author.trim() : '';
  if (author) {
    jsonLd.author = { '@type': 'Person', name: author };
  }

  // image — only when a real image path exists
  if (post.image && typeof post.image === 'string' && post.image.trim()) {
    jsonLd.image = [absoluteImageUrl(post.image.trim(), origin)];
  }

  // description — the real excerpt
  const description = typeof post.excerpt === 'string' ? post.excerpt.trim() : '';
  if (description) jsonLd.description = description;

  // articleBody — the real body text
  const articleBody = typeof post.body === 'string' ? post.body.trim() : '';
  if (articleBody) jsonLd.articleBody = articleBody;

  // AEO (answer-engine optimization): the site is fully Persian — declare the
  // language explicitly so voice assistants and AI answer engines serve it
  // to the right locale.
  jsonLd.inLanguage = 'fa-IR';

  // speakable — tell answer engines which parts of the article are safe to
  // read aloud / quote as a direct answer (headline + article body block).
  if (articleBody) {
    jsonLd.speakable = {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.blog-article-title', '.blog-article-body'],
    };
  }

  // articleSection — the real category, when present
  const section = typeof post.category === 'string' ? post.category.trim() : '';
  if (section) jsonLd.articleSection = section;

  // keywords — only the real comma-separated tags; empty/whitespace tags dropped
  const tags = typeof post.tags === 'string' ? post.tags : '';
  const keywords = tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (keywords.length) jsonLd.keywords = keywords;

  return jsonLd;
}
