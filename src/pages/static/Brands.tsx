import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Award, Search, Sparkles, Star } from 'lucide-react';
import { motion } from 'motion/react';
import BrandLogo from '../../components/BrandLogo';
import { toPersianDigits } from '../../lib/utils';

interface BrandInfo {
  name: string;
  faName: string;
  category: string;
  image: string;
  count: number;
  desc: string;
  tags: string[];
  isFeatured?: boolean;
}

const BRANDS_DIRECTORY: BrandInfo[] = [
  { 
    name: 'Anker', 
    faName: 'انکر', 
    category: 'شارژ و پاوربانک',
    image: 'https://images.unsplash.com/photo-1609592424074-32b00ff37207?auto=format&fit=crop&w=600&q=80',
    count: 24, 
    desc: 'پیشرو در فناوری شارژ سریع GaN، پاوربانک‌های فوق‌العاده باکیفیت و کابل‌های مقاوم نایلونی.',
    tags: ['شارژ سریع GaN', 'پاوربانک', 'کابل PowerLine'],
    isFeatured: true
  },
  { 
    name: 'Apple', 
    faName: 'اپل', 
    category: 'اکوسیستم اپل',
    image: 'https://images.unsplash.com/photo-1603313011101-320f26a4f6f6?auto=format&fit=crop&w=600&q=80',
    count: 35, 
    desc: 'اکسسوری و تجهیزات جانبی با گواهی MFi سازگار با انواع آیفون، آیپد و اپل واچ.',
    tags: ['تاییدیه MFi', 'MagSafe', 'شارژر اورجینال'],
    isFeatured: true
  },
  { 
    name: 'Samsung', 
    faName: 'سامسونگ', 
    category: 'شارژ و لوازم گلکسی',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80',
    count: 28, 
    desc: 'شارژرهای سوپرفست اصلی ۴۵ و ۲۵ وات، هندزفری‌های تایپ‌سی و گلس‌های محافظ صفحه.',
    tags: ['Super Fast 45W', 'هندزفری AKG', 'گلس نمایشگر'],
    isFeatured: true
  },
  { 
    name: 'Baseus', 
    faName: 'بیسوس', 
    category: 'هولدر و اکسسوری دیجیتال',
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80',
    count: 42, 
    desc: 'طراحی مینیمال و خلاقانه انواع هولدر خودرو، هاب‌های چندکاره Type-C و کابل‌های مانیتورینگ‌دار.',
    tags: ['هولدر خودرو', 'هاب تایپ‌سی', 'کابل شارژ سریع'],
    isFeatured: true
  },
  { 
    name: 'Xiaomi', 
    faName: 'شیائومی', 
    category: 'صوتی و پاوربانک',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80',
    count: 30, 
    desc: 'هندزفری‌های بلوتوثی اقتصادی و باکیفیت سری Redmi Buds و پاوربانک‌های فوق‌باریک آلومینیومی.',
    tags: ['Redmi Buds', 'پاوربانک سبک', 'ساعت هوشمند'],
    isFeatured: true
  },
  { 
    name: 'Nillkin', 
    faName: 'نیلکین', 
    category: 'قاب و محافظ دوربین',
    image: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80',
    count: 18, 
    desc: 'قاب‌های ضدضربه CamShield با درب کشویی محافظت از لنز دوربین و متریال ضد لک.',
    tags: ['CamShield', 'ضد ضربه نظامی', 'محافظ لنز'],
    isFeatured: true
  },
  { 
    name: 'Sony', 
    faName: 'سونی', 
    category: 'صوتی و هندزفری',
    image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80',
    count: 15, 
    desc: 'برترین تکنولوژی نویزکنسلینگ فعال (ANC) و کیفیت صدای بی‌نظیر Hi-Res در هدفون و هندزفری.',
    tags: ['نویزکنسلینگ ANC', 'کیفیت Hi-Res', 'طراحی ارگونومیک']
  },
  { 
    name: 'JBL', 
    faName: 'جی‌بی‌ال', 
    category: 'اسپیکر و صدا',
    image: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=600&q=80',
    count: 12, 
    desc: 'اسپیکرهای بلوتوثی پرتابل ضدآب و هندزفری‌های ورزشی با صدای بیس عمیق Pure Bass.',
    tags: ['Pure Bass', 'ضد آب IPX7', 'باتری قدرتمند']
  },
];

export default function Brands() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', ...Array.from(new Set(BRANDS_DIRECTORY.map(b => b.category)))];

  const filteredBrands = BRANDS_DIRECTORY.filter(b => {
    const matchesSearch = !searchQuery || 
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      b.faName.includes(searchQuery) ||
      b.desc.includes(searchQuery);
    const matchesCat = selectedCategory === 'all' || b.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 text-right"
    >
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-gray-950 via-slate-900 to-gray-900 text-white p-6 sm:p-10 overflow-hidden shadow-xl border border-gray-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold mb-4">
            <Award className="h-4 w-4" />
            <span>۱۰۰٪ محصولات اصلی با هولوگرام اصالت</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black mb-3 tracking-tight">
            برندهای معتبر و شرکای تجاری
          </h1>
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            تمامی محصولات عرضه‌شده در جانبی‌آرنا مستقیماً از نمایندگی‌های رسمی تأمین شده و دارای گارانتی معتبر شرکتی و مهلت تست می‌باشند.
          </p>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="جستجوی برند (مثلاً: انکر، اپل، بیسوس)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl py-2 px-3.5 pr-9 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
              }`}
            >
              {cat === 'all' ? 'همه دسته‌ها' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBrands.map((b, idx) => (
          <motion.div
            key={b.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
          >
            <Link 
              to={`/products?brand=${encodeURIComponent(b.name)}`}
              className="bg-white dark:bg-gray-800/90 rounded-3xl border border-gray-100 dark:border-gray-700/60 p-5 flex flex-col justify-between hover:shadow-xl hover:border-orange-500/40 dark:hover:border-orange-500/40 hover:-translate-y-1.5 transition-all duration-300 group h-full relative overflow-hidden"
            >
              <div>
                {/* Cover Banner */}
                <div className="relative h-40 rounded-2xl overflow-hidden mb-4 bg-gray-100 dark:bg-gray-900">
                  <img 
                    src={b.image} 
                    alt={b.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Item count tag */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1 rounded-full border border-white/10 shadow-xs">
                      {toPersianDigits(b.count)} کالا
                    </span>
                  </div>

                  {b.isFeatured && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-orange-600/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <Star className="h-3 w-3 fill-white" /> نمایندگی رسمی
                      </span>
                    </div>
                  )}
                </div>

                {/* Brand Logo & Name Header */}
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-16 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-700/60 flex items-center justify-center p-2 group-hover:scale-105 transition-transform shrink-0">
                    <BrandLogo name={b.name} size="md" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {b.faName} <span className="font-sans text-xs text-gray-400 font-medium">({b.name})</span>
                    </h3>
                    <span className="text-[11px] text-orange-600/80 dark:text-orange-400/80 font-bold">
                      {b.category}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                  {b.desc}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {b.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-medium bg-gray-50 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-700/40">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/60 text-xs font-bold text-orange-600 dark:text-orange-400">
                <span className="flex items-center gap-1 text-gray-400 font-medium text-[11px]">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> گارانتی معتبر شرکتی
                </span>
                <span className="flex items-center gap-1 group-hover:translate-x-[-4px] transition-transform">
                  مشاهده تمام کالاها <ArrowLeft className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
