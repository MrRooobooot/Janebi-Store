import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';

interface CheckoutStepsBarProps {
  currentStep?: 1 | 2 | 3;
}

const STEPS = [
  { step: 1, label: 'سبد خرید', href: '/cart' },
  { step: 2, label: 'اطلاعات ارسال', href: '/checkout' },
  { step: 3, label: 'پرداخت', href: '/payment' },
] as const;

export default function CheckoutStepsBar({ currentStep = 2 }: CheckoutStepsBarProps) {
  return (
    <ol
      aria-label="مراحل ثبت سفارش"
      className="list-none flex items-center justify-between max-w-2xl mx-auto mb-12 relative px-4"
    >
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-4 right-4 h-1.5 bg-zinc-200 dark:bg-zinc-800 -z-10 -translate-y-1/2 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary-300 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        ></div>
      </div>

      {STEPS.map(({ step, label, href }) => {
        const isComplete = step < currentStep;
        const isCurrent = step === currentStep;
        const isUpcoming = step > currentStep;

        return (
          <li
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex flex-col items-center gap-2 bg-[var(--color-canvas-light)] dark:bg-[var(--color-canvas-dark)] px-2 sm:px-4"
          >
            {isComplete ? (
              <Link
                to={href}
                aria-label={`مرحله ${toPersianDigits(step)}: ${label} — تکمیل‌شده، بازگشت به این مرحله`}
                className="group flex flex-col items-center gap-2 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas-light)] dark:focus-visible:ring-offset-[var(--color-canvas-dark)]"
              >
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-300 to-primary-400 text-white flex items-center justify-center font-bold text-base shadow-md shadow-orange-500/30 transition-transform motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105">
                  <CheckCircle className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold text-primary-500 dark:text-primary-300 group-hover:text-primary-600 dark:group-hover:text-primary-200 transition-colors">
                  {label}
                </span>
              </Link>
            ) : (
              <span
                className="flex flex-col items-center gap-2"
                aria-label={`مرحله ${toPersianDigits(step)}: ${label}${
                  isCurrent ? ' — مرحله فعلی' : ' — در انتظار'
                }`}
              >
                <span
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base transition-colors ${
                    isCurrent
                      ? 'bg-gradient-to-br from-primary-300 to-primary-500 text-white font-black shadow-md shadow-orange-500/30 ring-2 ring-primary-200 dark:ring-primary-800 ring-offset-2 ring-offset-[var(--color-canvas-light)] dark:ring-offset-[var(--color-canvas-dark)]'
                      : 'bg-[var(--color-surface-light)] dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 font-bold'
                  }`}
                >
                  {toPersianDigits(step)}
                </span>
                <span
                  className={`text-xs ${
                    isCurrent
                      ? 'font-black text-primary-500 dark:text-primary-300'
                      : 'font-medium text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {label}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
