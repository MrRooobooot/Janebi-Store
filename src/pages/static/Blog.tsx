import React, { useEffect, useState } from 'react';
import { Clock, Calendar, ArrowLeft, ArrowRight, BookOpen, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80';

export default function Blog() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openArticle, setOpenArticle] = useState<Article | null>(null);

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
                date: new Date(r.createdAt).toLocaleDateString('fa-IR'),
                readTime: r.readTime || null,
                category: r.category || 'مقالات',
                author: r.author || 'تیم جانبی آرنا',
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-lg shadow-orange-500/20">
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
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
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse">
              <div className="aspect-video bg-gray-100 dark:bg-gray-800" />
              <div className="p-6 space-y-3">
                <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-3 w-5/6 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/40 rounded-2xl p-8 text-center">
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
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center">
          <BookOpen className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.08, 0.4) }}
                onClick={() => setOpenArticle(art)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setOpenArticle(art); }}
                aria-label={`خواندن مقاله: ${art.title}`}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg dark:hover:shadow-black/30 hover:border-orange-200 dark:hover:border-gray-700 transition-all duration-300 flex flex-col group h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <div className="aspect-video w-full relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                  <img src={art.image || FALLBACK_IMAGE} alt={art.title} loading="lazy" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute top-3 right-3 bg-orange-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                    {art.category}
                  </span>
                </div>

                <div className="p-6 flex flex-col grow justify-between">
                  <div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {art.date}</span>
                      {art.readTime && (
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {art.readTime}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {art.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3 mb-6">
                      {art.excerpt}
                    </p>
                    {paragraphs[0] && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed line-clamp-2 mb-2">{paragraphs[0]}</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-bold text-orange-600 dark:text-orange-400">
                    <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-medium text-[11px]">
                      <User className="h-3.5 w-3.5" /> {art.author}
                    </span>
                    <span className="flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
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
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={openArticle.title}
              className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-900">
                <img src={openArticle.image || FALLBACK_IMAGE} alt={openArticle.title} className="object-cover w-full h-full" />
                <button
                  onClick={() => setOpenArticle(null)}
                  aria-label="بستن مقاله"
                  className="absolute top-4 left-4 w-9 h-9 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
                <span className="absolute top-4 right-4 bg-orange-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
                  {openArticle.category}
                </span>
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {openArticle.date}</span>
                  {openArticle.readTime && (
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {openArticle.readTime}</span>
                  )}
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {openArticle.author}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 leading-relaxed mb-6">
                  {openArticle.title}
                </h2>

                <div className="space-y-4">
                  {openArticle.body.split('\n\n').filter(Boolean).map((para, i) => (
                    <p key={i} className="text-sm text-gray-700 dark:text-gray-300 leading-loose">
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
