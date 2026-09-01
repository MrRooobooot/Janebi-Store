import React, { useEffect, useState } from 'react';
import { Clock, Calendar, ArrowLeft, ArrowRight, BookOpen, User, X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useParams } from 'react-router-dom';
import { toPersianDigits } from '../../lib/utils';
import { buildBlogPostingJsonLd } from '../../lib/blogJsonLd';

// Live blog posts from GET /api/blog (admin-managed blog_posts table).
// The previous hardcoded 3-article array is gone.
interface Article {
  id: string;
  title: string;
  excerpt: string;
  body: string; // paragraphs separated by \n\n
  image?: string | null;
  date: string;
  readTime?: string | null;
  category: string;
  author: string;
  createdAt?: string | null; // raw DB date, kept for JSON-LD only
  updatedAt?: string | null; // raw DB date, kept for JSON-LD only
}

const FALLBACK_IMAGE = '/products/cas-4.svg';

export default function Blog() {
  const prefersReducedMotion = useReducedMotion();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openArticle, setOpenArticle] = useState<Article | null>(null);
  const { slug } = useParams<{ slug?: string }>();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/blog')
      .then(async (res) => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then((rows) => {
        if (cancelled) return;
        setArticles(
          Array.isArray(rows)
            ? rows.map((r: any) => ({
                id: r.id,
                title: r.title,
                excerpt: r.excerpt,
                body: r.body || '',
                image: r.image || null,
                date: toPersianDigits(
                  new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(
                    new Date(r.createdAt)
                  )
                ),
                readTime: r.readTime ? toPersianDigits(r.readTime) : null,
                category: r.category || 'مقالات',
                author: r.author || 'تیم جانبی آرنا',
                createdAt: r.createdAt || null,
                updatedAt: r.updatedAt || null,
              }))
            : []
        );
      })
      .catch(() => {
        if (!cancelled) setError('خطا در دریافت مقالات. لطفاً صفحه را دوباره بارگذاری کنید.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep link support: /blog/<slug> where slug is the post's DB id (the only
  // unique identifier in blog_posts). Opens the matching article on load.
  useEffect(() => {
    if (!slug || articles.length === 0) return;
    const match = articles.find((a) => a.id === slug);
    if (match) setOpenArticle(match);
  }, [slug, articles]);

  // JSON-LD Blog schema for the list view (SEO: structured data for the blog
  // index). Emits a blogPost itemList built from the real fetched rows —
  // honesty gate: only fields that exist on each post are included.
  useEffect(() => {
    const scriptId = 'blog-list-jsonld';
    document.getElementById(scriptId)?.remove();
    if (articles.length === 0 || openArticle) return;
    const origin = window.location.origin.replace(/\/$/, '');
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'مجله تخصصی جانبی آرنا',
      url: `${origin}/blog`,
      blogPost: articles
        .filter((a) => a.title?.trim())
        .map((a) => {
          const entry: Record<string, unknown> = {
            '@type': 'BlogPosting',
            headline: a.title,
            mainEntityOfPage: `${origin}/blog/${encodeURIComponent(a.id)}`,
          };
          if (a.excerpt?.trim()) entry.description = a.excerpt;
          if (a.createdAt) {
            const d = new Date(a.createdAt);
            if (!Number.isNaN(d.getTime())) entry.datePublished = d.toISOString();
          }
          if (a.author?.trim()) entry.author = { '@type': 'Person', name: a.author };
          if (a.image?.trim()) {
            entry.image = [a.image.startsWith('http') ? a.image : `${origin}${a.image}`];
          }
          return entry;
        }),
    };
    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [articles, openArticle]);

  // JSON-LD BlogPosting for the open article (SEO: structured data for search
  // engines). Honesty gate: builder emits only fields that exist on the post.
  useEffect(() => {
    const scriptId = 'blog-posting-jsonld';
    if (!openArticle) {
      document.getElementById(scriptId)?.remove();
      return;
    }
    const jsonLd = buildBlogPostingJsonLd(openArticle, window.location.origin);
    document.getElementById(scriptId)?.remove();
    if (!jsonLd) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [openArticle]);

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
      className="space-y-8"
    >
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-lg shadow-orange-500/20">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 bg-[var(--color-surface-light)]/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            <BookOpen className="h-3.5 w-3.5" /> مجله تخصصی جانبی آرنا
          </span>
          <h1 className="text-3xl font-black mb-3 tracking-tight">آخرین اخبار و راهنماهای کاربردی</h1>
          <p className="text-orange-100 text-sm leading-relaxed">
            بررسی جدیدترین گجت‌ها، تکنولوژی‌های شارژ و مقالات آموزشی برای نگهداری بهتر از لوازم جانبی.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden animate-pulse motion-reduce:animate-none">
              <div className="aspect-video bg-zinc-100 dark:bg-zinc-800" />
              <div className="p-6 space-y-3">
                <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
                <div className="h-4 w-2/3 bg-zinc-100 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
                <div className="h-3 w-5/6 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-red-200/80 dark:border-red-900/40 rounded-2xl p-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 font-bold">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && articles.length === 0 && (
        <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-8 text-center">
          <BookOpen className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            هنوز مقاله‌ای منتشر نشده است — به زودی اولین مطالب مجله اینجا قرار می‌گیرد.
          </p>
        </div>
      )}

      {!loading && !error && articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((art, idx) => {
            const paragraphs = art.body.split('\n\n').filter(Boolean);
            return (
              <motion.article
                key={art.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: prefersReducedMotion ? 0 : Math.min(idx * 0.08, 0.4) }}
                onClick={() => setOpenArticle(art)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenArticle(art); } }}
                aria-label={`خواندن مقاله: ${art.title}`}
                className="bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden hover:shadow-lg dark:hover:shadow-black/30 hover:border-orange-300 dark:hover:border-zinc-700 transition-all duration-300 motion-reduce:transition-none flex flex-col group h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <div className="aspect-video w-full relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                  <img src={art.image || FALLBACK_IMAGE} alt={art.title} loading="lazy" decoding="async" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
                  <span className="absolute top-3 right-3 bg-orange-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                    {art.category}
                  </span>
                </div>

                <div className="p-6 flex flex-col grow justify-between">
                  <div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {art.date}</span>
                      {art.readTime && (
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {art.readTime}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-base leading-snug mb-3 h-10 sm:h-11 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors motion-reduce:transition-none">
                      {art.title}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3 mb-6">
                      {art.excerpt}
                    </p>
                    {paragraphs[0] && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed line-clamp-2 mb-2">{paragraphs[0]}</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-orange-600 dark:text-orange-400">
                    <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-medium text-[11px]">
                      <User className="h-3.5 w-3.5" /> {art.author}
                    </span>
                    <span className="flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                      ادامه مقاله <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Article Reader Modal */}
      <AnimatePresence>
        {openArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setOpenArticle(null)}
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { y: 60, opacity: 0 }}
              transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={openArticle.title}
              className="bg-zinc-50 dark:bg-zinc-900 w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xl"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 dark:from-zinc-800 dark:to-zinc-900">
                <img src={openArticle.image || FALLBACK_IMAGE} alt={openArticle.title} decoding="async" loading="lazy" className="object-cover w-full h-full" />
                <button
                  onClick={() => setOpenArticle(null)}
                  aria-label="بستن مقاله"
                  className="absolute top-4 left-4 w-11 h-11 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-colors motion-reduce:transition-none"
                >
                  <X className="h-5 w-5" />
                </button>
                <span className="absolute top-4 right-4 bg-orange-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
                  {openArticle.category}
                </span>
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {openArticle.date}</span>
                  {openArticle.readTime && (
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {openArticle.readTime}</span>
                  )}
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {openArticle.author}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] leading-relaxed mb-6">
                  {openArticle.title}
                </h2>

                <div className="space-y-4">
                  {openArticle.body.split('\n\n').filter(Boolean).map((para, i) => (
                    <p key={i} className="text-sm text-zinc-700 dark:text-zinc-300 leading-loose">
                      {para}
                    </p>
                  ))}
                </div>

                <button
                  onClick={() => setOpenArticle(null)}
                  className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-orange-600 dark:text-orange-400 hover:gap-3 transition-all"
                >
                  <ArrowRight className="h-4 w-4" /> بازگشت به مجله
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
