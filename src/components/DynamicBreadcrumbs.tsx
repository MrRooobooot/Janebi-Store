import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Home, ChevronLeft } from 'lucide-react';

const CATEGORY_PARENTS: Record<string, string> = {
  'کابل': 'لوازم جانبی و اتصالات',
  'شارژر': 'لوازم جانبی و اتصالات',
  'پاوربانک': 'تجهیزات شارژ همراه',
  'قاب و کاور': 'محافظت و کاور',
  'گلس': 'محافظت و کاور',
  'هندزفری': 'تجهیزات صوتی',
};

const ROUTE_NAMES: Record<string, string> = {
  '/products': 'محصولات',
  '/cart': 'سبد خرید',
  '/checkout': 'تسویه حساب',
  '/wishlist': 'علاقه‌مندی‌ها',
  '/profile': 'حساب کاربری',
  '/compare': 'مقایسه محصولات',
  '/about': 'درباره ما',
  '/contact': 'تماس با ما',
  '/terms': 'قوانین و مقررات',
  '/privacy': 'حریم خصوصی',
  '/faq': 'پرسش‌های متداول',
  '/blog': 'مجله آموزشی',
  '/offers': 'تخفیف‌های ویژه',
  '/new-products': 'محصولات جدید',
  '/brands': 'برندها',
};

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function DynamicBreadcrumbs() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const [productInfo, setProductInfo] = useState<{ title: string; category: string } | null>(null);

  // Fetch product info if we are on a product detail page /product/:id
  const isProductPage = pathnames[0] === 'product' && pathnames[1];
  const productId = isProductPage ? pathnames[1] : null;

  useEffect(() => {
    if (productId) {
      let isMounted = true;
      fetch(`/api/products/${productId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data) {
            setProductInfo({ title: data.title, category: data.category });
          }
        })
        .catch(() => {
          if (isMounted) setProductInfo(null);
        });

      return () => {
        isMounted = false;
      };
    } else {
      setProductInfo(null);
    }
  }, [productId]);

  if (location.pathname === '/') {
    return null;
  }

  const items: BreadcrumbItem[] = [
    { label: 'خانه', href: '/' }
  ];

  if (isProductPage) {
    items.push({ label: 'محصولات', href: '/products' });

    if (productInfo?.category) {
      const parentCat = CATEGORY_PARENTS[productInfo.category];
      if (parentCat) {
        items.push({
          label: parentCat,
          href: '/products'
        });
      }
      items.push({
        label: productInfo.category,
        href: `/products?category=${encodeURIComponent(productInfo.category)}`
      });
    }

    items.push({
      label: productInfo?.title || 'جزئیات محصول',
      href: undefined
    });
  } else if (location.pathname === '/products') {
    items.push({ label: 'محصولات', href: '/products' });

    const category = searchParams.get('category');
    const search = searchParams.get('search');

    if (search) {
      items.push({ label: `نتایج جستجو: ${search}`, href: undefined });
    } else if (category) {
      const parentCat = CATEGORY_PARENTS[category];
      if (parentCat) {
        items.push({ label: parentCat, href: '/products' });
      }
      items.push({ label: category, href: undefined });
    } else {
      items.push({ label: 'همه محصولات', href: undefined });
    }
  } else {
    let currentPath = '';
    pathnames.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathnames.length - 1;
      const label = ROUTE_NAMES[currentPath] || segment;

      items.push({
        label,
        href: isLast ? undefined : currentPath
      });
    });
  }

  if (location.pathname === '/' || items.length <= 1) {
    return null;
  }

  return (
    <>
      {/* SEO Schema markup for BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: items.map((item, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: item.label,
              item: item.href ? `${window.location.origin}${item.href}` : window.location.href,
            })),
          }),
        }}
      />
      <nav
        aria-label="مسیر راهنما"
        className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 overflow-x-auto whitespace-nowrap hide-scrollbar print:hidden dir-rtl py-1 bg-white/50 dark:bg-gray-900/40 backdrop-blur-xs px-3 sm:px-4 py-2 rounded-2xl border border-gray-100/80 dark:border-gray-800/80 shadow-xs"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              {index === 0 ? (
                <Link
                  to={item.href || '/'}
                  className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium"
                  title="خانه"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium text-gray-600 dark:text-gray-300"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current="page"
                  className="text-gray-900 dark:text-gray-100 font-black truncate max-w-[200px] sm:max-w-[350px]"
                  title={item.label}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronLeft className="h-3.5 w-3.5 text-gray-400 dark:text-gray-600 shrink-0 mx-0.5" />
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}
