import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import { toPersianDigits } from '../lib/utils';
import { getJson } from '../lib/jsonFetch';

/**
 * RelatedProducts — internal-linking + UX section on the product detail page.
 * Fetches real products from the same category via the live /api/products API
 * (no fabricated data). Also injects a schema.org ItemList JSON-LD so search
 * engines and AI agents can crawl the related-product links.
 */
export default function RelatedProducts({ product }: { product: Product }) {
  const [related, setRelated] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!product?.category) return;

    getJson<Product[]>(`/api/products?category=${encodeURIComponent(product.category)}&limit=8`)
      .then((data: Product[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const sameCategory = data.filter((p) => p.id !== product.id).slice(0, 4);
        setRelated(sameCategory);

        // ItemList JSON-LD built only from real, live API data
        if (sameCategory.length > 0) {
          const existingScript = document.getElementById('related-products-jsonld');
          if (existingScript) existingScript.remove();
          const script = document.createElement('script');
          script.id = 'related-products-jsonld';
          script.type = 'application/ld+json';
          script.text = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `محصولات مشابه ${product.title}`,
            itemListElement: sameCategory.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `https://janebiarena.ir/product/${p.id}`,
              name: p.title,
            })),
          })
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026');
          document.head.appendChild(script);
        }
      })
      .catch(() => {
        // Silent empty state — never fabricate fallback products
        if (!cancelled) setRelated([]);
      });

    return () => {
      cancelled = true;
      const script = document.getElementById('related-products-jsonld');
      if (script) script.remove();
    };
  }, [product?.id, product?.category]);

  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-products-heading" className="mt-10 pt-6 border-t border-zinc-200/70 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-cta)]/10 flex items-center justify-center text-[var(--color-emphasis-text)] shrink-0">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2
            id="related-products-heading"
            className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100 truncate"
          >
            محصولات مشابه در دسته‌بندی «{product.category}»
          </h2>
        </div>
        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-full border border-zinc-200/80 dark:border-zinc-700 shrink-0">
          {toPersianDigits(related.length)} کالا
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
