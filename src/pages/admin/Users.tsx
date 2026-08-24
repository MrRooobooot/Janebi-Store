import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Search, Shield, User as UserIcon, KeyRound } from 'lucide-react';

export default function AdminUsers() {
  const token = localStorage.getItem('token');
  const { addToast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const resetPassword = async (userId: string, userName: string) => {
    const newPassword = window.prompt(
      `رمز عبور جدید برای «${userName}» را وارد کنید (حداقل ۶ کاراکتر):`
    );
    if (!newPassword) return;
    if (newPassword.length < 6) {
      addToast('رمز عبور باید حداقل ۶ کاراکتر باشد', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        addToast(data.message || 'رمز عبور کاربر تغییر کرد', 'success');
      } else {
        addToast(data.message || 'خطا در تغییر رمز عبور', 'error');
      }
    } catch {
      addToast('خطا در برقراری ارتباط با سرور', 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.includes(search) || 
    u.phone.includes(search) || 
    (u.email && u.email.includes(search))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">مدیریت کاربران</h1>
        <p className="text-gray-500 dark:text-gray-400">مشاهده و مدیریت کاربران عضو شده در فروشگاه</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="relative max-w-md mb-4">
          <input 
            type="text" 
            placeholder="جستجو (نام، شماره موبایل، ایمیل)..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-100 dark:border-gray-700">
                <th className="p-4 font-medium">کاربر</th>
                <th className="p-4 font-medium">شماره موبایل</th>
                <th className="p-4 font-medium">امتیاز VIP</th>
                <th className="p-4 font-medium">تاریخ عضویت</th>
                <th className="p-4 font-medium text-center">نقش</th>
                <th className="p-4 font-medium text-center">عملیات رمز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="text-center p-8">در حال بارگذاری...</td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} className="text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">{user.name}</div>
                        {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-300 dir-ltr text-left w-max inline-block">{user.phone}</td>
                  <td className="p-4 font-bold text-orange-500">{user.vipPoints} امتیاز</td>
                  <td className="p-4 text-gray-600 dark:text-gray-300">{user.joinedDate}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleRole(user.id, user.role)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-500/20 dark:text-purple-400'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {user.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                      {user.role === 'admin' ? 'مدیر سیستم' : 'کاربر عادی'}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => resetPassword(user.id, user.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      ریست رمز
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">کاربری یافت نشد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
