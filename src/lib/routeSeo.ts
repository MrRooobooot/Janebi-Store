/**
 * Route-level SEO registry: the one table that says which metadata belongs to
 * which URL. Pure module (no DOM, no DB), imported by the server metadata
 * injector (server/lib/seoMeta.ts, server/index.ts) and by the client head
 * writer (src/components/RouteHead.tsx, page owners).
 *
 * Ownership:
 *  - static pages (home, cart, about, ...)  -> this registry, written by RouteHead
 *  - /products (catalogue + filters)        -> catalogCopy.ts, written by Products
 *  - /product/:id, /products/:id            -> productSeo.ts, written by ProductDetail
 *  - /blog/:slug                            -> blogPostSeo below, written by Blog
 *  - unknown URLs                           -> NOT_FOUND_SEO (HTTP 404 on the server)
 *
 * Copy rule: a commercial claim (authenticity, guarantee, shipping) stays only
 * when the store's own FAQ, About or Terms page states it. Price and quality
 * superlatives are not used. See docs/reference/seo-claims.md.
 */
import { normalizeDescription, SHARE_IMAGE, SITE_ORIGIN } from './productSeo';

export const INDEX_ROBOTS = 'index, follow';
export const NOINDEX_ROBOTS = 'noindex, nofollow';

export interface PageSeo {
  title: string;
  description: string;
  /** Absolute canonical URL. Omitted for pages with no canonical (404). */
  canonical?: string;
  robots?: string;
  ogType?: 'website' | 'product' | 'article';
  /** Absolute share image; defaults to the site card. */
  image?: string;
  /** Social copy when it differs from <title>/description (homepage only). */
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}

/** The homepage head. index.html mirrors these values; tests/unit/head-seo.test.ts checks it. */
export const HOME_SEO: PageSeo = {
  title: 'جانبی آرنا | خرید آنلاین لوازم جانبی موبایل و تبلت با ضمانت اصالت',
  description:
    'فروشگاه تخصصی جانبی آرنا؛ خرید انواع قاب و کاور گوشی، گلس محافظ، شارژر اصل، کابل، پاوربانک و هولدر با ضمانت اصالت و ارسال به سراسر ایران.',
  canonical: `${SITE_ORIGIN}/`,
  robots: INDEX_ROBOTS,
  ogType: 'website',
  image: SHARE_IMAGE,
  ogTitle: 'جانبی آرنا | خرید آنلاین لوازم جانبی موبایل با ضمانت اصالت',
  ogDescription:
    'خرید لوازم جانبی اصل گوشی هوشمند شامل کاور، گلس، شارژر، کابل و پاوربانک با ضمانت اصالت.',
  twitterTitle: 'جانبی آرنا | خرید آنلاین لوازم جانبی موبایل با ضمانت اصالت',
  twitterDescription:
    'خرید انواع قاب، گلس، شارژر اصل، کابل و هولدر موبایل با ضمانت اصالت و ارسال به سراسر ایران.',
};

function staticPage(path: string, title: string, description: string, noindex = false): PageSeo {
  return {
    title,
    description,
    canonical: `${SITE_ORIGIN}${path}`,
    robots: noindex ? NOINDEX_ROBOTS : INDEX_ROBOTS,
    ogType: 'website',
  };
}

