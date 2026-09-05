import { authFetch } from '../../lib/api';
import React, { useEffect, useState } from 'react';
import { ScrollText, Search, ShieldAlert } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';
import PageControls from '../../components/admin/PageControls';

interface AuditLog {
  id: string;
  adminUserId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  'product.create': 'ایجاد محصول',
  'product.update': 'ویرایش محصول',
  'product.delete': 'حذف محصول',
  'order.status.update': 'تغییر وضعیت سفارش',
  'coupon.create': 'ایجاد کد تخفیف',
  'coupon.update': 'ویرایش کد تخفیف',
  'coupon.delete': 'حذف کد تخفیف',
  'user.role.update': 'تغییر نقش کاربر',
  'user.password.reset': 'بازنشانی رمز کاربر',
  'settings.update': 'بروزرسانی تنظیمات',
};

const actionLabel = (action: string) => ACTION_LABELS[action] ?? action;

const faTime = (iso: string) => {
  try {
    return toPersianDigits(new Date(iso).toLocaleString('fa-IR'));
  } catch {
    return iso;
  }
};

export default function AuditLogs() {
  const token = localStorage.getItem('token');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await authFetch(`/api/admin/audit-logs?page=${page}&limit=${PAGE_SIZE}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
        setError('');
      } catch {
        setError('خطا در دریافت لاگ فعالیت‌ها');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, token]);

  const q = search.toLowerCase().trim();
  const filtered = q
    ? logs.filter((l) =>
        actionLabel(l.action).toLowerCase().includes(q) ||
        (l.adminUserId ?? '').toLowerCase().includes(q) ||
        (l.entityId ?? '').toLowerCase().includes(q) ||
        l.entity.toLowerCase().includes(q)
      )
    : logs;

  const totalPagesCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main-light)] dark:text-white mb-1">لاگ فعالیت مدیران</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">ثبت خودکار تمام تغییرات حساس: محصولات، سفارشات، کدهای تخفیف، کاربران و تنظیمات</p>
        </div>
        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-[var(--color-surface-light)] dark:bg-gray-800 border border-[var(--color-border-light)] dark:border-gray-700 rounded-xl px-3 py-2">
          مجموع رکوردها: {toPersianDigits(total.toLocaleString('fa-IR'))}
        </span>
      </div>

      {/* Search */}
      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 p-4 rounded-3xl border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs">
        <div className="relative">
          <input
            type="text"
            placeholder="جستجو در عملیات، شناسه کاربر یا شناسه رکورد (صفحه جاری)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-3xl text-red-600 dark:text-red-300 text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          {error}
        </div>
      ) : (
        <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl border border-[var(--color-border-light)] dark:border-gray-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50/80 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-b border-[var(--color-border-light)] dark:border-gray-700">
                <tr>
                  <th className="p-4 font-bold">زمان</th>
                  <th className="p-4 font-bold">عملیات</th>
                  <th className="p-4 font-bold">موجودیت</th>
                  <th className="p-4 font-bold">شناسه رکورد</th>
                  <th className="p-4 font-bold">مدیر</th>
                  <th className="p-4 font-bold">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {loading ? (
                  <tr><td colSpan={6} className="p-10 text-center text-gray-500">در حال دریافت...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-10 text-center text-gray-500">رکوردی یافت نشد.</td></tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="p-3.5 whitespace-nowrap text-gray-600 dark:text-gray-300">{faTime(log.createdAt)}</td>
                      <td className="p-3.5 font-bold text-[var(--color-text-main-light)] dark:text-white">
                        <span className="inline-flex items-center gap-1.5">
                          <ScrollText className="h-3.5 w-3.5 text-orange-500" />
                          {actionLabel(log.action)}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-600 dark:text-gray-300">{log.entity}</td>
                      <td className="p-3.5 font-mono text-[11px] text-gray-500 dark:text-gray-400" dir="ltr">{log.entityId ?? '—'}</td>
                      <td className="p-3.5 font-mono text-[11px] text-gray-500 dark:text-gray-400" dir="ltr">{log.adminUserId ?? '—'}</td>
                      <td className="p-3.5 text-[11px] text-gray-500 dark:text-gray-400 max-w-[220px] truncate" dir="ltr">
                        {log.meta ? JSON.stringify(log.meta) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PageControls
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={total}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
