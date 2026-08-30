import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, CircleCheck, MessageSquarePlus, Filter, Award, Sparkles, Send, UserCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authFetch } from '../lib/api';
import { ReviewSkeleton } from './Skeletons';

export interface Review {
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

// Initial realistic default reviews per product category/id
const DEFAULT_REVIEWS: Record<number, Review[]> = {
  1: [
    {
      id: 'rev-101',
      productId: 1,
      userName: 'محمد حسینی',
      rating: 5,
      title: 'فوق‌العاده باکیفیت و بادوام',
      comment: 'حدود ۳ ماهه استفاده می‌کنم. سرعت شارژ عالیه و جفت سوکت‌ها کاملاً محکم تو درگاه قرار می‌گیرن. روکشش هم روکش کنفی مقاومه که اصلاً قطع نمیشه.',
      date: '۲ روز پیش',
      isVerifiedBuyer: true,
      recommend: true,
      helpfulCount: 18,
      unhelpfulCount: 1,
    },
    {
      id: 'rev-102',
      productId: 1,
      userName: 'سارا احمدی',
      rating: 4,
      title: 'خوبه ولی کمی سفته',
      comment: 'سرعت شارژ سوپرفست سامسونگ رو قشنگ پشتیبانی می‌کنه. فقط جنس جنس کابل یکم ضخیم و سفته که البته نشونه مقاومت بالای روکششه.',
      date: '۱ هفته پیش',
      isVerifiedBuyer: true,
      recommend: true,
      helpfulCount: 9,
      unhelpfulCount: 2,
    },
    {
      id: 'rev-103',
      productId: 1,
      userName: 'امیررضا کریمی',
      rating: 5,
      title: 'بهترین کابل انکر',
      comment: 'انکر نیازی به تعریف نداره. گارانتی ۱۸ ماهه ایستا هم که روش بود خیالمو راحت کرد.',
      date: '۳ هفته پیش',
      isVerifiedBuyer: false,
      recommend: true,
      helpfulCount: 14,
      unhelpfulCount: 0,
    },
  ],
};

const RATING_LABELS: Record<number, string> = {
  1: 'خیلی ضعیف (۱ از ۵)',
  2: 'ضعیف (۲ از ۵)',
  3: 'متوسط (۳ از ۵)',
  4: 'خوب (۴ از ۵)',
  5: 'عالی (۵ از ۵)',
};

export default function ProductReviews({ productId, initialRating = 4.7, initialReviewsCount = 12 }: ProductReviewsProps) {
  const { isLoggedIn, user } = useAuth();
  const { addToast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Load reviews from API with fallback
  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${productId}/reviews`)
      .then(res => res.json())
      .then(data => {
        setReviews(data);
      })
      .catch(() => {
        const initialList = DEFAULT_REVIEWS[productId] || [];
        setReviews(initialList);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId]);

  // Calculate Rating Statistics
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : initialRating.toFixed(1);

  const starCounts = [5, 4, 3, 2, 1].map(star => {
    const count = reviews.filter(r => r.rating === star).length;
    const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percentage };
  });

  const recommendedCount = reviews.filter(r => r.recommend).length;
  const recommendPercent = totalReviews > 0 ? Math.round((recommendedCount / totalReviews) * 100) : 95;

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
        setReviews(prev => [newReview, ...prev]);
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gradient-to-br from-gray-50 to-orange-50/30 dark:from-gray-800/60 dark:to-gray-900/60 rounded-3xl p-6 sm:p-8 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        
        {/* Rating Score Card */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/80 shadow-xs text-center">
          <div className="text-5xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] tracking-tight mb-2">
            {avgRating}
          </div>

          <div className="flex items-center gap-1 text-yellow-500 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-5 w-5 ${
                  s <= Math.round(Number(avgRating))
                    ? 'fill-current text-yellow-500'
                    : 'text-gray-200 dark:text-gray-700'
                }`}
              />
            ))}
          </div>

          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">
            از مجموع {totalReviews.toLocaleString('fa-IR')} دیدگاه ثبت‌شده
          </p>

          <div className="w-full pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <Award className="h-4 w-4" />
            <span>{recommendPercent}٪ خریداران این محصول را پیشنهاد داده‌اند</span>
          </div>
        </div>

        {/* Rating Bars Breakdown */}
        <div className="lg:col-span-8 flex flex-col justify-center space-y-2.5 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-6 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/80 shadow-xs">
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-orange-500" />
            توزیع امتیاز کاربران:
          </h4>

          {starCounts.map(({ star, count, percentage }) => (
            <div
              key={star}
              onClick={() => setRatingFilter(ratingFilter === star ? 'all' : star)}
              className={`flex items-center gap-3 text-xs cursor-pointer group p-1 rounded-lg transition-colors ${
                ratingFilter === star ? 'bg-orange-50 dark:bg-orange-950/40 font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
              }`}
            >
              <div className="flex items-center gap-1 w-14 shrink-0 font-bold text-gray-700 dark:text-gray-300">
                <span>{star}</span>
                <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />
              </div>

              {/* Progress Bar */}
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-orange-500 group-hover:bg-orange-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <span className="w-12 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                {count.toLocaleString('fa-IR')} نظر ({percentage}٪)
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
          <div className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-xl">
            برای ثبت نظر ابتدا وارد حساب کاربری خود شوید
          </div>
        )}
      </div>

      {/* Interactive Review Form Drawer / Modal Dropdown */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmitReview}
            className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 sm:p-8 border-2 border-orange-500/30 dark:border-orange-500/20 shadow-xl space-y-6 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
              <h4 className="font-black text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
                <Send className="h-4 w-4 text-orange-600" />
                ثبت نظر و امتیاز برای این محصول
              </h4>
              <span className="text-xs text-gray-400">تمام فیلدها الزامی هستند</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  نام و نام خانوادگی شما
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="مثلاً: علی محمدی"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  عنوان خلاصه نظر
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="مثلاً: کیفیـت ساخت عالی و شارژدهی فوق‌العاده"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            {/* Interactive Star Rating Picker */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                امتیاز شما به کیفیت محصول:
              </label>
              <div className="flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-[var(--color-border-light)] dark:border-gray-700/60">
                <div dir="ltr" className="flex items-center gap-1.5 [direction:ltr]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          star <= (hoverRating || userRating)
                            ? 'text-yellow-500 fill-yellow-500 drop-shadow-xs'
                            : 'text-gray-300 dark:text-gray-600'
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
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                متن کامل نظر و تجربه شما
              </label>
              <textarea
                rows={4}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="نقاط قوت، نقاط ضعف و نحوه عملکرد محصول در استفاده روزمره را توضیح دهید..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-xs text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] focus:outline-none focus:border-orange-500 transition-colors resize-none"
                required
              />
            </div>

            {/* Recommendation Toggle */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-[var(--color-border-light)] dark:border-gray-700/60">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                آیا خرید این محصول را به سایر کاربران پیشنهاد می‌کنید؟
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRecommend(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    recommend
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[var(--color-surface-light)] dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
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
                      : 'bg-[var(--color-surface-light)] dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
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
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 ml-1">
            <Filter className="h-3.5 w-3.5" />
            فیلتر بر اساس امتیاز:
          </span>

          <button
            onClick={() => setRatingFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              ratingFilter === 'all'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-[var(--color-surface-light)] dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
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
                  : 'bg-[var(--color-surface-light)] dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
              }`}
            >
              <span>{star}</span>
              <Star className="h-3 w-3 fill-current" />
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 dark:text-gray-400">مرتب‌سازی:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[var(--color-surface-light)] dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none"
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:border-gray-200 dark:hover:border-gray-700 transition-all space-y-3"
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
                    <span className="text-[11px] text-gray-400">{review.date}</span>
                  </div>
                </div>

                {/* Star Badge */}
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-xl text-xs font-black">
                  <span>{review.rating.toFixed(1)}</span>
                  <Star className="h-3.5 w-3.5 fill-current" />
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
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  {review.comment}
                </p>
              </div>

              {/* Helpful Votes Footer */}
              <div className="pt-3 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] flex items-center justify-between text-xs text-gray-400">
                <span>آیا این دیدگاه برای شما مفید بود؟</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVoteHelpful(review.id, 'helpful')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                      review.userVoted === 'helpful'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-600'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>مفید ({review.helpfulCount})</span>
                  </button>

                  <button
                    onClick={() => handleVoteHelpful(review.id, 'unhelpful')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                      review.userVoted === 'unhelpful'
                        ? 'bg-red-50 dark:bg-red-950/50 border-red-300 text-red-600'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <ThumbsDown className="h-3 w-3" />
                    <span>نامفید ({review.unhelpfulCount})</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-gray-400 text-xs">
            هیچ نظری با فیلتر انتخابی شما وجود ندارد.
          </div>
        )}
      </div>
    </div>
  );
}
