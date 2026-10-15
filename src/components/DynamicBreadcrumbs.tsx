import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Home, ChevronLeft } from 'lucide-react';
import { getJson } from '../lib/jsonFetch';
import { matchRoute } from '../lib/routeSeo';

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
  '/login': 'ورود',
  '/register': 'ثبت‌نام',
  '/force-change-password': 'تغییر رمز عبور',
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

  // Fetch product info if we are on a product detail page — singular /product/:id
  // or plural alias /products/:id (both render ProductDetail, see App.tsx routes)
  const isProductPage = pathnames[0] === 'product' && pathnames[1];
  const isProductAlias = pathnames[0] === 'products' && /^\d+$/.test(pathnames[1] || '');
  const productId = isProductPage ? pathnames[1] : isProductAlias ? pathnames[1] : null;

  useEffect(() => {
    if (productId) {
      let isMounted = true;
      getJson<{ title: string; category: string }>(`/api/products/${productId}`)
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

  // The server prerender emits the identical BreadcrumbList for raw-HTML
  // crawlers under `breadcrumb-jsonld-prerender`. Dropping it once the client
  // owns the page leaves exactly one BreadcrumbList in the rendered DOM
  // (two competing nodes is the duplicate-schema bug). This hook must run on
  // every render, before the early return below: a hook after `return null`
  // changes the hook count between `/` and other routes (React #310 / #300).
  // On an article URL the server's crumb is kept: it carries the real post title,
  // which this component does not have.
  useEffect(() => {
    if (matchRoute(location.pathname).kind === 'blogPost') return;
    document.getElementById('breadcrumb-jsonld-prerender')?.remove();
  }, [location.pathname, location.search]);

  const route = matchRoute(location.pathname);
  // Crumb JSON-LD only where it is accurate: not on an unknown URL, not on an
  // article (see above), and not on a product that did not load.
  const emitsJsonLd =
    route.kind !== 'notFound' && route.kind !== 'blogPost' && !(route.kind === 'product' && !productInfo);

  if (location.pathname === '/') {
    return null;
  }

  const items: BreadcrumbItem[] = [
    { label: 'خانه', href: '/' }
  ];

  if (isProductPage || isProductAlias) {
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
      const label = ROUTE_NAMES[currentPath] || (pathnames.length === 1 ? 'صفحه پیدا نشد' : segment);

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
      {emitsJsonLd && <script
        id="breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: items.map((item, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: item.label,
              // The current page is the canonical /products/:id, not the /product/:id
              // alias the user may have clicked (matches the server prerender).
              item: item.href
                ? `${window.location.origin}${item.href}`
                : productId
                  ? `${window.location.origin}/products/${productId}`
                  : window.location.href,
            })),
          }).replace(/</g, '\\u003c'),
        }}
      />}
      <nav
        aria-label="مسیر راهنما"
        className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 py-1 text-[13px] text-gray-500 dir-rtl dark:text-gray-400 sm:mb-6 print:hidden"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              {index === 0 ? (
                <Link
                  to={item.href || '/'}
                  className="inline-flex items-center gap-1 min-h-11 py-2 text-gray-500 dark:text-gray-400 hover:text-[var(--color-emphasis-text)] transition-colors font-medium"
                  title="خانه"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="inline-flex items-center min-h-11 py-2 hover:text-[var(--color-emphasis-text)] transition-colors font-medium text-gray-600 dark:text-gray-300"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current="page"
                  className="min-w-0 max-w-[70vw] truncate font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] sm:max-w-md"
                  title={item.label}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronLeft className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 shrink-0 mx-0.5" />
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}
