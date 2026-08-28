import React, { useState, useEffect } from 'react';
import { Send, Download, Trash2, Search, MailCheck, Calendar } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface Subscriber {
  email: string;
  subscribedAt: string;
}

export default function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();

  const fetchSubscribers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/newsletter', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data);
      }
    } catch (err) {
      console.error('Failed to fetch subscribers', err);
      addToast('خطا در دریافت مشترکین خبرنامه', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleDeleteSubscriber = async (email: string) => {
    if (!confirm(`آیا از حذف ایمیل ${email} اطمینان دارید؟`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/newsletter/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSubscribers(prev => prev.filter(s => s.email !== email));
        addToast('ایمیل با موفقیت حذف شد', 'success');
      } else {
        addToast('خطا در حذف ایمیل', 'error');
      }
    } catch {
      addToast('خطا در ارتباط با سرور', 'error');
    }
  };

  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      addToast('لیست ایمیل‌ها خالی است', 'warning');
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8,Email,SubscribedAt\n" + 
      subscribers.map(s => `"${s.email}","${s.subscribedAt}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `newsletter_subscribers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('فایل اکسل/CSV ایمیل‌ها دانلود شد', 'success');
  };

  const filteredSubscribers = subscribers.filter(s =>
    !searchQuery || s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-white flex items-center gap-2">
            <MailCheck className="h-6 w-6 text-orange-500" />
            اعضای خبرنامه ایمیلی
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            مشاهده، جستجو و خروجی اکسل از ایمیل‌های عضو خبرنامه
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
        >
          <Download className="h-4 w-4" />
          خروجی CSV / اکسل
        </button>
      </div>

      {/* Search and Count Bar */}
      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 p-4 rounded-2xl border border-[var(--color-border-light)] dark:border-gray-700/60 shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="جستجو در ایمیل‌ها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl py-2 px-3.5 pr-9 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
          تعداد اعضا: <span className="font-mono text-orange-600 font-bold">{filteredSubscribers.length}</span>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-2xl border border-[var(--color-border-light)] dark:border-gray-700/60 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs">در حال بارگذاری اعضا...</div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">عضوی یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 border-b border-[var(--color-border-light)] dark:border-gray-700/60">
                <tr>
                  <th className="p-3.5 font-bold">ردیف</th>
                  <th className="p-3.5 font-bold">آدرس ایمیل</th>
                  <th className="p-3.5 font-bold">تاریخ عضویت</th>
                  <th className="p-3.5 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {filteredSubscribers.map((sub, idx) => (
                  <tr key={sub.email} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="p-3.5 font-mono text-gray-400 w-12">{idx + 1}</td>
                    <td className="p-3.5 font-mono font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] text-left dir-ltr">
                      {sub.email}
                    </td>
                    <td className="p-3.5 text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                      {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(sub.subscribedAt))}
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleDeleteSubscriber(sub.email)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                        title="حذف عضویت"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
