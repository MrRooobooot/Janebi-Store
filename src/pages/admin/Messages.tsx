import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Clock, Search, Eye, Filter } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  status: 'unread' | 'read' | 'resolved';
  createdAt: string;
}

export default function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const { addToast } = useToast();

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/contact-messages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'unread' | 'read' | 'resolved') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/contact-messages/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
        if (selectedMessage && selectedMessage.id === id) {
          setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : null);
        }
        addToast('وضعیت پیام با موفقیت بروز شد', 'success');
      }
    } catch {
      addToast('خطا در بروزرسانی وضعیت', 'error');
    }
  };

  const filteredMessages = messages.filter(m => {
    const matchesFilter = filterStatus === 'all' || m.status === filterStatus;
    const matchesSearch = !searchQuery || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.subject && m.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Mail className="h-6 w-6 text-orange-500" />
            پیام‌های تماس با ما
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            مدیریت و پاسخگویی به پیام‌های ارسالی کاربران از فرم تماس
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="جستجو در پیام‌ها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl py-2 px-3.5 pr-9 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl py-2 px-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="unread">خوانده نشده</option>
            <option value="read">خوانده شده</option>
            <option value="resolved">پاسخ داده شده</option>
          </select>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs">در حال بارگذاری پیام‌ها...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">پیامی یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700/60">
                <tr>
                  <th className="p-3.5 font-bold">فرستنده</th>
                  <th className="p-3.5 font-bold">موضوع / ایمیل</th>
                  <th className="p-3.5 font-bold">تاریخ</th>
                  <th className="p-3.5 font-bold">وضعیت</th>
                  <th className="p-3.5 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {filteredMessages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-gray-900 dark:text-gray-100">{msg.name}</div>
                      {msg.phone && <div className="text-[11px] text-gray-400 font-mono">{msg.phone}</div>}
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{msg.subject || 'بدون موضوع'}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{msg.email}</div>
                    </td>
                    <td className="p-3.5 text-gray-500 dark:text-gray-400 text-[11px]">
                      {msg.createdAt}
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        msg.status === 'unread' 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : msg.status === 'read'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }`}>
                        {msg.status === 'unread' ? 'خوانده نشده' : msg.status === 'read' ? 'خوانده شده' : 'پاسخ داده شده'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => {
                          setSelectedMessage(msg);
                          if (msg.status === 'unread') {
                            handleUpdateStatus(msg.id, 'read');
                          }
                        }}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                        title="مشاهده متن کامل"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100">جزئیات پیام کاربر</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                بستن
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                <div><span className="text-gray-400">نام:</span> <span className="font-bold text-gray-800 dark:text-gray-200">{selectedMessage.name}</span></div>
                <div><span className="text-gray-400">تاریخ:</span> <span className="font-mono text-gray-800 dark:text-gray-200">{selectedMessage.createdAt}</span></div>
                <div><span className="text-gray-400">ایمیل:</span> <span className="font-mono text-gray-800 dark:text-gray-200">{selectedMessage.email}</span></div>
                <div><span className="text-gray-400">تلفن:</span> <span className="font-mono text-gray-800 dark:text-gray-200">{selectedMessage.phone || '-'}</span></div>
              </div>

              <div>
                <span className="text-gray-400 block mb-1">موضوع:</span>
                <div className="font-bold text-gray-900 dark:text-gray-100 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                  {selectedMessage.subject || 'بدون موضوع'}
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-1">متن پیام:</span>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-gray-800 dark:text-gray-200 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                <span className="text-gray-500 font-medium">تغییر وضعیت:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedMessage.id, 'read')}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 font-bold hover:bg-blue-100 transition-colors"
                  >
                    خوانده شده
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedMessage.id, 'resolved')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 font-bold hover:bg-emerald-100 transition-colors"
                  >
                    پاسخ داده شد
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
