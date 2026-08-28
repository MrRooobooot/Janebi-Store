import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Search, Shield, User as UserIcon, KeyRound, Award, Plus, Minus, X, CheckCircle } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';

export default function AdminUsers() {
  const token = localStorage.getItem('token');
  const { addToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [passwordModalUser, setPasswordModalUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pointsModalUser, setPointsModalUser] = useState<any | null>(null);
  const [pointsInput, setPointsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      addToast('خطا در دریافت لیست کاربران', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`آیا مطمئن هستید که می‌خواهید نقش این کاربر را به ${newRole === 'admin' ? 'مدیر' : 'کاربر عادی'} تغییر دهید؟`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) throw new Error();
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      addToast('نقش کاربر با موفقیت تغییر کرد', 'success');
    } catch (err) {
      addToast('خطا در تغییر نقش کاربر', 'error');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || newPassword.length < 6) {
      addToast('رمز عبور باید حداقل ۶ کاراکتر باشد', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${passwordModalUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'خطا در تغییر رمز عبور');

      addToast(data.message || 'رمز عبور با موفقیت بروزرسانی شد', 'success');
      setPasswordModalUser(null);
      setNewPassword('');
    } catch (err: any) {
      addToast(err.message || 'خطا در تغییر رمز عبور', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointsModalUser) return;
    const pts = parseInt(pointsInput);
    if (isNaN(pts) || pts < 0) {
      addToast('امتیاز باید یک عدد مثبت باشد', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${pointsModalUser.id}/points`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vipPoints: pts })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'خطا در تغییر امتیاز');

      setUsers(users.map(u => u.id === pointsModalUser.id ? { ...u, vipPoints: pts } : u));
      addToast('امتیاز وفاداری VIP کاربر با موفقیت تغییر کرد', 'success');
      setPointsModalUser(null);
      setPointsInput('');
    } catch (err: any) {
      addToast(err.message || 'خطا در تغییر امتیاز', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
    (u.phone && u.phone.includes(search)) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main-light)] dark:text-white mb-1">مدیریت کاربران و باشگاه وفاداری</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">مشاهده لیست اعضا، تغییر نقش، بازنشانی رمز عبور و اعطای امتیازات VIP</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 p-4 rounded-3xl border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs">
        <div className="relative">
          <input
            type="text"
            placeholder="جستجوی نام کاربر، شماره موبایل یا ایمیل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl pr-10 pl-4 py-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl border border-[var(--color-border-light)] dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-50/80 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-b border-[var(--color-border-light)] dark:border-gray-700">
              <tr>
                <th className="p-4 font-bold">نام و تصویر</th>
                <th className="p-4 font-bold">شماره موبایل</th>
                <th className="p-4 font-bold">امتیاز باشگاه VIP</th>
                <th className="p-4 font-bold">نقش</th>
                <th className="p-4 font-bold">تاریخ عضویت</th>
                <th className="p-4 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">در حال بارگذاری لیست کاربران...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">کاربری یافت نشد.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img 
                        src={u.avatar || '/avatar.svg'} 
                        alt={u.name} 
                        className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover shrink-0"
                      />
                      <div>
                        <div className="font-extrabold text-[var(--color-text-main-light)] dark:text-white">{u.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{u.email || 'بدون ایمیل'}</div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-gray-700 dark:text-gray-300">{u.phone}</td>
                    <td className="p-4">
                      <button
                        onClick={() => {
                          setPointsModalUser(u);
                          setPointsInput((u.vipPoints || 0).toString());
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 font-bold hover:scale-105 transition-transform cursor-pointer"
                        title="ویرایش امتیازات باشگاه مشتریان"
                      >
                        <Award className="h-3.5 w-3.5" />
                        <span>{toPersianDigits((u.vipPoints || 0).toLocaleString('fa-IR'))} امتیاز</span>
                      </button>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        u.role === 'admin' 
                          ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {u.role === 'admin' ? 'مدیر ارشد' : 'مشتری عادی'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400">{u.joinedDate || '-'}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setPasswordModalUser(u);
                            setNewPassword('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          title="تغییر رمز عبور"
                        >
                          <KeyRound className="h-3.5 w-3.5 text-orange-500" />
                          <span>رمز جدید</span>
                        </button>
                        <button
                          onClick={() => toggleRole(u.id, u.role)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            u.role === 'admin'
                              ? 'bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100'
                              : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 hover:bg-purple-100'
                          }`}
                        >
                          <Shield className="h-3.5 w-3.5" />
                          <span>{u.role === 'admin' ? 'تنزل به کاربر' : 'ارتقا به مدیر'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Modal */}
      {passwordModalUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[var(--color-border-light)] dark:border-gray-700 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)] dark:border-gray-700 mb-4">
              <h3 className="font-black text-[var(--color-text-main-light)] dark:text-white text-base flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-orange-500" />
                <span>تغییر رمز عبور کاربر</span>
              </h3>
              <button onClick={() => setPasswordModalUser(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              تنظیم رمز عبور جدید برای کاربر: <strong className="text-[var(--color-text-main-light)] dark:text-white">{passwordModalUser.name}</strong> ({passwordModalUser.phone})
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">رمز عبور جدید (حداقل ۶ کاراکتر) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500 font-mono dir-ltr"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-light)] dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? 'در حال ثبت...' : 'ذخیره رمز جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VIP Points Modal */}
      {pointsModalUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[var(--color-border-light)] dark:border-gray-700 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-light)] dark:border-gray-700 mb-4">
              <h3 className="font-black text-[var(--color-text-main-light)] dark:text-white text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <span>مدیریت امتیازات باشگاه VIP</span>
              </h3>
              <button onClick={() => setPointsModalUser(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              کاربر: <strong className="text-[var(--color-text-main-light)] dark:text-white">{pointsModalUser.name}</strong> ({pointsModalUser.phone})
            </p>

            <form onSubmit={handleUpdatePointsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">مجموع امتیازات فعال کاربر *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-amber-500 font-mono text-left dir-ltr"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">هر ۱۰۰ امتیاز معادل ۱۰,۰۰۰ تومان تخفیف روی خرید بعدی کاربر است.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-light)] dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setPointsModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-xs font-bold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-black transition-all disabled:opacity-50"
                >
                  {submitting ? 'در حال ثبت...' : 'ذخیره امتیازات'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
