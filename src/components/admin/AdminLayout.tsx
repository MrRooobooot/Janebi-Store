import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, LogOut, ArrowRight, 
  ShieldAlert, Tag, Mail, MessageSquare, MailCheck, Settings, Menu, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl p-8 text-center shadow-xl border border-gray-100 dark:border-gray-800">
          <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-full inline-block mb-6">
            <ShieldAlert className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-4">دسترسی غیرمجاز</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            شما اجازه دسترسی به پنل مدیریت را ندارید. لطفاً با حساب کاربری مدیر وارد شوید.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition-all"
          >
            بازگشت به فروشگاه
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: "/admin", icon: LayoutDashboard, label: "داشبورد", exact: true },
    { to: "/admin/products", icon: Package, label: "محصولات و انبار" },
    { to: "/admin/orders", icon: ShoppingCart, label: "سفارشات مشتریان" },
    { to: "/admin/reviews", icon: MessageSquare, label: "نظرات کاربران" },
    { to: "/admin/users", icon: Users, label: "کاربران سیستم" },
    { to: "/admin/coupons", icon: Tag, label: "کدهای تخفیف" },
    { to: "/admin/messages", icon: Mail, label: "پیام‌های تماس" },
    { to: "/admin/newsletter", icon: MailCheck, label: "اعضای خبرنامه" },
    { to: "/admin/settings", icon: Settings, label: "تنظیمات فروشگاه" },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-orange-500">جانبی‌آرنا</span>
          <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 font-bold px-2 py-0.5 rounded-md">پنل مدیریت</span>
        </div>
        <button 
          onClick={() => setMobileOpen(false)} 
          className="lg:hidden p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="p-4 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
        <img 
          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
          alt={user.name} 
          className="w-10 h-10 rounded-full border-2 border-orange-500/20"
        />
        <div className="overflow-hidden">
          <div className="font-bold text-gray-900 dark:text-white text-xs truncate">{user.name}</div>
          <div className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">مدیر ارشد فروشگاه</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl text-xs font-bold transition-all"
        >
          <ArrowRight className="h-4 w-4" />
          مشاهده فروشگاه
        </button>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-xs font-bold transition-all"
        >
          <LogOut className="h-4 w-4" />
          خروج از حساب
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 text-right">
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden lg:block fixed inset-y-0 right-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 right-0 w-72 z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 lg:mr-64 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-orange-500">جانبی‌آرنا</span>
            <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-600 font-bold px-2 py-0.5 rounded-md">مدیریت</span>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

