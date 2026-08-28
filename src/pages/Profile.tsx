import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ProfileSidebar, { ProfileTabType } from '../components/profile/ProfileSidebar';
import DashboardOverviewTab from '../components/profile/DashboardOverviewTab';
import OrderHistoryTab from '../components/profile/OrderHistoryTab';
import AddressBookTab from '../components/profile/AddressBookTab';
import PersonalInfoTab from '../components/profile/PersonalInfoTab';
import VipClubTab from '../components/profile/VipClubTab';
import WishlistPage from './Wishlist';
import { Order } from '../types';
import EmptyState from '../components/EmptyState';
import { UserCheck } from 'lucide-react';

export default function Profile() {
  const { user, isLoggedIn, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as ProfileTabType) || 'overview';

  const [activeTab, setActiveTabState] = useState<ProfileTabType>(tabParam);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (tabParam) {
      setActiveTabState(tabParam);
    }
  }, [tabParam]);

  const setActiveTab = (tab: ProfileTabType) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (showLogoutModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showLogoutModal]);

  const fetchUserOrders = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/orders', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((apiOrders) => {
        if (Array.isArray(apiOrders)) {
          setOrders(apiOrders);
        } else {
          setOrders([]);
        }
      })
      .catch(() => {
        setOrders([]);
      });
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchUserOrders();
    }
  }, [isLoggedIn]);

  const handleCancelOrder = async (orderId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      addToast('لطفاً ابتدا وارد حساب کاربری شوید', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || `سفارش ${orderId} با موفقیت لغو شد`, 'success');
        fetchUserOrders();
      } else {
        addToast(data.error || data.message || 'خطا در لغو سفارش', 'error');
      }
    } catch (err) {
      addToast('خطا در برقراری ارتباط با سرور', 'error');
    }
  };

  if (!isLoggedIn || !user) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <EmptyState
          icon={<UserCheck className="h-16 w-16 text-gray-400" />}
          title="وارد حساب کاربری خود شوید"
          description="برای مشاهده سوابق خرید، مدیریت آدرس‌ها و اطلاعات شخصی ابتدا وارد حساب خود شوید."
          actionText="ورود به حساب کاربری"
          actionLink="/login"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950/50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Profile Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Right Sidebar */}
          <div className="lg:col-span-4 sticky top-28">
            <ProfileSidebar
              user={user}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onLogoutClick={() => setShowLogoutModal(true)}
            />
          </div>

          {/* Main Active Tab Content */}
          <main className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                {activeTab === 'overview' && (
                  <DashboardOverviewTab
                    user={user}
                    orders={orders}
                    setActiveTab={setActiveTab}
                  />
                )}

                {activeTab === 'orders' && (
                  <OrderHistoryTab
                    orders={orders}
                    onCancelOrder={handleCancelOrder}
                  />
                )}

                {activeTab === 'addresses' && <AddressBookTab />}

                {activeTab === 'info' && <PersonalInfoTab />}

                {activeTab === 'wishlist' && <WishlistPage />}

                {activeTab === 'vip' && <VipClubTab />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowLogoutModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          <div className="relative w-full max-w-sm bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-6 shadow-2xl border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-10 text-center space-y-4">
            <h3 className="font-extrabold text-base text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              خروج از حساب کاربری
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-400 cursor-pointer"
              >
                انصراف
              </button>

              <button
                onClick={() => {
                  logout();
                  setShowLogoutModal(false);
                  navigate('/');
                }}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 cursor-pointer"
              >
                خروج
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
