import { authFetch } from '../../lib/api';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  Search, ChevronDown, CheckCircle, Package, Truck, XCircle, Eye, X,
  MapPin, Phone, User, Calendar, CreditCard, Printer, Download, Share2, Copy, Trash2
} from 'lucide-react';
import { toPersianDigits, formatPrice } from '../../lib/utils';
import PageControls, { unwrapList } from '../../components/admin/PageControls';

export default function AdminOrders() {
  const token = localStorage.getItem('token');
  const { addToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [bulkBusy, setBulkBusy] = useState(false);
  const PAGE_SIZE = 10;

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSelectedOrder(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedOrder]);

  const fetchOrders = async () => {
    try {
      const res = await authFetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(unwrapList<any>(data));
      setSelectedIds(new Set());
    } catch (err) {
      addToast('خطا در دریافت لیست سفارشات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string, newStatusText: string) => {
    setUpdatingId(orderId);
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, statusText: newStatusText })
      });

      if (!res.ok) throw new Error();
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, statusText: newStatusText } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus, statusText: newStatusText });
      }
      addToast('وضعیت سفارش بروزرسانی شد', 'success');
    } catch (err) {
      addToast('خطا در بروزرسانی وضعیت', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const [statusFilter, setStatusFilter] = useState('all');
  const [trackingInput, setTrackingInput] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);

  const handleSaveTracking = async (orderId: string) => {
    if (!trackingInput.trim()) return;
    setSavingTracking(true);
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ refId: trackingInput.trim() })
      });
      if (res.ok) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, refId: trackingInput.trim() } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, refId: trackingInput.trim() });
        }
        addToast('کد رهگیری پستی با موفقیت ثبت شد', 'success');
      } else {
        addToast('خطا در ثبت کد رهگیری', 'error');
      }
    } catch {
      addToast('خطا در ارتباط با سرور', 'error');
    } finally {
      setSavingTracking(false);
    }
  };

  const handleExportCSV = () => {
    if (orders.length === 0) {
      addToast('سفارشی برای خروجی وجود ندارد', 'error');
      return;
    }

    const headers = ['شناسه سفارش', 'مشتری', 'موبایل', 'آدرس', 'کد پستی', 'مبلغ (تومان)', 'روش پرداخت', 'وضعیت', 'کد رهگیری پستی', 'تاریخ'];
    const rows = orders.map(o => [
      o.id,
      `"${o.recipient?.name || o.userName || '-'}"`,
      `"${o.recipient?.phone || '-'}"`,
      `"${o.recipient?.address || '-'}"`,
      `"${o.recipient?.postalCode || '-'}"`,
      o.total,
      `"${o.paymentMethod || 'آنلاین'}"`,
      `"${o.statusText || o.status}"`,
      `"${o.refId || '-'}"`,
      `"${o.date || '-'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders-report-${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('گزارش اکسل/CSV سفارشات با موفقیت دانلود شد', 'success');
  };

  const handleCopySMS = (order: any) => {
    const text = `مشتری گرامی ${order.recipient?.name || 'عزیز'}،\nسفارش شما در جانبی آرنا با شماره پیگیری ${order.id} تحویل شرکت پست گردید.\nکد رهگیری مرسوله پستی: ${order.refId || '-'}\nرهگیری در: tracking.post.ir\nبا تشکر، جانبی آرنا`;
    navigator.clipboard.writeText(text);
    addToast('متن پیامک آماده با موفقیت در کلیپ‌بورد کپی شد', 'success');
  };

  const handlePrintInvoice = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHtml = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>فاکتور فروش - سفارش ${order.id}</title>
        <style>
          body { font-family: Tahoma, 'Vazirmatn', sans-serif; padding: 24px; color: #1f2937; direction: rtl; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #ea580c; }
          .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 12px; line-height: 1.8; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: right; }
          th { background: #f3f4f6; }
          .total { text-align: left; font-size: 14px; font-weight: bold; color: #ea580c; margin-top: 16px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">فروشگاه جانبی آرنا</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">فاکتور رسمی فروش کالا و خدمات</div>
          </div>
          <div style="font-size: 12px; text-align: left;">
            <div>شماره سفارش: <strong>${order.id}</strong></div>
            <div>تاریخ ثبت: <strong>${order.date}</strong></div>
          </div>
        </div>

        <div class="box">
          <strong>مشخصات تحویل‌گیرنده:</strong><br/>
          نام: ${order.recipientName} | تلفن: ${order.recipientPhone}<br/>
          آدرس پستی: ${order.recipientAddress} ${order.recipientPostalCode ? `| کد پستی: ${order.recipientPostalCode}` : ''}<br/>
          روش پرداخت: ${order.paymentMethod === 'online' ? 'پرداخت اینترنتی امن' : 'کارت به کارت'} ${order.refId ? `| کد رهگیری / مرجع: ${order.refId}` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>ردیف</th>
              <th>شرح کالا</th>
              <th>برند</th>
              <th>تعداد</th>
              <th>قیمت واحد</th>
              <th>مبلغ کل</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map((it: any, i: number) => `
              <tr>
                <td>${i + 1}</td>
                <td>${it.title}</td>
                <td>${it.brand || '-'}</td>
                <td>${it.qty || it.quantity}</td>
                <td>${Number(it.price).toLocaleString()} تومان</td>
                <td>${(Number(it.price) * Number(it.qty || it.quantity)).toLocaleString()} تومان</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          مبلغ نهایی پرداختی: ${Number(order.total).toLocaleString()} تومان
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.recipientName && o.recipientName.includes(search)) ||
      (o.recipientPhone && o.recipientPhone.includes(search)) ||
      (o.refId && o.refId.includes(search));
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  /** Toggle selection of a single order for bulk actions. */
  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** POST /api/admin/orders/bulk-delete {ids} — confirm + optimistic, graceful on 404. */
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || bulkBusy) return;
    if (!window.confirm(`آیا از حذف ${toPersianDigits(ids.length)} سفارش انتخاب‌شده اطمینان دارید؟ این عمل قابل بازگشت نیست.`)) return;
    setBulkBusy(true);
    const prev = orders;
    setOrders(prevOrders => prevOrders.filter(o => !selectedIds.has(o.id)));
    try {
      const res = await authFetch('/api/admin/orders/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ids })
      });
      if (res.ok) {
        addToast('سفارش‌های انتخاب‌شده حذف شدند', 'success');
        setSelectedIds(new Set());
        fetchOrders();
      } else if (res.status === 404) {
        setOrders(prev);
        addToast('این قابلیت هنوز در سرور فعال نشده است', 'error');
      } else {
        setOrders(prev);
        addToast('خطا در حذف سفارش‌ها', 'error');
      }
    } catch {
      setOrders(prev);
      addToast('خطا در ارتباط با سرور', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  const totalPagesCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPagesCount);
  const pagedOrders = filteredOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main-light)] dark:text-white mb-1">مدیریت سفارشات مشتریان</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">بررسی، چاپ فاکتور، انتساب کد رهگیری پستی و تغییر وضعیت سفارشات</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-2xl text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          <span>خروجی اکسل / CSV</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'همه سفارشات', count: orders.length },
          { id: 'processing', label: 'در حال پردازش', count: orders.filter(o => o.status === 'processing').length },
          { id: 'shipped', label: 'ارسال شده', count: orders.filter(o => o.status === 'shipped').length },
          { id: 'delivered', label: 'تحویل داده شده', count: orders.filter(o => o.status === 'delivered').length },
          { id: 'pending_payment', label: 'در انتظار پرداخت', count: orders.filter(o => o.status === 'pending_payment').length },
          { id: 'cancelled', label: 'لغو شده', count: orders.filter(o => o.status === 'cancelled').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === tab.id
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-[var(--color-surface-light)] dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-[var(--color-border-light)] dark:border-gray-700/60 hover:bg-gray-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              statusFilter === tab.id ? 'bg-[var(--color-surface-light)]/25 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          aria-label="حذف سفارش‌های انتخاب‌شده"
          disabled={bulkBusy || selectedIds.size === 0}
          onClick={handleBulkDelete}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          <span>حذف سفارش‌های انتخاب‌شده {selectedIds.size > 0 && `(${toPersianDigits(selectedIds.size)})`}</span>
        </button>
        <span className="text-[11px] text-gray-500 font-bold">
          {toPersianDigits(filteredOrders.length)} سفارش
        </span>
      </div>

      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-2xl border border-[var(--color-border-light)] dark:border-gray-700 p-4 space-y-4">
        <div className="relative max-w-md">
          <input 
            type="text" 
            placeholder="جستجو (شماره سفارش، نام، موبایل، کد رهگیری)..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--color-surface-dark)] focus:outline-none focus:border-orange-500 text-xs font-bold"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-xs border-b border-[var(--color-border-light)] dark:border-gray-700">
                <th className="p-3.5 font-bold">
                  <input
                    type="checkbox"
                    aria-label="انتخاب همه سفارش‌های این صفحه"
                    checked={pagedOrders.length > 0 && pagedOrders.every(o => selectedIds.has(o.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(prev => new Set([...prev, ...pagedOrders.map(o => o.id)]));
                      } else {
                        setSelectedIds(prev => new Set(Array.from(prev).filter(id => !pagedOrders.some(o => o.id === id))));
                      }
                    }}
                    className="w-4 h-4 cursor-pointer accent-orange-600"
                  />
                </th>
                <th className="p-3.5 font-bold">شماره سفارش</th>
                <th className="p-3.5 font-bold">تاریخ</th>
                <th className="p-3.5 font-bold">تحویل‌گیرنده</th>
                <th className="p-3.5 font-bold">مبلغ کل</th>
                <th className="p-3.5 font-bold">کد رهگیری پستی</th>
                <th className="p-3.5 font-bold text-center">وضعیت</th>
                <th className="p-3.5 font-bold text-center">اقدامات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="text-center p-8 text-xs font-bold text-gray-500">در حال بارگذاری...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={8} className="text-center p-8 text-xs font-bold text-gray-500">هیچ سفارشی یافت نشد.</td></tr>
              ) : pagedOrders.map(order => (
                <tr key={order.id} className="text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-3.5">
                    <input
                      type="checkbox"
                      aria-label={`انتخاب سفارش ${order.id}`}
                      checked={selectedIds.has(order.id)}
                      onChange={() => toggleSelected(order.id)}
                      className="w-4 h-4 cursor-pointer accent-orange-600"
                    />
                  </td>
                  <td className="p-3.5 font-bold text-[var(--color-text-main-light)] dark:text-white font-mono dir-ltr text-left">{order.id}</td>
                  <td className="p-3.5 text-gray-600 dark:text-gray-300">{order.date}</td>
                  <td className="p-3.5 text-gray-600 dark:text-gray-300">
                    <div className="font-bold text-gray-800 dark:text-gray-200">{order.recipientName}</div>
                    <div className="text-[11px] text-gray-500 font-mono" dir="ltr">{order.recipientPhone}</div>
                  </td>
                  <td className="p-3.5 font-black text-orange-600 dark:text-orange-400">{formatPrice(order.total)}</td>
                  <td className="p-3.5 text-gray-600 dark:text-gray-300 font-mono text-[11px]">
                    {order.refId ? (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold">
                        {order.refId}
                      </span>
                    ) : (
                      <span className="text-gray-500">ثبت نشده</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' :
                      order.status === 'pending_payment' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' :
                      'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}>
                      {order.statusText}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setTrackingInput(order.refId || '');
                        }}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
                        title="مشاهده فاکتور و رهگیری"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <div className="relative group">
                        <button 
                          disabled={updatingId === order.id}
                          className="flex items-center gap-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
                        >
                          {updatingId === order.id ? '...' : 'تغییر وضعیت'}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        
                        <div className="absolute left-0 top-full mt-1 w-36 bg-[var(--color-surface-light)] dark:bg-gray-800 border border-[var(--color-border-light)] dark:border-gray-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden text-right">
                          <button onClick={() => updateStatus(order.id, 'processing', 'در حال پردازش')} className="w-full text-right px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 text-blue-600 font-bold"><Package className="w-3.5 h-3.5"/> در پردازش</button>
                          <button onClick={() => updateStatus(order.id, 'shipped', 'ارسال شده')} className="w-full text-right px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 text-purple-600 font-bold"><Truck className="w-3.5 h-3.5"/> ارسال شده</button>
                          <button onClick={() => updateStatus(order.id, 'delivered', 'تحویل داده شده')} className="w-full text-right px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 text-emerald-600 font-bold"><CheckCircle className="w-3.5 h-3.5"/> تحویل شده</button>
                          <button onClick={() => updateStatus(order.id, 'cancelled', 'لغو شده')} className="w-full text-right px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 text-red-600 font-bold border-t border-[var(--color-border-light)] dark:border-gray-700"><XCircle className="w-3.5 h-3.5"/> لغو سفارش</button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <PageControls
          page={safePage}
          pageSize={PAGE_SIZE}
          totalItems={filteredOrders.length}
          onPageChange={setPage}
        />
      </div>

      {/* Order Details & Print Modal */}
      {selectedOrder && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-right">
          <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-light)] dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                <h3 className="font-extrabold text-base text-[var(--color-text-main-light)] dark:text-white">
                  جزئیات سفارش <span className="font-mono text-orange-600" dir="ltr">{selectedOrder.id}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Postal Tracking Code Assignment Box */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
              <label className="block text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                بارکد / کد رهگیری پستی (جهت پیگیری مشتری):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="مثلاً: 243920194857291038"
                  className="flex-1 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  disabled={savingTracking}
                  onClick={() => handleSaveTracking(selectedOrder.id)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-60"
                >
                  {savingTracking ? 'در حال ثبت...' : 'ثبت بارکد'}
                </button>
              </div>
            </div>

            {/* Status and metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-[var(--color-surface-dark)]/60 p-4 rounded-2xl border border-[var(--color-border-light)] dark:border-gray-700 text-xs">
              <div>
                <span className="text-gray-500 block mb-1">وضعیت:</span>
                <span className="font-bold text-orange-600">{selectedOrder.statusText}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">تاریخ ثبت:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{selectedOrder.date}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">روش ارسال:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{selectedOrder.shippingMethod === 'express' ? 'پیشتاز اکسپرس' : 'معمولی'}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">مبلغ کل:</span>
                <span className="font-black text-orange-600">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Recipient Information */}
            <div className="p-4 rounded-2xl bg-orange-50/40 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 text-xs space-y-2">
              <div className="font-bold text-[var(--color-text-main-light)] dark:text-white flex items-center gap-1.5">
                <User className="w-4 h-4 text-orange-500" />
                <span>مشخصات تحویل‌گیرنده:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 dark:text-gray-300 font-medium">
                <div>نام: <strong className="text-[var(--color-text-main-light)] dark:text-white">{selectedOrder.recipientName}</strong></div>
                <div>شماره تماس: <strong className="text-[var(--color-text-main-light)] dark:text-white font-mono" dir="ltr">{selectedOrder.recipientPhone}</strong></div>
                <div className="sm:col-span-2">آدرس پستی: <strong className="text-[var(--color-text-main-light)] dark:text-white">{selectedOrder.recipientAddress}</strong></div>
                {selectedOrder.recipientPostalCode && (
                  <div>کد پستی: <strong className="text-[var(--color-text-main-light)] dark:text-white font-mono" dir="ltr">{selectedOrder.recipientPostalCode}</strong></div>
                )}
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300">اقلام سفارش:</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[var(--color-surface-dark)]/60 border border-[var(--color-border-light)] dark:border-gray-700 text-xs">
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt={item.title} width="40" height="40" loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-contain bg-[var(--color-surface-light)] dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700" />
                      <div>
                        <div className="font-bold text-[var(--color-text-main-light)] dark:text-white">{item.title}</div>
                        <div className="text-[11px] text-gray-500">{item.brand}</div>
                      </div>
                    </div>
                    <div className="text-left font-bold text-gray-700 dark:text-gray-300">
                      <div>{toPersianDigits(item.qty || item.quantity)} عدد</div>
                      <div className="text-orange-600 text-[11px]">{formatPrice(item.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-light)] dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintInvoice(selectedOrder)}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-orange-400" />
                  <span>چاپ فاکتور فروش</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopySMS(selectedOrder)}
                  className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer border border-blue-200 dark:border-blue-800"
                >
                  <Copy className="h-4 w-4" />
                  <span>کپی پیامک پستی برای مشتری</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
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
