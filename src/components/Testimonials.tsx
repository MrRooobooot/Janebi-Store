import React, { useEffect, useState } from 'react';
import { Star, MessageSquareQuote } from 'lucide-react';
import { motion } from 'motion/react';

interface Review {
  id: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  isVerifiedBuyer?: boolean;
}

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);

  // Real customer reviews from the database — the previous static
  // fabricated quotes were misleading and legally risky.
  useEffect(() => {
    fetch('/api/reviews/latest')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setReviews(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => setReviews([]));
  }, []);

  return (
    <section className="mt-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-3 tracking-tight">
          <span className="w-2.5 h-8 bg-orange-600 dark:bg-orange-500 rounded-full shadow-sm"></span>
          نظرات و تجربیات مشتریان
        </h2>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center">
          <MessageSquareQuote className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            هنوز نظری ثبت نشده است. شما اولین نفر باشید — پس از خرید، تجربه‌تان را با ما به اشتراک بگذارید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35 }}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center font-black text-sm border border-orange-200/50 dark:border-orange-800/50">
                      {review.userName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{review.userName}</h4>
                      {review.isVerifiedBuyer && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">خریدار تأییدشده</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-current' : 'text-gray-200 dark:text-gray-700'}`} />
                    ))}
                  </div>
                </div>
                {review.title && (
                  <p className="font-bold text-xs text-gray-800 dark:text-gray-200 mb-1.5">{review.title}</p>
                )}
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-4">
                  «{review.comment}»
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
