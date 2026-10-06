import React, { useEffect, useState } from 'react';
import { Gift, Award, Sparkles, Copy, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { toPersianDigits } from '../../lib/utils';
import { getJson } from '../../lib/jsonFetch';

// Live active coupons from GET /api/coupons-active (DB-driven). The previous
// hardcoded list drifted from the admin coupon table.
interface ActiveCoupon {
  code: string;
  label: string;
  minTotal: number;
  expiresAt: string | null;
}

export default function VipClubTab() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<ActiveCoupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getJson<ActiveCoupon[]>('/api/coupons-active')
    .then((rows) => { if (!cancelled) setCoupons(Array.isArray(rows) ? rows : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingCoupons(false); });
    return () => { cancelled = true; };
  }, []);

  // Real VIP points only — no invented fallback of 1250 when the user has none.
  const points = user?.vipPoints ?? 0;
  const targetPoints = Math.max(2000, points);
  const progressPercent = Math.min(100, Math.round((points / targetPoints) * 100));

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    addToast(`کد تخفیف ${code} کپی شد`, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6 text-right">
      {/* Tier Progress Card */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">سطح بعدی: الماس</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white sm:text-2xl">سطح اشتراک: طلایی (VIP)</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              شما {toPersianDigits(points)} امتیاز فعال دارید
            </p>
          </div>
          <Award className="h-5 w-5 shrink-0 text-slate-500" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>پیشرفت تا سطح بعدی</span>
            <span>{toPersianDigits(points)} / {toPersianDigits(targetPoints)} امتیاز</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--color-cta)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Exclusive Coupons */}
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-base text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2 pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <Gift className="h-5 w-5 text-[var(--color-emphasis-text)]" />
          <span>کدهای تخفیف اختصاصی شما</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingCoupons && [...Array(2)].map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-[var(--color-cta)]/50 dark:bg-[var(--color-cta)]/10 border-2 border-dashed border-[var(--color-cta)]/30 dark:border-[var(--color-cta)]/20 animate-pulse h-28" />
          ))}
          {!loadingCoupons && coupons.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium col-span-full">
              در حال حاضر کد تخفیف فعالی وجود ندارد — به‌محض فعال شدن کوپن جدید، اینجا نمایش داده می‌شود.
            </p>
          )}
          {coupons.map((cp) => (
            <div
              key={cp.code}
              className="p-4 rounded-2xl bg-[var(--color-cta)]/50 dark:bg-[var(--color-cta)]/10 border-2 border-dashed border-[var(--color-cta)]/30 dark:border-[var(--color-cta)]/20 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[var(--color-emphasis-text)] tracking-wider">
                    {cp.code}
                  </span>
                  <span className="text-xs font-bold text-gray-400">اعتبار: {cp.expiresAt ? new Date(cp.expiresAt).toLocaleDateString('fa-IR') : 'بدون محدودیت'}</span>
                </div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {cp.label} (حداقل خرید: {toPersianDigits(cp.minTotal.toLocaleString('fa-IR'))} تومان)
                </p>
              </div>

              <button
                onClick={() => handleCopy(cp.code)}
                className="w-full py-2 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] hover:bg-[var(--color-cta)] hover:text-white text-[var(--color-emphasis-text)] dark:text-[var(--color-emphasis-text)] border border-[var(--color-cta)]/30 dark:border-[var(--color-cta)]/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                {copiedCode === cp.code ? (
                  <>
                    <Check className="h-4 w-4" />
                    کپی شد!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    کپی کد تخفیف
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
