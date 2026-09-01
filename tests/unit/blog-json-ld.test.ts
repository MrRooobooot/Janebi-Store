import { describe, it, expect } from 'vitest';
import { buildBlogPostingJsonLd } from '../../src/lib/blogJsonLd';

const basePost = {
  id: 'p1',
  title: 'راهنمای خرید پاوربانک',
  excerpt: 'راهنمای کامل انتخاب پاوربانک مناسب',
  body: 'پاراگراف اول\n\nپاراگراف دوم',
  image: '/blog/cover.jpg',
  author: 'تیم جانبی آرنا',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T08:30:00.000Z',
};

describe('buildBlogPostingJsonLd — honesty gate', () => {
  it('builds valid JSON-LD from real fields', () => {
    const jsonLd = buildBlogPostingJsonLd(basePost, 'https://janebiarena.ir');
    expect(jsonLd).not.toBeNull();
    // Must serialize to valid JSON
    const parsed = JSON.parse(JSON.stringify(jsonLd));
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@type']).toBe('BlogPosting');
    expect(parsed.headline).toBe(basePost.title);
    expect(parsed.datePublished).toBe('2026-09-01T10:00:00.000Z');
    expect(parsed.dateModified).toBe('2026-09-02T08:30:00.000Z');
    expect(parsed.author).toEqual({ '@type': 'Person', name: basePost.author });
    expect(parsed.image).toEqual(['https://janebiarena.ir/blog/cover.jpg']);
    expect(parsed.description).toBe(basePost.excerpt);
    expect(parsed.articleBody).toBe(basePost.body);
    expect(parsed.mainEntityOfPage).toBe('https://janebiarena.ir/blog');
    expect(parsed.inLanguage).toBe('fa-IR');
    expect(parsed.articleSection).toBeUndefined();
    expect(parsed.speakable).toEqual({
      '@type': 'SpeakableSpecification',
      cssSelector: ['.blog-article-title', '.blog-article-body'],
    });
  });

  it('emits articleSection only when the post has a category', () => {
    const jsonLd = buildBlogPostingJsonLd({ ...basePost, category: 'شارژ و باتری' }) as Record<string, unknown>;
    expect(jsonLd.articleSection).toBe('شارژ و باتری');
  });

  it('omits speakable when the post has no body', () => {
    const jsonLd = buildBlogPostingJsonLd({ ...basePost, body: '' }) as Record<string, unknown>;
    expect('speakable' in jsonLd).toBe(false);
  });

  it('omits dateModified when the post has no updatedAt', () => {
    const { updatedAt: _omit, ...post } = basePost;
    const jsonLd = buildBlogPostingJsonLd(post) as Record<string, unknown>;
    expect('dateModified' in jsonLd).toBe(false);
    expect('datePublished' in jsonLd).toBe(true);
  });

  it('omits image when the post has no image', () => {
    const jsonLd = buildBlogPostingJsonLd({ ...basePost, image: null }) as Record<string, unknown>;
    expect('image' in jsonLd).toBe(false);
  });

  it('omits author when the author name is empty', () => {
    const jsonLd = buildBlogPostingJsonLd({ ...basePost, author: '' }) as Record<string, unknown>;
    expect('author' in jsonLd).toBe(false);
  });

  it('omits datePublished when createdAt is not a real date', () => {
    const jsonLd = buildBlogPostingJsonLd({ ...basePost, createdAt: 'not-a-date' }) as Record<string, unknown>;
    expect('datePublished' in jsonLd).toBe(false);
  });

  it('returns null when there is no headline (no fabricated data)', () => {
    expect(buildBlogPostingJsonLd({ ...basePost, title: '   ' })).toBeNull();
  });

  it('never emits undefined values (JSON round-trip has no null fields from missing data)', () => {
    const sparse = {
      id: 'x',
      title: 'تیتر',
      excerpt: '',
      body: '',
      image: null,
      author: null,
      createdAt: null,
      updatedAt: null,
    };
    const jsonLd = buildBlogPostingJsonLd(sparse) as Record<string, unknown>;
    const parsed = JSON.parse(JSON.stringify(jsonLd));
    for (const value of Object.values(parsed)) {
      expect(value === undefined).toBe(false);
    }
    expect('image' in parsed).toBe(false);
    expect('author' in parsed).toBe(false);
    expect('datePublished' in parsed).toBe(false);
  });
});
