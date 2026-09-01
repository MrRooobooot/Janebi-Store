import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Search, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-[60vh] flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="bg-orange-100 dark:bg-orange-900/30 p-6 rounded-full mb-6">
        <AlertTriangle className="h-16 w-16 text-orange-500" />
      </div>
      
      <h1 className="text-6xl sm:text-8xl font-black text-[var(--color-text-main-light)] dark:text-white tracking-tighter mb-4">
        ۴۰۴
      </h1>
      
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        صفحه‌ای که به دنبال آن بودید پیدا نشد!
      </h2>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
        ممکن است آدرس را اشتباه وارد کرده باشید یا صفحه مورد نظر شما حذف شده باشد.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm">
        <Link 
          to="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md shadow-orange-500/20"
        >
          <Home className="h-5 w-5" />
          <span>بازگشت به خانه</span>
        </Link>
        
        <Link 
          to="/products"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[var(--color-surface-light)] dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 px-6 py-3 rounded-xl font-bold transition-all"
        >
          <Search className="h-5 w-5" />
          <span>مشاهده محصولات</span>
        </Link>
      </div>
    </motion.div>
  );
}
