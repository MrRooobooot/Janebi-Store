import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, ArrowLeft, Clock, TrendingUp, Tag, Sparkles, LoaderCircle, Command,
  Smartphone, Shield, Zap, Cable, Headphones, BatteryCharging, SearchX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SearchItemSkeleton } from './Skeletons';

interface Product {
  id: number;
  title: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  brand: string;
}

interface HeaderSearchProps {
  onSearchSubmit?: () => void;
  className?: string;
  autoFocus?: boolean;
}

const POPULAR_CATEGORIES = [
  { name: 'قاب و کاور', icon: Smartphone },
  { name: 'گلس', icon: Shield },
  { name: 'شارژر', icon: Zap },
  { name: 'کابل', icon: Cable },
  { name: 'هندزفری', icon: Headphones },
  { name: 'پاوربانک', icon: BatteryCharging },
];

export default function HeaderSearch({ onSearchSubmit, className = '', autoFocus = false }: HeaderSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Listen for Global Cmd+K / Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Load recent searches on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save recent search
  const saveRecentSearch = (searchTerm: string) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recent_searches', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('recent_searches');
  };

  const removeRecentSearch = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== item);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(query.trim())}`)
        .then(res => res.json())
        .then((data: Product[]) => {
          setResults(data);
          setLoading(false);
          setSelectedIndex(-1);
        })
        .catch(() => {
          setResults([]);
          setLoading(false);
        });
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    saveRecentSearch(query);
    setIsOpen(false);
    if (onSearchSubmit) onSearchSubmit();
    navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectProduct = (product: Product) => {
    saveRecentSearch(product.title);
    setIsOpen(false);
    if (onSearchSubmit) onSearchSubmit();
    navigate(`/product/${product.id}`);
  };

  const handleSelectCategory = (categoryName: string) => {
    saveRecentSearch(categoryName);
    setIsOpen(false);
    if (onSearchSubmit) onSearchSubmit();
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        e.preventDefault();
        handleSelectProduct(results[selectedIndex]);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="relative z-30">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="جست‌وجوی محصول، برند یا مدل گوشی..."
            className="w-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/60 text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-xs sm:text-sm rounded-2xl pl-16 pr-11 py-3 focus:outline-none focus:bg-[var(--color-surface-light)] dark:focus:bg-gray-900 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all duration-200 shadow-inner dark:shadow-none placeholder-gray-400 dark:placeholder-gray-500"
          />

          {/* Right Icon: Search */}
          <button
            type="submit"
            aria-label="جستجو"
            className="absolute right-3.5 flex items-center justify-center text-gray-400 hover:text-orange-600 transition-colors"
            title="جستجو"
          >
            <Search className="h-4 sm:h-5 w-4 sm:w-5" />
          </button>

          {/* Left Actions: Cmd+K Badge or Clear / Spinner */}
          <div className="absolute left-3 flex items-center gap-1.5">
            {loading && (
              <LoaderCircle className="h-4 w-4 animate-spin text-orange-600" />
            )}
            {query && !loading ? (
              <button
                type="button"
                aria-label="پاک کردن"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="پاک کردن"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-gray-200/70 dark:bg-gray-700/70 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Real-time Suggestions Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 left-0 mt-2 bg-[var(--color-surface-light)]/98 dark:bg-[var(--color-surface-dark)]/98 backdrop-blur-2xl rounded-3xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-2xl overflow-hidden z-50 divide-y divide-gray-100 dark:divide-gray-800/60 max-h-[75vh] flex flex-col"
          >
            {/* Case 1: Query is entered and has results */}
            {query.trim().length > 0 && results.length > 0 && (
              <div className="overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/40">
                <div className="p-3 bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 px-4">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                    پیشنهادات آنی ({results.length.toLocaleString('fa-IR')} محصول)
                  </span>
                  <span className="text-[11px] hidden sm:inline text-gray-400">
                    با کلیدهای جهت‌نما یا کلیک انتخـاب کنید
                  </span>
                </div>

                <div className="p-2 space-y-1">
                  {results.map((product, index) => {
                    const isSelected = selectedIndex === index;
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-800/40 shadow-xs'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 overflow-hidden">
                          <div className="w-12 h-12 bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-xl p-1 border border-[var(--color-border-light)] dark:border-gray-700/60 shrink-0 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                            <img
                              src={product.image}
                              alt={product.title}
                              className="w-10 h-10 object-contain mix-blend-multiply dark:mix-blend-normal"
                            />
                          </div>
                          <div className="truncate text-right">
                            <h4 className="font-bold text-xs sm:text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] truncate group-hover:text-orange-600 transition-colors">
                              {product.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[11px]">
                              <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md font-medium">
                                <Tag className="h-3 w-3 text-orange-500" />
                                {product.category}
                              </span>
                              <span className="text-gray-400 dark:text-gray-500">|</span>
                              <span className="text-gray-500 dark:text-gray-400 font-medium">
                                برند: {product.brand}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-left pl-1">
                          <div className="text-xs sm:text-sm font-black text-orange-600 dark:text-orange-500">
                            {product.price.toLocaleString('fa-IR')}{' '}
                            <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">تومان</span>
                          </div>
                          {product.originalPrice && (
                            <div className="text-[10px] text-gray-400 line-through">
                              {product.originalPrice.toLocaleString('fa-IR')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Link to full search page */}
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="w-full p-3 bg-gray-50/80 dark:bg-gray-800/50 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]"
                >
                  <span>مشاهده تمامی نتایج برای «{query}»</span>
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Case 2: Query entered, loading state */}
            {query.trim().length > 0 && loading && results.length === 0 && (
              <div className="p-3 space-y-2 text-right">
                <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-400 font-semibold">
                  <span>در حال جستجوی محصولات...</span>
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin text-orange-600" />
                </div>
                {[1, 2, 3].map((i) => (
                  <SearchItemSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Case 3: Query entered, no results found */}
            {query.trim().length > 0 && !loading && results.length === 0 && (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto">
                  <SearchX className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
                  هیچ محصولی با عنوان «{query}» پیدا نشد!
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  لطفاً املای کلمه را بررسی کنید یا عبارت دیگری مثل برند یا دسته‌بندی را وارد کنید.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setIsOpen(true);
                      inputRef.current?.focus();
                    }}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 dark:bg-orange-950/50 px-4 py-2 rounded-xl transition-colors"
                  >
                    پاک کردن عبارت جستجو
                  </button>
                </div>
              </div>
            )}

            {/* Case 4: Query is empty - Show Recent Searches & Popular Categories */}
            {!query.trim() && (
              <div className="p-4 space-y-5 text-right">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        جستجوهای اخیر
                      </span>
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                      >
                        پاک کردن تاریخچه
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((item, idx) => (
                        <span
                          key={idx}
                          onClick={() => {
                            setQuery(item);
                            setIsOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-950/50 hover:text-orange-600 dark:hover:text-orange-400 text-gray-700 dark:text-gray-300 text-xs font-medium px-3 py-1.5 rounded-xl cursor-pointer transition-all border border-gray-200/50 dark:border-gray-700/40"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            aria-label={`حذف ${item} از جستجوهای اخیر`}
                            onClick={(e) => removeRecentSearch(e, item)}
                            className="text-gray-400 hover:text-red-500 p-0.5 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Categories */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      دسته‌بندی‌های پرطرفدار
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {POPULAR_CATEGORIES.map((cat, idx) => {
                      const CategoryIcon = cat.icon;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectCategory(cat.name)}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-orange-50 dark:hover:bg-orange-950/40 border border-[var(--color-border-light)] dark:border-gray-700/40 cursor-pointer transition-all group"
                        >
                          <div className="p-1.5 rounded-lg bg-orange-100/70 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                            <CategoryIcon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {cat.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