/** Public static routes. Keys are normalized paths (no trailing slash). */
const STATIC_ROUTES: Record<string, PageSeo> = {
  '/wishlist': staticPage('/wishlist', 'علاقه‌مندی‌های من | جانبی آرنا', 'فهرست کالاهای نشان‌شده برای خرید بعدی در فروشگاه جانبی آرنا.', true),
  '/compare': staticPage('/compare', 'مقایسه محصولات | جانبی آرنا', 'مقایسه مشخصات و قیمت لوازم جانبی موبایل در فروشگاه جانبی آرنا.', true),
  '/cart': staticPage('/cart', 'سبد خرید | جانبی آرنا', 'کالاهای انتخاب‌شده، تعداد و مبلغ قابل پرداخت سفارش در جانبی آرنا.', true),
  '/checkout': staticPage('/checkout', 'تسویه حساب | جانبی آرنا', 'ثبت اطلاعات گیرنده، انتخاب روش ارسال و پرداخت سفارش در جانبی آرنا.', true),
  '/checkout/callback': staticPage('/checkout/callback', 'نتیجه‌ی پرداخت | جانبی آرنا', 'نتیجه‌ی پرداخت سفارش در جانبی آرنا.', true),
  '/profile': staticPage('/profile', 'حساب کاربری | جانبی آرنا', 'مدیریت اطلاعات حساب کاربری، نشانی‌ها و سفارش‌های جانبی آرنا.', true),
  '/login': staticPage('/login', 'ورود به حساب کاربری | جانبی آرنا', 'ورود به حساب کاربری جانبی آرنا برای پیگیری سفارش‌ها و مدیریت اطلاعات.', true),
  '/register': staticPage('/register', 'ثبت‌نام | جانبی آرنا', 'ایجاد حساب کاربری جدید در جانبی آرنا.', true),
  '/force-change-password': staticPage('/force-change-password', 'تغییر رمز عبور | جانبی آرنا', 'تغییر رمز عبور حساب کاربری در جانبی آرنا.', true),
  '/about': staticPage(
    '/about',
    'درباره جانبی آرنا | فروشگاه تخصصی لوازم جانبی',
    'معرفی جانبی آرنا، فروشگاه تخصصی عرضه‌ی مستقیم لوازم جانبی موبایل و تبلت با ضمانت اصالت کالا.'
  ),
  '/contact': staticPage(
    '/contact',
    'تماس با ما | پشتیبانی جانبی آرنا',
    'تلفن پشتیبانی، پست الکترونیک و فرم ارسال پیام جانبی آرنا؛ پاسخ‌گویی به سؤالات و پیگیری سفارش‌ها.'
  ),
  '/faq': staticPage(
    '/faq',
    'سؤالات متداول | راهنمای خرید جانبی آرنا',
    'پاسخ پرسش‌های رایج درباره ارسال، مرجوعی، ضمانت اصالت، پرداخت آنلاین و پیگیری سفارش در جانبی آرنا.'
  ),
  '/terms': staticPage('/terms', 'شرایط و قوانین استفاده | جانبی آرنا', 'قوانین ثبت سفارش، پرداخت، ارسال، مرجوعی و حریم خصوصی در فروشگاه اینترنتی جانبی آرنا.'),
  '/privacy': staticPage('/privacy', 'سیاست حفظ حریم خصوصی | جانبی آرنا', 'نحوه جمع‌آوری، نگهداری و حفاظت از اطلاعات شخصی و داده‌های سفارش کاربران جانبی آرنا.'),
  '/blog': staticPage(
    '/blog',
    'مجله جانبی آرنا | راهنمای خرید و معرفی لوازم جانبی',
    'مقالات، راهنمای خرید و معرفی لوازم جانبی موبایل؛ شارژر، پاوربانک، هندزفری و کابل در مجله جانبی آرنا.'
  ),
  '/offers': staticPage(
    '/offers',
    'پیشنهادهای جانبی آرنا | محصولات دارای تخفیف',
    'بخش پیشنهادهای جانبی آرنا برای مرور محصولات دارای تخفیف، با قیمت و موجودی به‌روز هر کالا.'
  ),
  '/new-products': staticPage(
    '/new-products',
    'جدیدترین محصولات جانبی آرنا',
    'تازه‌ترین لوازم جانبی موبایل وارد شده به فروشگاه جانبی آرنا؛ مدل‌های جدید شارژر، کابل، گلس و قاب با ضمانت اصالت.'
  ),
  '/brands': staticPage(
    '/brands',
    'برندهای لوازم جانبی | جانبی آرنا',
    'خرید لوازم جانبی موبایل بر اساس برند در جانبی آرنا، با ضمانت اصالت کالا.'
  ),
};

/** Admin panel (client-only, never indexed). Canonical is the URL itself. */
const ADMIN_SUBPATHS = ['', 'products', 'orders', 'reviews', 'users', 'coupons', 'messages', 'newsletter', 'audit-logs', 'blog', 'settings'];

/** HTTP 404 and client "not found" head. No canonical: the URL is not a page. */
export const NOT_FOUND_SEO: PageSeo = {
  title: 'صفحه پیدا نشد | جانبی آرنا',
  description: 'نشانی موردنظر در جانبی آرنا پیدا نشد. از صفحه‌ی اصلی یا فهرست محصولات ادامه دهید.',
  robots: NOINDEX_ROBOTS,
  ogType: 'website',
};

/** Metadata for one blog article (wording shared by server and client). */
export function blogPostSeo(post: { id: string; title: string; excerpt?: string | null }): PageSeo {
  return {
    title: `${post.title} | مجله جانبی آرنا`,
    description: normalizeDescription(post.excerpt, `${post.title} — در مجله جانبی آرنا.`),
    canonical: `${SITE_ORIGIN}/blog/${encodeURIComponent(post.id)}`,
    robots: INDEX_ROBOTS,
    ogType: 'article',
  };
}

export type RouteMatch =
  | { kind: 'static'; path: string; seo: PageSeo }
  | { kind: 'admin'; path: string; seo: PageSeo }
  | { kind: 'catalog' }
  | { kind: 'product'; id: string }
  | { kind: 'blogPost'; slug: string }
  | { kind: 'notFound' };

/** Trailing slash removed; the root stays '/'. Query strings are not part of the path. */
export function normalizePath(pathname: string): string {
  const path = (pathname || '/').split('?')[0].replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

/** Which owner renders this URL, or which static metadata it carries. */
export function matchRoute(pathname: string): RouteMatch {
  const path = normalizePath(pathname);
  if (path === '/') return { kind: 'static', path, seo: HOME_SEO };
  if (path === '/products') return { kind: 'catalog' };

  const product = path.match(/^\/products?\/(\d+)$/);
  if (product) return { kind: 'product', id: product[1] };

  const post = path.match(/^\/blog\/([^/]+)$/);
  if (post) {
    let slug = post[1];
    try {
      slug = decodeURIComponent(slug);
    } catch {
      return { kind: 'notFound' };
    }
    return { kind: 'blogPost', slug };
  }

  const adminMatch = path.match(/^\/admin(?:\/([a-z-]+))?$/);
  if (adminMatch && ADMIN_SUBPATHS.includes(adminMatch[1] ?? '')) {
    return {
      kind: 'admin',
      path,
      seo: {
        title: 'پنل مدیریت | جانبی آرنا',
        description: 'پنل مدیریت فروشگاه جانبی آرنا.',
        canonical: `${SITE_ORIGIN}${path}`,
        robots: NOINDEX_ROBOTS,
        ogType: 'website',
      },
    };
  }

  const seo = STATIC_ROUTES[path];
  if (seo) return { kind: 'static', path, seo };
  return { kind: 'notFound' };
}

/** Every public static path in the registry (for coverage tests). */
export function staticRoutePaths(): string[] {
  return ['/', ...Object.keys(STATIC_ROUTES)];
}
