import { authFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, Tag, 
  ChevronRight, LogOut, MessageSquare, Mail, MailCheck, Menu, X, 
  Sun, Moon, ExternalLink, AlertTriangle, ShieldAlert, ArrowRight
} from 'lucide-react';
import Logo, { LogoSymbol } from '../Logo';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState({
    pendingOrders: 0,
    lowStock: 0,
    totalProducts: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    
    // Fetch live synchronized admin statistics
    authFetch('/api/admin/stats', { headers, credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data?.metrics || data?.statusCounts) {
          const pending = (data.statusCounts?.pending_payment || 0) + (data.statusCounts?.processing || 0);
          setCounts({
            pendingOrders: pending,
            lowStock: data.metrics?.lowStockCount || 0,
            totalProducts: data.metrics?.totalProducts || 0,
            totalUsers: data.metrics?.totalUsers || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="max-w-md w-full bg-zinc-50 dark:bg-zinc-900/60 rounded-3xl p-8 text-center shadow-xl border border-zinc-200/80 dark:border-zinc-800">
          <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-full inline-block mb-6">
            <ShieldAlert className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-white mb-4">دسترسی غیرمجاز</h1>
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
    { to: "/admin", icon: LayoutDashboard, label: "داشبورد و آمار کلان", exact: true },
    { 
      to: "/admin/products", 
      icon: Package, 
      label: "مدیریت محصولات و انبار", 
      badge: counts.lowStock > 0 ? `${counts.lowStock} کم‌موجود` : null,
      badgeColor: 'bg-amber-500'
    },
    { 
      to: "/admin/orders", 
      icon: ShoppingCart, 
      label: "سفارشات مشتریان", 
      badge: counts.pendingOrders > 0 ? `${counts.pendingOrders} در انتظار` : null,
      badgeColor: 'bg-rose-500'
    },
    { to: "/admin/reviews", icon: MessageSquare, label: "نظرات کاربران" },
    { to: "/admin/users", icon: Users, label: "کاربران و مشتریان VIP" },
    { to: "/admin/coupons", icon: Tag, label: "کدهای تخفیف و پروموشن" },
    { to: "/admin/messages", icon: Mail, label: "پیام‌های تماس و پشتیبانی" },
    { to: "/admin/newsletter", icon: MailCheck, label: "لیست اعضای خبرنامه" },
    { to: "/admin/settings", icon: Settings, label: "تنظیمات فروشگاه" },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-zinc-50/95 dark:bg-zinc-900/60 backdrop-blur-xl border-l border-zinc-200/80 dark:border-zinc-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
            <LogoSymbol className="w-6 h-6" />
          </div>
          <div>
            <span className="text-sm font-black text-[var(--color-text-main-light)] dark:text-white">
              جانبی <span className="text-orange-500">آرنا</span>
            </span>
            <span className="block text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-widest font-mono">ADMIN PANEL</span>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors motion-reduce:transition-none"
            title={isDarkMode ? 'حالت روز' : 'حالت شب'}
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="بستن منو"
            className="lg:hidden w-11 h-11 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Admin User Info Card */}
      <div className="p-3.5 mx-3 my-3 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-3">
        <img 
          src={user.avatar || '/avatar.svg'} 
          alt={user.name} 
          className="w-10 h-10 rounded-xl border border-orange-500/30 object-cover shrink-0"
        />
        <div className="overflow-hidden grow">
          <div className="font-bold text-[var(--color-text-main-light)] dark:text-white text-xs truncate">{user.name}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            مدیر سیستم (آنلاین)
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => 
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/25' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 hover:text-[var(--color-text-main-light)] dark:hover:text-gray-100'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white shadow-xs ${item.badgeColor || 'bg-rose-500'}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Utility Actions */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
        <Link
          to="/"
          target="_blank"
          className="flex items-center justify-between w-full px-3.5 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xs font-bold transition-all"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-orange-500" />
            <span>مشاهده فروشگاه</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
        </Link>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="flex items-center gap-2 w-full px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span>خروج از پنل</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-right transition-colors duration-300 motion-reduce:transition-none">
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden lg:block fixed inset-y-0 right-0 z-30 shadow-xs">
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
              className="fixed inset-y-0 right-0 w-72 z-50 lg:hidden shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 lg:mr-64 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-zinc-50/90 dark:bg-zinc-900/60 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800 p-3.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="باز کردن منوی مدیریت"
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center shadow-xs">
              <LogoSymbol className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-[var(--color-text-main-light)] dark:text-white">
              جانبی <span className="text-orange-500">آرنا</span>
            </span>
            <span className="text-[9px] bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-black px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-900/50">مدیریت</span>
          </div>
          <button
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'تغییر به حالت روز' : 'تغییر به حالت شب'}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors motion-reduce:transition-none"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
