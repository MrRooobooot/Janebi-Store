import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEES } from '../lib/constants';
import { toPersianDigits } from '../lib/utils';

const fmt = (n: number) => n.toLocaleString('fa-IR');

const faqs = [
  {
    question: 'چگونه می‌توانم سفارشم را پیگیری کنم؟',
    answer: 'پس از ثبت سفارش، کد رهگیری پستی برای شما پیامک می‌شود. همچنین می‌توانید در بخش "سفارش‌های من" در حساب کاربری وضعیت سفارش خود را مشاهده کنید.',
  },
  {
    question: 'شرایط بازگشت کالا چگونه است؟',
    answer: 'شما می‌توانید تا ۷ روز پس از دریافت کالا، در صورت باز نشدن پلمپ محصول یا وجود مشکل فنی (با تایید کارشناسان)، کالا را مرجوع کنید.',
  },
  {
    question: 'آیا محصولات سایت اصل هستند؟',
    answer: 'بله، جانبی آرنا اصالت تمام محصولات خود را تضمین می‌کند و تمامی کالاها دارای ضمانت اصالت و سلامت فیزیکی می‌باشند.',
  },
  {
    question: 'هزینه ارسال چقدر است؟',
    answer: `ارسال برای خریدهای بالای ${fmt(FREE_SHIPPING_THRESHOLD)} تومان رایگان است. برای سفارش‌های کمتر از این مبلغ، هزینه پست پیشتاز ${fmt(SHIPPING_FEES.express)} و پست سفارشی ${fmt(SHIPPING_FEES.standard)} تومان محاسبه می‌شود.`,
  },
];

// r36 FAQ polish (2026-09-12): a11y accordion upgrade — aria-expanded/
// aria-controls wiring, 44px touch targets, visible focus rings, Persian-digit
// numbering badges, RTL-correct accent bar, dual-theme zinc tokens and a
// clip-free answer reveal (grid-rows trick instead of max-h-40 clipping).
export const FAQ_R36_POLISH = 'faq-r36-polish';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // FAQPage JSON-LD (SEO cluster 2026-09-04) — built from the exact same `faqs`
  // array that renders on the page. No fabricated Q&A: every question/answer is
  // the real on-page content; shipping values come from lib/constants.
  useEffect(() => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-page-jsonld';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      document.getElementById('faq-page-jsonld')?.remove();
    };
  }, []);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="mt-16" data-polish={FAQ_R36_POLISH}>
      <div className="text-center mb-10">
        <h2 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-2">سوالات متداول</h2>
        <p className="text-zinc-600 dark:text-zinc-400">پاسخ پرتکرارترین سوالات شما درباره خرید و ارسال</p>
      </div>
      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          const questionId = `faq-question-${index}`;
          const answerId = `faq-answer-${index}`;
          return (
            <div
              key={index}
              className={`bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border rounded-2xl overflow-hidden transition-colors duration-200 ${
                isOpen
                  ? 'border-orange-300/90 dark:border-orange-500/40 shadow-sm'
                  : 'border-zinc-200/80 dark:border-[var(--color-border-dark)]'
              }`}
            >
              <button
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
                aria-controls={answerId}
                id={questionId}
                className="w-full min-h-[3.25rem] flex items-center justify-between gap-3 p-4 sm:p-6 text-right focus:outline-none group"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span
                    aria-hidden="true"
                    className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-xs sm:text-sm font-black transition-colors ${
                      isOpen
                        ? 'bg-orange-600 text-white dark:bg-orange-500'
                        : 'bg-orange-50 text-orange-700 dark:bg-zinc-800/90 dark:text-orange-400'
                    }`}
                  >
                    {toPersianDigits(String(index + 1))}
                  </span>
                  <span
                    className={`font-bold pr-0 text-sm sm:text-base transition-colors ${
                      isOpen
                        ? 'text-orange-700 dark:text-orange-400'
                        : 'text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] group-hover:text-orange-600 dark:group-hover:text-orange-400'
                    }`}
                  >
                    {faq.question}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-5 w-5 flex-shrink-0 text-zinc-500 dark:text-zinc-400 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-orange-600 dark:text-orange-400' : ''
                  }`}
                />
              </button>
              <div
                id={answerId}
                role="region"
                aria-labelledby={questionId}
                className={`grid transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-5 sm:px-6 pb-6 text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] pt-4">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
