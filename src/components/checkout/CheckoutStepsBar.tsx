import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { toPersianDigits } from '../../lib/utils';

interface CheckoutStepsBarProps {
  currentStep?: 1 | 2 | 3 | 4;
}

interface StepItem {
  step: 1 | 2 | 3 | 4;
  label: string;
  href?: string;
}

const STEPS: StepItem[] = [
  { step: 1, label: 'سبد', href: '/cart' },
  { step: 2, label: 'آدرس', href: '/checkout' },
  { step: 3, label: 'ارسال', href: '/checkout' },
  { step: 4, label: 'پرداخت' },
];

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
          className="h-full bg-[var(--color-cta)] rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        ></div>
      </div>

      {STEPS.map(({ step, label, href }) => {
        const isComplete = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <li
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex flex-col items-center gap-2 bg-[var(--color-canvas-light)] dark:bg-[var(--color-canvas-dark)] px-2 sm:px-4"
          >
            {isComplete && href ? (
              <Link
                to={href}
                aria-label={`مرحله ${toPersianDigits(step)}: ${label} — تکمیل‌شده، بازگشت به این مرحله`}
                className="group flex flex-col items-center gap-2 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cta-hover)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas-light)] dark:focus-visible:ring-offset-[var(--color-canvas-dark)]"
              >
                <CheckCircle2
                  className="h-10 w-10 text-emerald-600 transition-transform motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105"
                  aria-hidden="true"
                />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-colors">
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-colors ${
                    isCurrent
                      ? 'bg-[var(--color-cta)] text-white font-black shadow-md shadow-[var(--color-cta)]/40 ring-2 ring-[var(--color-cta)]/30'
                      : 'bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-2 border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] text-zinc-400 dark:text-zinc-500 font-bold'
                  }`}
                >
                  {toPersianDigits(step)}
                </span>
                <span
                  className={`text-xs ${
                    isCurrent
                      ? 'font-black text-[var(--color-cta)]'
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
