import React, { useState } from 'react';
import { Clock, Calendar, ArrowLeft, ArrowRight, BookOpen, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Article {
  id: number;
  title: string;
  excerpt: string;
  body: string[];
  image: string;
  date: string;
  readTime: string;
  category: string;
  author: string;
}

const ARTICLES: Article[] = [
  {
    id: 1,
    title: 'راهنمای کامل خرید شارژر دیواری: توان وات واقعی و استاندارد PD چیست؟',
    excerpt: 'بررسی جامع تفاوت‌های شارژرهای فست شارژ ۲۰، ۲۵ و ۶۵ وات و نحوه انتخاب توان مناسب برای حفظ سلامت باتری آیفون و سامسونگ.',
    body: [
      'توان (وات) یک شارژر از ضرب ولتاژ در جریان به دست می‌آید، اما عدد روی جعبه همیشه توان واقعی تحویلی به گوشی نیست. پروتکل‌های شارژ سریع مانند USB Power Delivery (PD) و Qualcomm Quick Charge بین شارژر و دستگاه «مذاکره» می‌کنند تا بهترین ترکیب ولتاژ/جریان را انتخاب کنند.',
      'برای آیفون‌های جدید، یک شارژر ۲۰ وات با پشتیبانی PD عملاً حداکثر سرعت مجاز را ارائه می‌دهد و توان بالاتر صرفاً برای تبلت یا لپ‌تاپ کاربرد دارد. گوشی‌های سامسونگ پرچمدار معمولاً از شارژ ۲۵ وات (Super Fast Charging) بهره می‌برند.',
      'نکته مهم حفظ سلامت باتری است: گرمای بیش از حد دشمن اصلی باتری لیتیومی است. شارژر اورجینال یا دارای گواهی رسمی، مدار محافظتی استاندارد دارد و دمای دستگاه را در محدوده امن نگه می‌دارد. هنگام خرید به استاندارد PD، گارانتی اصالت و کیفیت کابل همراه شارژر توجه کنید — یک کابل بی‌کیفیت می‌تواند سرعت شارژ را به نصف برساند.',
    ],
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
    date: '۱۸ مرداد ۱۴۰۳',
    readTime: '۵ دقیقه',
    category: 'راهنمای خرید',
    author: 'مهندس رضایی',
  },
  {
    id: 2,
    title: 'تفاوت گلس شیشه‌ای و سرامیکی: کدام محافظ صفحه ارزش خرید بیشتری دارد؟',
    excerpt: 'مقایسه سختی، مقایسه در برابر ضربه و خرد شدگی گلس‌های سرامیکی انعطاف‌پذیر با گلس‌های شیشه‌ای ۹H.',
    body: [
      'گلس شیشه‌ای معمولی با سختی ۹H در برابر خط و خش ناشی از تماس با کلید، سکه و شن عملکرد عالی دارد؛ اما ماهیتش شکننده است و در ضربه سنگین ممکن است خودش خرد شود — که اتفاقاً یعنی انرژی ضربه را به جای صفحه گوشی جذب کرده است.',
      'گلس سرامیکی (Ceramic Film) نسل جدیدتری است: لایه‌ای انعطاف‌پذیر با نانوذرات سرامیکی که در برابر خطوط مثل شیشه رفتار می‌کند ولی در برابر ضربه نمی‌شکند و لبه‌ها به‌خوبی روی صفحه فرورفتگی (Curved) می‌نشیند.',
      'جمع‌بندی: اگر اولویت شما حس لمس شیشه‌ای و مقاومت خط و خش است، گلس شیشه‌ای ۹H انتخاب مطمئنی است. اگر گوشی شما صفحه خمیده دارد یا مرتب با ضربه روبرو می‌شود، گلس سرامیکی پوشش پایدارتری می‌دهد. در هر دو مورد، نصب بدون حباب و بدون گردوغبار تعیین‌کننده‌ترین عامل عمر مفید گلس است.',
    ],
    image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=600&q=80',
    date: '۱۲ مرداد ۱۴۰۳',
    readTime: '۴ دقیقه',
    category: 'مقایسه و بررسی',
    author: 'مریم احمدی',
  },
  {
    id: 3,
    title: 'فناوری مگ‌سیف (MagSafe) چیست و چه کاردهایی در اکوسیستم اپل دارد؟',
    excerpt: 'همه چیز درباره سرعت شارژ ۱۵ وات مغناطیسی، قاب‌های سازگار با مگ‌سیف و لوازم جانبی کاربردی این فناوری.',
    body: [
      'MagSafe مجموعه‌ای از آهنرباهای دقیق دور شارژ بی‌سیم آیفون‌های ۱۲ به بعد است که شارژر را در زاویه بهینه قفل می‌کند و اجازه می‌دهد تا ۱۵ وات قدرت منتقل شود — تقریباً دو برابر شارژ بی‌سیم استاندارد Qi.',
      'کاربرد مگ‌سیف فقط شارژ نیست: کیف پول مغناطیسی، پایه‌های نگهدارنده خودرو و رومیزی، و حتی قاب‌های MagSafe که لوازم جانبی را بدون چسب و گیره متصل می‌کنند، همگی روی همین حلقه آهنربایی سوار می‌شوند.',
      'برای تجربه کامل، قاب گوشی باید «MagSafe Compatible» باشد؛ قاب‌های ضخیم غیرسازگار شدت میدان مغناطیسی را کم می‌کنند و سرعت شارژ به ۷.۵ وات سقوط می‌خورد. شارژرهای شخص ثالث باید دارای گواهی Made for iPhone (MFi) باشند تا هم سرعت کامل و هم ایمنی باتری تضمین شود.',
    ],
    image: 'https://images.unsplash.com/photo-1603313011101-320f26a4f6f6?auto=format&fit=crop&w=600&q=80',
    date: '۰۵ مرداد ۱۴۰۳',
    readTime: '۶ دقیقه',
    category: 'تکنولوژی',
    author: 'تیم فنی جانبی آرنا',
  },
];

export default function Blog() {
  const [openArticle, setOpenArticle] = useState<Article | null>(null);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ARTICLES.map((art, idx) => (
          <motion.article
            key={art.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            onClick={() => setOpenArticle(art)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setOpenArticle(art); }}
            aria-label={`خواندن مقاله: ${art.title}`}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg dark:hover:shadow-black/30 hover:border-orange-200 dark:hover:border-gray-700 transition-all duration-300 flex flex-col group h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <div className="aspect-video w-full relative overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img src={art.image} alt={art.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
              <span className="absolute top-3 right-3 bg-orange-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                {art.category}
              </span>
            </div>

            <div className="p-6 flex flex-col grow justify-between">
              <div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {art.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {art.readTime}</span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {art.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3 mb-6">
                  {art.excerpt}
                </p>
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
        ))}
      </div>

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
              <div className="relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img src={openArticle.image} alt={openArticle.title} className="object-cover w-full h-full" />
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
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {openArticle.readTime}</span>
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {openArticle.author}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 leading-relaxed mb-6">
                  {openArticle.title}
                </h2>

                <div className="space-y-4">
                  {openArticle.body.map((para, i) => (
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
