import React, { useEffect, useState } from 'react';
import { Gift, Award, Sparkles, Copy, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { toPersianDigits } from '../../lib/utils';

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
    fetch('/api/coupons-active')
      .then(async (res) => (res.ok ? res.json() : []))
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
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-orange-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-light)]/20 backdrop-blur-md flex items-center justify-center">
              <Award className="h-6 w-6 text-amber-200" />
            </div>
            <div>
              <h2 className="text-xl font-black">سطح اشتراک: طلایی (VIP)</h2>
              <p className="text-xs text-amber-100 font-medium">
                شما {toPersianDigits(points)} امتیاز فعال دارید
              </p>
            </div>
          </div>
          <span className="text-xs font-black bg-[var(--color-surface-light)] text-orange-600 px-3 py-1.5 rounded-full">
            سطح بعدی: الماس
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-bold text-amber-100">
            <span>پیشرفت تا سطح بعدی</span>
            <span>{toPersianDigits(points)} / {toPersianDigits(targetPoints)} امتیاز</span>
          </div>
          <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-[var(--color-surface-light)] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Exclusive Coupons */}
      <div className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] rounded-3xl p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2 pb-4 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <Gift className="h-5 w-5 text-orange-500" />
          <span>کدهای تخفیف اختصاصی شما</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingCoupons && [...Array(2)].map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-500/10 border-2 border-dashed border-orange-200 dark:border-orange-500/20 animate-pulse h-28" />
          ))}
          {!loadingCoupons && coupons.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium col-span-full">
              در حال حاضر کد تخفیف فعالی وجود ندارد — به‌محض فعال شدن کوپن جدید، اینجا نمایش داده می‌شود.
            </p>
          )}
          {coupons.map((cp) => (
            <div
              key={cp.code}
              className="p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-500/10 border-2 border-dashed border-orange-200 dark:border-orange-500/20 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm text-orange-600 dark:text-orange-400 tracking-wider">
                    {cp.code}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">اعتبار: {cp.expiresAt ? new Date(cp.expiresAt).toLocaleDateString('fa-IR') : 'بدون محدودیت'}</span>
                </div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {cp.label} (حداقل خرید: {toPersianDigits(cp.minTotal.toLocaleString('fa-IR'))} تومان)
                </p>
              </div>

              <button
                onClick={() => handleCopy(cp.code)}
                className="w-full py-2 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] hover:bg-orange-500 hover:text-white text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
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
