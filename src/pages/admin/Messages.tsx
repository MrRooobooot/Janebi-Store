import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Mail, CheckCircle2, Clock, Search, Eye, Filter, Phone, User, 
  MessageSquare, ArrowLeft, X, Check, Trash2, Send
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { toPersianDigits } from '../../lib/utils';

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
      addToast('خطا در دریافت پیام‌ها', 'error');
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
        addToast('وضعیت پیام با موفقیت بروزرسانی شد', 'success');
      }
    } catch {
      addToast('خطا در بروزرسانی وضعیت', 'error');
    }
  };

  const filteredMessages = messages.filter(m => {
    const matchesFilter = filterStatus === 'all' || m.status === filterStatus;
    const matchesSearch = (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.phone && m.phone.includes(searchQuery)) ||
      (m.subject && m.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.message && m.message.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/40 text-rose-600 border border-rose-200">خوانده نشده</span>;
      case 'read':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/40 text-blue-600 border border-blue-200">خوانده شده</span>;
      case 'resolved':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200">پاسخ‌داده‌شده</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-1">پیام‌های تماس و پشتیبانی</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">بررسی سوالات کاربران، پیگیری نظرات و ارتباط مستقیم با مشتریان</p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="جستجوی نام فرستنده، شماره، ایمیل یا موضوع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'همه پیام‌ها', count: messages.length },
            { id: 'unread', label: 'خوانده نشده', count: messages.filter(m => m.status === 'unread').length },
            { id: 'read', label: 'در دست بررسی', count: messages.filter(m => m.status === 'read').length },
            { id: 'resolved', label: 'تکمیل‌شده', count: messages.filter(m => m.status === 'resolved').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-80">({toPersianDigits(tab.count)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-gray-400">در حال دریافت پیام‌ها...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="col-span-full p-12 bg-white dark:bg-gray-800 rounded-3xl text-center text-gray-400 border border-gray-100 dark:border-gray-700 shadow-xs">
            هیچ پیامی در این دسته‌بندی یافت نشد.
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => setSelectedMessage(msg)}
              className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  {getStatusBadge(msg.status)}
                  <span className="text-[10px] text-gray-400 font-medium">{msg.createdAt}</span>
                </div>

                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">
                  {msg.subject || 'بدون موضوع'}
                </h3>

                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed mb-4">
                  {msg.message}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                  <User className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span className="font-bold text-gray-800 dark:text-gray-200 truncate">{msg.name}</span>
                </div>

                <span className="text-[11px] text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1">
                  <span>مشاهده پیام</span>
                  <ArrowLeft className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message View Modal */}
      {selectedMessage && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 text-right animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white text-base">جزئیات پیام ارسالی</h3>
                  <span className="text-[11px] text-gray-400">{selectedMessage.createdAt}</span>
                </div>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sender Info Grid */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">نام فرستنده:</span>
                <strong className="text-gray-900 dark:text-white">{selectedMessage.name}</strong>
              </div>

              <div>
                <span className="text-gray-400 block mb-0.5">وضعیت:</span>
                <div>{getStatusBadge(selectedMessage.status)}</div>
              </div>

              <div>
                <span className="text-gray-400 block mb-0.5">شماره تماس:</span>
                {selectedMessage.phone ? (
                  <a href={`tel:${selectedMessage.phone}`} className="font-mono font-bold text-orange-600 hover:underline flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{selectedMessage.phone}</span>
                  </a>
                ) : (
                  <span className="text-gray-400">ثبت نشده</span>
                )}
              </div>

              <div>
                <span className="text-gray-400 block mb-0.5">ایمیل فرستنده:</span>
                <a href={`mailto:${selectedMessage.email}`} className="font-mono text-orange-600 hover:underline truncate block">
                  {selectedMessage.email}
                </a>
              </div>
            </div>

            {/* Subject & Message */}
            <div className="space-y-3 mb-6">
              <div>
                <span className="text-xs font-bold text-gray-400 block mb-1">موضوع پیام:</span>
                <div className="font-extrabold text-sm text-gray-900 dark:text-white">
                  {selectedMessage.subject || 'بدون موضوع'}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-400 block mb-1">متن کامل پیام:</span>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 text-gray-800 dark:text-gray-200 text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap border border-gray-100 dark:border-gray-700">
                  {selectedMessage.message}
                </div>
              </div>
            </div>

            {/* Status Change & Action Footer */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-500">تغییر وضعیت:</span>
                <button
                  onClick={() => handleUpdateStatus(selectedMessage.id, 'read')}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold"
                >
                  در دست بررسی
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedMessage.id, 'resolved')}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-bold"
                >
                  پاسخ داده شد
                </button>
              </div>

              <button
                onClick={() => setSelectedMessage(null)}
                className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold"
              >
                بستن
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
