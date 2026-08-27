import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Product } from '../types';

export interface PricePreset {
  label: string;
  min: number | '';
  max: number | '';
}

export const PRICE_PRESETS: PricePreset[] = [
  { label: 'همه قیمت‌ها', min: '', max: '' },
  { label: 'زیر ۵۰۰ هزار تومان', min: '', max: 500000 },
  { label: '۵۰۰ هزار تا ۲ میلیون', min: 500000, max: 2000000 },
  { label: '۲ تا ۵ میلیون تومان', min: 2000000, max: 5000000 },
  { label: 'بالای ۵ میلیون تومان', min: 5000000, max: '' },
];

// In-memory client cache to instantly switch between filtered tabs/pages
const clientFilterCache = new Map<string, { products: Product[]; total: number; totalPages: number }>();

export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const searchParam = searchParams.get('search');
  const brandParam = searchParams.get('brand');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || 'همه');
  const [selectedBrands, setSelectedBrands] = useState<string[]>(brandParam ? brandParam.split(',').filter(Boolean) : []);
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [onlyDiscounted, setOnlyDiscounted] = useState<boolean>(false);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('default');
  const [inPageQuery, setInPageQuery] = useState<string>(searchParam || '');
  const [debouncedQuery, setDebouncedQuery] = useState<string>(searchParam || '');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [brands, setBrands] = useState<{ name: string; count: number }[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Debounce in-page text search by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inPageQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [inPageQuery]);

  // Sync category param from URL
  useEffect(() => {
    setSelectedCategory(categoryParam || 'همه');
  }, [categoryParam]);

  // Sync brand param from URL
  useEffect(() => {
    if (brandParam) {
      setSelectedBrands(brandParam.split(',').filter(Boolean));
    }
  }, [brandParam]);

  // Fetch Categories and Brands once
  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((res) => res.json()),
      fetch('/api/brands').then((res) => res.json())
    ]).then(([catsData, brandsData]) => {
      setCategories(Array.isArray(catsData) ? catsData.map((c: any) => ({ name: c.title || c.name, count: c.count || 0 })) : []);
      setBrands(Array.isArray(brandsData) ? brandsData.map((b: any) => ({ name: typeof b === 'string' ? b : (b.name || b.title || 'Unknown'), count: b.count || 0 })) : []);
    }).catch(() => {});
  }, []);

  // Fetch filtered products with instant Client Cache
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'همه') params.append('category', selectedCategory);
    if (debouncedQuery) params.append('search', debouncedQuery);
    if (selectedBrands.length > 0) params.append('brands', selectedBrands.join(','));
    if (minPrice !== '') params.append('minPrice', minPrice.toString());
    if (maxPrice !== '') params.append('maxPrice', maxPrice.toString());
    if (onlyInStock) params.append('inStock', 'true');
    if (onlyDiscounted) params.append('hasDiscount', 'true');
    if (sortBy && sortBy !== 'default') params.append('sort', sortBy);
    params.append('page', page.toString());
    params.append('limit', '20');

    const cacheKey = params.toString();
    if (clientFilterCache.has(cacheKey)) {
      const cached = clientFilterCache.get(cacheKey)!;
      setProducts(cached.products);
      setTotalProducts(cached.total);
      setTotalPages(cached.totalPages);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    fetch(`/api/products?${cacheKey}`)
      .then(async (res) => {
        const total = res.headers.get('X-Total-Count');
        const tPages = res.headers.get('X-Total-Pages');
        const count = total ? parseInt(total) : 0;
        const pages = tPages ? parseInt(tPages) : 1;
        const data = await res.json();
        return { data: Array.isArray(data) ? data : [], count, pages };
      })
      .then(({ data, count, pages }) => {
        if (cancelled) return;
        clientFilterCache.set(cacheKey, { products: data, total: count, totalPages: pages });
        setProducts(data);
        setTotalProducts(count);
        setTotalPages(pages);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCategory, debouncedQuery, selectedBrands, minPrice, maxPrice, onlyInStock, onlyDiscounted, sortBy, page]);

  const filteredProducts = products;

  // Actions
  const toggleBrand = (brand: string) => {
    setPage(1);
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const resetAllFilters = () => {
    setSelectedCategory('همه');
    setSelectedBrands([]);
    setMinPrice('');
    setMaxPrice('');
    setOnlyDiscounted(false);
    setOnlyInStock(false);
    setSortBy('default');
    setInPageQuery('');
    setDebouncedQuery('');
    setPage(1);
    setSearchParams({});
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'همه') count++;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (minPrice !== '' || maxPrice !== '') count++;
    if (onlyDiscounted) count++;
    if (onlyInStock) count++;
    if (inPageQuery) count++;
    return count;
  }, [selectedCategory, selectedBrands, minPrice, maxPrice, onlyDiscounted, onlyInStock, inPageQuery]);

  return {
    products,
    filteredProducts,
    loading,
    categories,
    brands,
    selectedCategory,
    setSelectedCategory,
    selectedBrands,
    toggleBrand,
    setSelectedBrands,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    onlyDiscounted,
    setOnlyDiscounted,
    onlyInStock,
    setOnlyInStock,
    sortBy,
    setSortBy,
    inPageQuery,
    setInPageQuery,
    mobileFilterOpen,
    setMobileFilterOpen,
    resetAllFilters,
    activeFiltersCount,
    setSearchParams,
    page,
    setPage,
    totalPages,
    totalProducts,
  };
}
