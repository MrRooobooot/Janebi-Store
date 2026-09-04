import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, CircleCheck, MessageSquarePlus, Filter, Award, Sparkles, Send, UserCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authFetch } from '../lib/api';
import { toPersianDigits } from '../lib/utils';
import { ReviewSkeleton } from './Skeletons';

interface Review {
  id: string;
  productId: number;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  isVerifiedBuyer: boolean;
  recommend: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  userVoted?: 'helpful' | 'unhelpful' | null;
}

interface ProductReviewsProps {
  productId: number;
  initialRating?: number;
  initialReviewsCount?: number;
}


const RATING_LABELS: Record<number, string> = {
  1: 'خیلی ضعیف (۱ از ۵)',
  2: 'ضعیف (۲ از ۵)',
  3: 'متوسط (۳ از ۵)',
  4: 'خوب (۴ از ۵)',
  5: 'عالی (۵ از ۵)',
};

// Persian-digit display for review dates (reviews.date is an ISO/text date)
function formatFaDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return toPersianDigits(iso);
  return toPersianDigits(
    new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
  );
}

export default function ProductReviews({ productId, initialReviewsCount = 0, initialRating = 0 }: ProductReviewsProps) {
  const { isLoggedIn, user } = useAuth();
  const { addToast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const REVIEWS_PAGE_SIZE = 6;
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'helpful'>('helpful');
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [userName, setUserName] = useState('');
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [recommend, setRecommend] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReviews = React.useCallback((targetPage: number) => {
    setLoading(true);
    fetch(`/api/products/${productId}/reviews?page=${targetPage}&limit=${REVIEWS_PAGE_SIZE}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Legacy (non-paginated) shape: full array
          setReviews(data);
          setPages(1);
          setTotal(data.length);
          setPage(1);
        } else {
          setReviews(Array.isArray(data.reviews) ? data.reviews : []);
          setPages(Math.max(1, Number(data.pages) || 1));
          setTotal(Number(data.total) || 0);
          setPage(Math.max(1, Number(data.page) || targetPage));
        }
      })
      .catch(() => {
        setReviews([]);
        setTotal(0);
        setPages(1);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId]);

  // Load reviews from API (no fabricated fallback: empty/error = honest state)
  useEffect(() => {
    loadReviews(1);
  }, [loadReviews]);

  // Calculate Rating Statistics — honest: no rating shown when there are no reviews
  const totalReviews = reviews.length;
  const hasReviews = totalReviews > 0 || Number(initialReviewsCount || 0) > 0;
  const avgRating = totalReviews > 0
    ? toPersianDigits((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
    : null;

  const starCounts = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length;
    const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percentage };
  });

  const recommendedCount = reviews.filter(r => r.recommend).length;
  const recommendPercent = totalReviews > 0 ? Math.round((recommendedCount / totalReviews) * 100) : 0;

  // Submit Handler via API
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName.trim()) {
      addToast('لطفاً نام خود را وارد کنید');
      return;
    }
    if (!reviewTitle.trim()) {
      addToast('لطفاً عنوان نظر خود را وارد کنید');
      return;
    }
    if (!reviewComment.trim() || reviewComment.trim().length < 10) {
      addToast('متن نظر باید حداقل ۱۰ کاراکتر باشد');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      userName: userName.trim(),
      rating: userRating,
      title: reviewTitle.trim(),
      comment: reviewComment.trim(),
      recommend,
      userId: user?.id,
    };

    const token = localStorage.getItem('token');
    authFetch(`/api/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to submit review');
        return res.json();
      })
      .then((newReview: Review) => {
        // Refresh to page 1 so the new (newest-first) review appears
        loadReviews(1);
        setShowForm(false);
        setUserName('');
        setReviewTitle('');
        setReviewComment('');
        setUserRating(5);
        addToast('نظر و امتیاز شما با موفقیت ثبت شد!');
      })
      .catch(() => {
        addToast('خطا در ثبت نظر. لطفاً مجدداً تلاش کنید');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  // Upvote / Downvote Helpful
  const handleVoteHelpful = (reviewId: string, type: 'helpful' | 'unhelpful') => {
    const updated = reviews.map(r => {
      if (r.id !== reviewId) return r;

      if (r.userVoted === type) {
        // Toggle off
        return {
          ...r,
          userVoted: null,
          helpfulCount: type === 'helpful' ? r.helpfulCount - 1 : r.helpfulCount,
          unhelpfulCount: type === 'unhelpful' ? r.unhelpfulCount - 1 : r.unhelpfulCount,
        };
      }

      const prevVote = r.userVoted;
      return {
        ...r,
        userVoted: type,
        helpfulCount: type === 'helpful'
          ? r.helpfulCount + 1
          : (prevVote === 'helpful' ? r.helpfulCount - 1 : r.helpfulCount),
        unhelpfulCount: type === 'unhelpful'
          ? r.unhelpfulCount + 1
          : (prevVote === 'unhelpful' ? r.unhelpfulCount - 1 : r.unhelpfulCount),
      };
    });

    setReviews(updated);
  };

  // Filter & Sort reviews list
  const filteredReviews = reviews
    .filter(r => ratingFilter === 'all' || r.rating === ratingFilter)
    .sort((a, b) => {
      if (sortBy === 'newest') return b.id.localeCompare(a.id);
      if (sortBy === 'highest') return b.rating - a.rating;
      return b.helpfulCount - a.helpfulCount;
    });

  return (
    <div className="space-y-8 text-right">
      {/* Top Overview & Ratings Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gradient-to-br from-zinc-50 to-orange-50/30 dark:from-zinc-800/60 dark:to-zinc-900/60 rounded-3xl p-6 sm:p-8 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        
        {/* Rating Score Card */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/80 shadow-xs text-center">
          {avgRating !== null ? (
            <div className="text-5xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] tracking-tight mb-2">
              {avgRating}
            </div>
          ) : (
            <span
              className="inline-block bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 text-sm font-black px-4 py-2 rounded-full mb-2"
              aria-label="این محصول هنوز امتیازی ثبت نشده است"
            >
              جدید
            </span>
          )}

          <div
            className="flex items-center gap-1 text-yellow-500 mb-2"
            role="img"
            aria-label={avgRating !== null ? `امتیاز ${avgRating} از ۵` : 'هنوز امتیازی ثبت نشده'}
          >
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                aria-hidden="true"
                className={`h-5 w-5 ${
                  avgRating !== null && s <= Math.round(Number(avgRating))
                    ? 'fill-current text-yellow-500'
                    : 'text-zinc-200 dark:text-zinc-700'
                }`}
              />
            ))}
          </div>

          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-4">
            {hasReviews
              ? `از مجموع ${toPersianDigits((total || totalReviews).toLocaleString('fa-IR'))} دیدگاه ثبت‌شده`
              : 'هنوز دیدگاهی برای این محصول ثبت نشده است'}
          </p>

          {totalReviews > 0 && (
            <div className="w-full pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <Award className="h-4 w-4" />
              <span>{toPersianDigits(recommendPercent)}٪ خریداران این محصول را پیشنهاد داده‌اند</span>
            </div>
          )}
        </div>

        {/* Rating Bars Breakdown */}
        <div className="lg:col-span-8 flex flex-col justify-center space-y-2.5 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-6 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/80 shadow-xs">
          <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-orange-500" />
            توزیع امتیاز خریداران (تحلیل امتیاز خریداران):
          </h4>

          {starCounts.map(({ star, count, percentage }) => (
            <div
              key={star}
              onClick={() => setRatingFilter(ratingFilter === star ? 'all' : star)}
              className={`flex items-center gap-3 text-xs cursor-pointer group p-1 rounded-lg transition-colors ${
                ratingFilter === star ? 'bg-orange-50 dark:bg-orange-950/40 font-bold' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center gap-1 w-14 shrink-0 font-bold text-zinc-700 dark:text-zinc-300">
                <span>{toPersianDigits(star)}</span>
                <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />
              </div>

              {/* Progress Bar */}
              <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 group-hover:bg-orange-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <span className="w-12 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                {toPersianDigits(count)} نظر ({toPersianDigits(percentage)}٪)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Header: Filter / Sort / Add Review Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div>
          <h3 className="text-lg font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
            نظرات و بازخورد خریداران
            <span className="text-xs font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 px-2.5 py-0.5 rounded-full">
              {filteredReviews.length.toLocaleString('fa-IR')}
            </span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            شما هم می‌توانید تجربه استفاده خود را از این کالا با دیگران به اشتراک بگذارید.
          </p>
        </div>

        {isLoggedIn ? (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all shrink-0"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>{showForm ? 'بستن فرم ثبت نظر' : 'افزودن نظر جدید'}</span>
          </button>
        ) : (
          <div className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 rounded-xl">
            برای ثبت نظر ابتدا وارد حساب کاربری خود شوید
          </div>
        )}
      </div>

      {/* Interactive Review Form Drawer / Modal Dropdown */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
            onSubmit={handleSubmitReview}
            className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 sm:p-8 border-2 border-orange-500/30 dark:border-orange-500/20 shadow-xl space-y-6 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
              <h4 className="font-black text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
                <Send className="h-4 w-4 text-orange-600" />
                ثبت نظر و امتیاز برای این محصول
              </h4>
              <span className="text-xs text-zinc-400">تمام فیلدها الزامی هستند</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  نام و نام خانوادگی شما
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="مثلاً: علی محمدی"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  عنوان خلاصه نظر
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="مثلاً: کیفیـت ساخت عالی و شارژدهی فوق‌العاده"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            {/* Interactive Star Rating Picker */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                امتیاز شما به کیفیت محصول:
              </label>
              <div className="flex flex-wrap items-center gap-3 bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-[var(--color-border-light)] dark:border-zinc-700/60">
                <div dir="ltr" className="flex items-center gap-1.5 [direction:ltr]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`ثبت امتیاز ${toPersianDigits(star)} از ۵`}
                      aria-pressed={star === userRating}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-lg motion-reduce:transition-none motion-reduce:hover:scale-100"
                    >
                      <Star
                        aria-hidden="true"
                        className={`h-7 w-7 transition-colors motion-reduce:transition-none ${
                          star <= (hoverRating || userRating)
                            ? 'text-yellow-500 fill-yellow-500 drop-shadow-xs'
                            : 'text-zinc-300 dark:text-zinc-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-3 py-1 rounded-xl">
                  {RATING_LABELS[hoverRating || userRating]}
                </span>
              </div>
            </div>

            {/* Comment Text Area */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                متن کامل نظر و تجربه شما
              </label>
              <textarea
                rows={4}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="نقاط قوت، نقاط ضعف و نحوه عملکرد محصول در استفاده روزمره را توضیح دهید..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3.5 text-xs text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500 transition-colors resize-none"
                required
              />
            </div>

            {/* Recommendation Toggle */}
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-[var(--color-border-light)] dark:border-zinc-700/60">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                آیا خرید این محصول را به سایر کاربران پیشنهاد می‌کنید؟
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRecommend(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    recommend
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[var(--color-surface-light)] dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100'
                  }`}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  پیشنهاد می‌کنم
                </button>

                <button
                  type="button"
                  onClick={() => setRecommend(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    !recommend
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-[var(--color-surface-light)] dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100'
                  }`}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  پیشنهاد نمی‌کنم
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-7 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>در حال ارسال...</span>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>ثبت نهایی نظر</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Sorting & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 ml-1">
            <Filter className="h-3.5 w-3.5" />
            فیلتر بر اساس امتیاز:
          </span>

          <button
            onClick={() => setRatingFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              ratingFilter === 'all'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-[var(--color-surface-light)] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100'
            }`}
          >
            همه نظرات
          </button>

          {[5, 4, 3, 2, 1].map(star => (
            <button
              key={star}
              onClick={() => setRatingFilter(star)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                ratingFilter === star
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-[var(--color-surface-light)] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100'
              }`}
            >
              <span>{toPersianDigits(star)}</span>
              <Star className="h-3 w-3 fill-current" />
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">مرتب‌سازی:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[var(--color-surface-light)] dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none"
          >
            <option value="helpful">مفیدترین نظرات</option>
            <option value="newest">جدیدترین نظرات</option>
            <option value="highest">بالاترین امتیاز</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <ReviewSkeleton key={idx} />
          ))
        ) : filteredReviews.length > 0 ? (
          filteredReviews.map((review) => (
            <motion.div
              key={review.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
              className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all motion-reduce:transition-none space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* User Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                    {review.userName.charAt(0)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                        {review.userName}
                      </span>
                      {review.isVerifiedBuyer && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/40">
                          <UserCheck className="h-3 w-3" />
                          خریدار این محصول
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{formatFaDate(review.date)}</span>
                  </div>
                </div>

                {/* Star Badge */}
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-xl text-xs font-black">
                  <span>{toPersianDigits(review.rating.toFixed(1))}</span>
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                </div>
              </div>

              {/* Recommendation Badge */}
              <div className="pt-1">
                {review.recommend ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CircleCheck className="h-3.5 w-3.5" />
                    خرید این محصول را پیشنهاد می‌کنم
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    خرید این محصول را پیشنهاد نمی‌کنم
                  </span>
                )}
              </div>

              {/* Title & Comment */}
              <div>
                <h5 className="font-bold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-1">
                  {review.title}
                </h5>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                  {review.comment}
                </p>
              </div>

              {/* Helpful Votes Footer */}
              <div className="pt-3 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between text-xs text-zinc-400">
                <span>آیا این دیدگاه برای شما مفید بود؟</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVoteHelpful(review.id, 'helpful')}
                    aria-label={`ثبت رای مفید برای این دیدگاه (${review.helpfulCount} رای مفید)`}
                    aria-pressed={review.userVoted === 'helpful'}
                    className={`flex items-center gap-1 px-2.5 min-h-[44px] rounded-lg border text-[11px] font-bold transition-all motion-reduce:transition-none ${
                      review.userVoted === 'helpful'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-600'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                    <span>مفید ({toPersianDigits(review.helpfulCount)})</span>
                  </button>

                  <button
                    onClick={() => handleVoteHelpful(review.id, 'unhelpful')}
                    aria-label={`ثبت رای نامفید برای این دیدگاه (${review.unhelpfulCount} رای نامفید)`}
                    aria-pressed={review.userVoted === 'unhelpful'}
                    className={`flex items-center gap-1 px-2.5 min-h-[44px] rounded-lg border text-[11px] font-bold transition-all motion-reduce:transition-none ${
                      review.userVoted === 'unhelpful'
                        ? 'bg-red-50 dark:bg-red-950/50 border-red-300 text-red-600'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <ThumbsDown className="h-3 w-3" aria-hidden="true" />
                    <span>نامفید ({toPersianDigits(review.unhelpfulCount)})</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center p-8 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-zinc-400 text-xs">
            هیچ نظری با فیلتر انتخابی شما وجود ندارد.
          </div>
        )}
      </div>

      {/* Pagination Controls (Persian) */}
      {!loading && pages > 1 && (
        <nav
          aria-label="صفحه‌بندی نظرات"
          className="flex items-center justify-center gap-3 pt-2"
        >
          <button
            type="button"
            onClick={() => loadReviews(page - 1)}
            disabled={page <= 1}
            aria-label="صفحه قبل"
            className="flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            قبلی
          </button>

          <span
            className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-2 select-none"
            aria-live="polite"
          >
            صفحه {toPersianDigits(page)} از {toPersianDigits(pages)}
          </span>

          <button
            type="button"
            onClick={() => loadReviews(page + 1)}
            disabled={page >= pages}
            aria-label="صفحه بعد"
            className="flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            بعدی
          </button>
        </nav>
      )}
    </div>
  );
}
