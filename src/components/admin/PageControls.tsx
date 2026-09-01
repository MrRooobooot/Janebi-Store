import { ChevronRight, ChevronLeft } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';

interface PageControlsProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

/**
 * Shared admin pagination controls (client-side paging over the fetched list).
 * Persian digits everywhere, >=44px tap targets, Persian aria-labels.
 */
export default function PageControls({ page, pageSize, totalItems, onPageChange }: PageControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let p = start; p <= Math.min(totalPages, start + 4); p++) pages.push(p);

  const btnBase =
    'min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer';

  return (
    <div className="flex items-center justify-center gap-1.5 pt-4 pb-1" role="navigation" aria-label="صفحه‌بندی فهرست">
      <button
        type="button"
        aria-label="صفحه قبل"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className={`${btnBase} bg-[var(--color-surface-light)] dark:bg-gray-800 border border-[var(--color-border-light)] dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-label={`صفحه ${toPersianDigits(p)}`}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onPageChange(p)}
          className={`${btnBase} px-3 ${
            p === page
              ? 'bg-orange-600 text-white shadow-sm'
              : 'bg-[var(--color-surface-light)] dark:bg-gray-800 border border-[var(--color-border-light)] dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {toPersianDigits(p)}
        </button>
      ))}

      <button
        type="button"
        aria-label="صفحه بعد"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className={`${btnBase} bg-[var(--color-surface-light)] dark:bg-gray-800 border border-[var(--color-border-light)] dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="text-[11px] text-gray-400 font-bold mr-2">
        صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
      </span>
    </div>
  );
}

/**
 * Unwraps admin list responses that may be either a plain array (legacy) or a
 * paginated envelope like { items: [...], total } / { orders: [...], total }.
 */
export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['items', 'orders', 'messages', 'users', 'data']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}
