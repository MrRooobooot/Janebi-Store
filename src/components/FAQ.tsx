import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEES } from '../lib/constants';

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
    <section className="mt-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] mb-2">سوالات متداول</h2>
        <p className="text-gray-600 dark:text-gray-400">پاسخ پرتکرارترین سوالات شما درباره خرید و ارسال</p>
      </div>
      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border border-gray-200/80 dark:border-[var(--color-border-dark)] rounded-2xl overflow-hidden transition-all duration-200">
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between p-5 sm:p-6 text-right focus:outline-none group"
            >
              <span className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] pr-2 border-r-4 border-transparent group-hover:border-orange-500 transition-colors text-sm sm:text-base">
                {faq.question}
              </span>
              <ChevronDown className={`h-5 w-5 text-gray-600 dark:text-gray-400 transition-transform duration-300 ${openIndex === index ? 'rotate-180 text-orange-600 dark:text-orange-400' : ''}`} />
            </button>
            <div
              className={`px-5 sm:px-6 text-gray-600 dark:text-gray-300 text-sm leading-relaxed overflow-hidden transition-all duration-300 ${
                openIndex === index ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="pt-3 border-t border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">{faq.answer}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
