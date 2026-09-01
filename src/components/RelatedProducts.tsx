import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { Product } from '../types';
import ProductCard from './ProductCard';
import { toPersianDigits } from '../lib/utils';

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

    fetch(`/api/products?category=${encodeURIComponent(product.category)}&limit=8`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('failed'))))
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
    <section aria-labelledby="related-products-heading" className="mt-10">
      <div className="flex items-center gap-2.5 mb-5">
        <Layers className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
        <h2
          id="related-products-heading"
          className="text-lg font-black text-zinc-900 dark:text-zinc-100"
        >
          محصولات مشابه در دسته‌بندی {product.category}
        </h2>
        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-200/80 dark:border-zinc-700">
          {toPersianDigits(related.length)} کالا
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
