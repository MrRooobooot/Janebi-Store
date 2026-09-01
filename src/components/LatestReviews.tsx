import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareQuote, Star, User } from 'lucide-react';
import { toPersianDigits } from '../lib/utils';

interface LatestReview {
  id: number | string;
  rating?: number;
  comment?: string;
  userName?: string;
  productTitle?: string;
  createdAt?: string;
}

/**
 * Real customer reviews from GET /api/reviews/latest.
 * Renders nothing (no fabricated content) when the list is empty or the
 * request fails. All fields are rendered defensively.
 */
export default function LatestReviews() {
  const [reviews, setReviews] = useState<LatestReview[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews/latest')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('not ok'))))
      .then((data) => {
        if (cancelled) return;
        setReviews(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Not loaded yet, or loaded empty / errored → render nothing at all.
  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="w-full" aria-labelledby="latest-reviews-heading">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <div>
            <h2 id="latest-reviews-heading" className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">
              نظرات مشتریان
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
              تجربه خرید واقعی ثبت‌شده توسط کاربران
            </p>
          </div>
        </div>
        <Link
          to="/products"
          className="text-xs font-black text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
        >
          <span>مشاهده محصولات</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {reviews.map((review) => {
          const rating =
            typeof review.rating === 'number' && review.rating >= 1 && review.rating <= 5
              ? Math.round(review.rating)
              : 0;
          const author = typeof review.userName === 'string' && review.userName.trim() ? review.userName.trim() : 'کاربر جینبی';
          const productTitle =
            typeof review.productTitle === 'string' && review.productTitle.trim()
              ? review.productTitle.trim()
              : null;
          const comment = typeof review.comment === 'string' ? review.comment.trim() : '';
          const dateLabel = formatReviewDate(review.createdAt);

          return (
            <article
              key={review.id ?? `${author}-${dateLabel}`}
              className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-light)] dark:bg-[#0d121c] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-orange-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">{author}</p>
                    {dateLabel && (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{dateLabel}</p>
                    )}
                  </div>
                </div>
                {rating > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0" aria-label={`امتیاز ${toPersianDigits(rating)} از ۵`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-zinc-300 dark:text-zinc-600'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {comment && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-4">
                  {comment}
                </p>
              )}

              {productTitle && (
                <Link
                  to="/products"
                  className="mt-auto pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors truncate"
                >
                  محصول: {productTitle}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function formatReviewDate(iso?: string): string | null {
  if (!iso || typeof iso !== 'string') return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return null;
  }
}
