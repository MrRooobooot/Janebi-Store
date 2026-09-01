import React from 'react';
import { User, Package, MapPin, Settings, Heart, Gift, LogOut, Award, ShieldCheck, ChevronLeft } from 'lucide-react';
import { UserProfile } from '../../contexts/AuthContext';
import { toPersianDigits } from '../../lib/utils';

export type ProfileTabType = 'overview' | 'orders' | 'addresses' | 'info' | 'wishlist' | 'vip';

interface ProfileSidebarProps {
  user: UserProfile;
  activeTab: ProfileTabType;
  setActiveTab: (tab: ProfileTabType) => void;
  onLogoutClick: () => void;
}

export default function ProfileSidebar({
  user,
  activeTab,
  setActiveTab,
  onLogoutClick,
}: ProfileSidebarProps) {
  const menuItems: { id: ProfileTabType; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'overview', label: 'داشبورد حساب', icon: User },
    { id: 'orders', label: 'سفارش‌های من', icon: Package },
    { id: 'addresses', label: 'مدیریت آدرس‌ها', icon: MapPin, badge: `${user.addresses?.length || 0}` },
    { id: 'info', label: 'اطلاعات شخصی و امنیت', icon: Settings },
    { id: 'wishlist', label: 'علاقه‌مندی‌ها', icon: Heart },
    { id: 'vip', label: 'باشگاه مشتریان VIP', icon: Gift, badge: `${toPersianDigits(user.vipPoints || 0)} امتیاز` },
  ];

  return (
    <aside className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 shadow-xs text-right space-y-6">
      {/* User Header Badge */}
      <div className="flex items-center gap-4 pb-6 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        <div className="relative shrink-0">
          <img
            src={user.avatar || '/avatar.svg'}
            alt={user.name}
            width="56"
            height="56"
            decoding="async"
            className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-500 shadow-md"
          />
          <span className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900" title="آنلاین" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] truncate">
              {user.name}
            </h3>
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <Award className="h-3 w-3" /> VIP
            </span>
          </div>

          <p className="text-xs text-gray-400 font-medium dir-ltr text-right mt-1">
            {user.phone}
          </p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-l from-orange-50 to-amber-50/30 dark:from-orange-500/10 dark:to-amber-500/5 text-orange-600 dark:text-orange-400 border-r-4 border-orange-500 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 border-r-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-2">
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <ChevronLeft className={`h-4 w-4 ${isActive ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'}`} />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="pt-4 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
        <button
          onClick={onLogoutClick}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <LogOut className="h-4.5 w-4.5" />
            <span>خروج از حساب کاربری</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
