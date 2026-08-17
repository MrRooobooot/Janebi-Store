import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, Trash2, Search, Filter, ThumbsUp, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ReviewItem {
  id: string;
  productId: number;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  isVerifiedBuyer?: boolean;
  recommend?: boolean;
  helpfulCount?: number;
  product?: {
    id: number;
    title: string;
    image: string;
  };
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const { addToast } = useToast();

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/reviews', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDeleteReview = async (id: string) => {
    if (!confirm('آیا از حذف این نظر اطمینان دارید؟')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReviews(prev => prev.filter(r => r.id !== id));
        if (selectedReview?.id === id) setSelectedReview(null);
        addToast('نظر با موفقیت حذف شد', 'success');
      } else {
        addToast('خطا در حذف نظر', 'error');
      }
    } catch {
      addToast('خطا در ارتباط با سرور', 'error');
    }
  };

  const filteredReviews = reviews.filter(r => {
    const matchesRating = ratingFilter === 'all' || r.rating.toString() === ratingFilter;
    const matchesSearch = !searchQuery || 
      r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.product && r.product.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRating && matchesSearch;
  });

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-orange-500" />
            مدیریت نظرات کاربران
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            بررسی، پالایش و حذف نظرات ثبت‌شده روی محصولات
          </p>
        </div>
        <div className="text-xs font-bold text-gray-500 bg-white dark:bg-gray-800 px-3.5 py-2 rounded-xl border border-gray-100 dark:border-gray-700">
          تعداد کل نظرات: <span className="text-orange-600 font-mono font-bold">{reviews.length}</span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="جستجو در نظرات، نام کاربر یا کالا..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl py-2 px-3.5 pr-9 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl py-2 px-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
          >
            <option value="all">همه امتیازها</option>
            <option value="5">۵ ستاره (عالی)</option>
            <option value="4">۴ ستاره (خوب)</option>
            <option value="3">۳ ستاره (متوسط)</option>
            <option value="2">۲ ستاره (ضعیف)</option>
            <option value="1">۱ ستاره (بسیار ضعیف)</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs">در حال بارگذاری نظرات...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">نظری یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                <tr>
                  <th className="p-3.5 font-bold">کاربر</th>
                  <th className="p-3.5 font-bold">محصول</th>
                  <th className="p-3.5 font-bold">امتیاز</th>
                  <th className="p-3.5 font-bold">عنوان و خلاصه نظر</th>
                  <th className="p-3.5 font-bold">تاریخ</th>
                  <th className="p-3.5 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {filteredReviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-gray-900 dark:text-gray-100">{rev.userName}</div>
                      {rev.isVerifiedBuyer && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                          <CheckCircle className="h-3 w-3" /> خریدار
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-[200px]">
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate" title={rev.product?.title || `کد ${rev.productId}`}>
                        {rev.product?.title || `محصول کد ${rev.productId}`}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-amber-500 font-mono">{rev.rating}</span>
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      </div>
                    </td>
                    <td className="p-3.5 max-w-[280px]">
                      <div className="font-bold text-gray-900 dark:text-gray-100">{rev.title}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{rev.comment}</div>
                    </td>
                    <td className="p-3.5 text-gray-500 dark:text-gray-400 text-[11px] whitespace-nowrap">
                      {rev.date}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedReview(rev)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:text-orange-600 font-medium"
                        >
                          مشاهده
                        </button>
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                          title="حذف نظر"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100">جزئیات کامل نظر</h3>
              <button onClick={() => setSelectedReview(null)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">بستن</button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">{selectedReview.userName}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">تاریخ ثبت: {selectedReview.date}</div>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 px-3 py-1.5 rounded-xl font-bold">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-mono text-sm">{selectedReview.rating} از ۵</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-1">کالای مربوطه:</span>
                <div className="font-bold text-gray-900 dark:text-gray-100 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                  {selectedReview.product?.title || `محصول کد ${selectedReview.productId}`}
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-1">عنوان نظر:</span>
                <div className="font-bold text-gray-900 dark:text-gray-100">{selectedReview.title}</div>
              </div>

              <div>
                <span className="text-gray-400 block mb-1">متن دیدگاه:</span>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-gray-800 dark:text-gray-200 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {selectedReview.comment}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="text-[11px] text-gray-500">
                  {selectedReview.recommend ? '✅ خرید این محصول را پیشنهاد می‌کند' : '❌ خرید این محصول را پیشنهاد نمی‌کند'}
                </div>
                <button
                  onClick={() => handleDeleteReview(selectedReview.id)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all"
                >
                  حذف این نظر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
