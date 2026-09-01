import { authFetch } from '../../lib/api';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail, CheckCircle2, Clock, Search, Eye, Filter, Phone, User,
  MessageSquare, ArrowLeft, X, Check, Trash2, Send, Archive, ArchiveRestore, CheckCheck
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { toPersianDigits } from '../../lib/utils';
import PageControls, { unwrapList } from '../../components/admin/PageControls';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  status: 'unread' | 'read' | 'resolved' | 'archived';
  createdAt: string;
}

type StatusFilter = 'all' | 'unread' | 'read' | 'archived';

/** ISO → fa-IR date string with Persian digits (e.g. ۱۴۰۵/۰۶/۱۱). */
const faDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return toPersianDigits(`${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`);
};

export default function AdminMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [bulkBusy, setBulkBusy] = useState(false);
  const PAGE_SIZE = 12;
  const { addToast } = useToast();

  // Server-side status filter: archived messages are hidden unless explicitly
  // requested (status=archived or status=all).
  const fetchMessages = async (status: StatusFilter = 'all') => {
    try {
      const token = localStorage.getItem('token');
      const res = await authFetch(`/api/admin/contact-messages?status=${status}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(unwrapList<ContactMessage>(data));
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
      addToast('خطا در دریافت پیام‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(filterStatus as StatusFilter);
  }, [filterStatus]);

  const handleUpdateStatus = async (id: string, newStatus: 'unread' | 'read' | 'resolved' | 'archived') => {
    try {
      const token = localStorage.getItem('token');
      const res = await authFetch(`/api/admin/contact-messages/${id}/status`, {
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
        addToast(newStatus === 'archived' ? 'پیام بایگانی شد' : newStatus === 'read' ? 'پیام از بایگانی خارج شد' : 'وضعیت پیام با موفقیت بروزرسانی شد', 'success');
      }
    } catch {
      addToast('خطا در بروزرسانی وضعیت', 'error');
    }
  };

  /** Toggle selection of a single message for bulk actions. */
  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** POST /api/admin/messages/read-all — optimistic, graceful on 404. */
  const handleMarkAllRead = async () => {
    if (bulkBusy) return;
    setBulkBusy(true);
    const prev = messages;
    setMessages(prevMsgs => prevMsgs.map(m => (m.status === 'unread' ? { ...m, status: 'read' as const } : m)));
    try {
      const token = localStorage.getItem('token');
      const res = await authFetch('/api/admin/messages/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({})
      });
      if (res.ok) {
        addToast('همه پیام‌های خوانده‌نشده علامت‌گذاری شدند', 'success');
        fetchMessages(filterStatus as StatusFilter);
      } else if (res.status === 404) {
        setMessages(prev);
        addToast('این قابلیت هنوز در سرور فعال نشده است', 'error');
      } else {
        setMessages(prev);
        addToast('خطا در علامت‌گذاری پیام‌ها', 'error');
      }
    } catch {
      setMessages(prev);
      addToast('خطا در ارتباط با سرور', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  /** POST /api/admin/messages/bulk-delete {ids} — confirm + optimistic, graceful on 404. */
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || bulkBusy) return;
    if (!window.confirm(`آیا از حذف ${toPersianDigits(ids.length)} پیام انتخاب‌شده اطمینان دارید؟ این عمل قابل بازگشت نیست.`)) return;
    setBulkBusy(true);
    const prev = messages;
    setMessages(prevMsgs => prevMsgs.filter(m => !selectedIds.has(m.id)));
    try {
      const token = localStorage.getItem('token');
      const res = await authFetch('/api/admin/messages/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        addToast('پیام‌های انتخاب‌شده حذف شدند', 'success');
        setSelectedIds(new Set());
        fetchMessages(filterStatus as StatusFilter);
      } else if (res.status === 404) {
        setMessages(prev);
        addToast('این قابلیت هنوز در سرور فعال نشده است', 'error');
      } else {
        setMessages(prev);
        addToast('خطا در حذف پیام‌ها', 'error');
      }
    } catch {
      setMessages(prev);
      addToast('خطا در ارتباط با سرور', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filterStatus, searchQuery]);

  const filteredMessages = messages.filter(m => {
    const matchesSearch = (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.phone && m.phone.includes(searchQuery)) ||
      (m.subject && m.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.message && m.message.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });
  const totalPagesCount = Math.max(1, Math.ceil(filteredMessages.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPagesCount);
  const pagedMessages = filteredMessages.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/40 text-rose-600 border border-rose-200">خوانده نشده</span>;
      case 'read':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/40 text-blue-600 border border-blue-200">خوانده شده</span>;
      case 'resolved':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200">پاسخ‌داده‌شده</span>;
      case 'archived':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">بایگانی‌شده</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main-light)] dark:text-white mb-1">پیام‌های تماس و پشتیبانی</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">بررسی سوالات کاربران، پیگیری نظرات و ارتباط مستقیم با مشتریان</p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 p-4 rounded-3xl border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
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
            { id: 'read', label: 'خوانده شده', count: messages.filter(m => m.status === 'read' || m.status === 'resolved').length },
            { id: 'archived', label: 'بایگانی', count: messages.filter(m => m.status === 'archived').length },
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

      {/* Bulk Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="علامت‌گذاری همه پیام‌ها به عنوان خوانده‌شده"
            disabled={bulkBusy}
            onClick={handleMarkAllRead}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            <CheckCheck className="h-4 w-4" />
            <span>خواندن همه پیام‌ها</span>
          </button>
          <button
            type="button"
            aria-label="حذف پیام‌های انتخاب‌شده"
            disabled={bulkBusy || selectedIds.size === 0}
            onClick={handleBulkDelete}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>حذف انتخاب‌شده‌ها {selectedIds.size > 0 && `(${toPersianDigits(selectedIds.size)})`}</span>
          </button>
        </div>
        <span className="text-[11px] text-gray-400 font-bold">
          {toPersianDigits(filteredMessages.length)} پیام
        </span>
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-gray-400">در حال دریافت پیام‌ها...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="col-span-full p-12 bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl text-center text-gray-400 border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs">
            هیچ پیامی در این دسته‌بندی یافت نشد.
          </div>
        ) : (
          pagedMessages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => setSelectedMessage(msg)}
              className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl p-5 border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label={`انتخاب پیام از ${msg.name}`}
                      checked={selectedIds.has(msg.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelected(msg.id)}
                      className="w-4 h-4 cursor-pointer accent-orange-600"
                    />
                    {getStatusBadge(msg.status)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 font-medium">{faDate(msg.createdAt)}</span>
                    <button
                      aria-label={msg.status === 'archived' ? 'خروج از بایگانی' : 'بایگانی پیام'}
                      title={msg.status === 'archived' ? 'خروج از بایگانی' : 'بایگانی پیام'}
                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus(msg.id, msg.status === 'archived' ? 'read' : 'archived'); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      {msg.status === 'archived'
                        ? <ArchiveRestore className="h-3.5 w-3.5" />
                        : <Archive className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <h3 className="font-extrabold text-sm text-[var(--color-text-main-light)] dark:text-white mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">
                  {msg.subject || 'بدون موضوع'}
                </h3>

                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed mb-4">
                  {msg.message}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--color-border-light)] dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
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

      {/* Pagination */}
      <PageControls
        page={safePage}
        pageSize={PAGE_SIZE}
        totalItems={filteredMessages.length}
        onPageChange={setPage}
      />

      {/* Message View Modal */}
      {selectedMessage && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
          <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[var(--color-border-light)] dark:border-gray-700 text-right animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-gray-700 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-[var(--color-text-main-light)] dark:text-white text-base">جزئیات پیام ارسالی</h3>
                  <span className="text-[11px] text-gray-400">{faDate(selectedMessage.createdAt)}</span>
                </div>
              </div>
              <button onClick={() => setSelectedMessage(null)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sender Info Grid */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-[var(--color-surface-dark)]/60 p-4 rounded-2xl border border-[var(--color-border-light)] dark:border-gray-700 mb-4 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">نام فرستنده:</span>
                <strong className="text-[var(--color-text-main-light)] dark:text-white">{selectedMessage.name}</strong>
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
                <div className="font-extrabold text-sm text-[var(--color-text-main-light)] dark:text-white">
                  {selectedMessage.subject || 'بدون موضوع'}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-400 block mb-1">متن کامل پیام:</span>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[var(--color-surface-dark)]/60 text-gray-800 dark:text-gray-200 text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap border border-[var(--color-border-light)] dark:border-gray-700">
                  {selectedMessage.message}
                </div>
              </div>
            </div>

            {/* Status Change & Action Footer */}
            <div className="pt-4 border-t border-[var(--color-border-light)] dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
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
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 text-xs font-bold"
                >
                  پاسخ داده شد
                </button>
                <button
                  aria-label={selectedMessage.status === 'archived' ? 'خروج از بایگانی' : 'بایگانی پیام'}
                  onClick={() => handleUpdateStatus(selectedMessage.id, selectedMessage.status === 'archived' ? 'read' : 'archived')}
                  className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs font-bold flex items-center gap-1"
                >
                  {selectedMessage.status === 'archived'
                    ? <><ArchiveRestore className="h-3.5 w-3.5" /> خروج از بایگانی</>
                    : <><Archive className="h-3.5 w-3.5" /> بایگانی</>}
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
