import { useState, useEffect, useMemo } from 'react';
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

export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const searchParam = searchParams.get('search');
  const brandParam = searchParams.get('brand'); // from /products?brand=X links

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [onlyDiscounted, setOnlyDiscounted] = useState<boolean>(false);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('default');
  const [inPageQuery, setInPageQuery] = useState<string>('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  const [categories, setCategories] = useState<{name: string; count: number}[]>([]);
  const [brands, setBrands] = useState<{name: string; count: number}[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Sync category param from URL
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory('همه');
    }
  }, [categoryParam]);

  // Sync search param from URL
  useEffect(() => {
    if (searchParam) {
      setInPageQuery(searchParam);
    }
  }, [searchParam]);

  // Sync brand param from URL (BrandShowcase/Brands page links)
  useEffect(() => {
    if (brandParam) {
      setSelectedBrands(brandParam.split(',').filter(Boolean));
    } else {
      setSelectedBrands([]);
    }
  }, [brandParam]);

  // Fetch Categories and Brands for sidebar
  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(res => res.json()),
      fetch('/api/brands').then(res => res.json())
    ]).then(([catsData, brandsData]) => {
      setCategories([{ name: 'همه', count: 0 }, ...catsData.map((c: any) => ({ name: c.title || c.name, count: c.count || 0 }))]);
      setBrands(brandsData.map((b: any) => ({ name: typeof b === 'string' ? b : (b.name || b.title || 'Unknown'), count: b.count || 0 })));
    }).catch(err => console.error("Error fetching filter metadata", err));
  }, []);

  // Fetch filtered products
  useEffect(() => {
    setLoading(true);
    
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== 'همه') params.append('category', selectedCategory);
    if (inPageQuery) params.append('search', inPageQuery);
    if (selectedBrands.length > 0) params.append('brands', selectedBrands.join(','));
    if (minPrice !== '') params.append('minPrice', minPrice.toString());
    if (maxPrice !== '') params.append('maxPrice', maxPrice.toString());
    if (onlyInStock) params.append('inStock', 'true');
    if (onlyDiscounted) params.append('hasDiscount', 'true');
    if (sortBy && sortBy !== 'default') params.append('sort', sortBy);
    params.append('page', page.toString());
    params.append('limit', '20');

    fetch(`/api/products?${params.toString()}`)
      .then(async (res) => {
        const total = res.headers.get('X-Total-Count');
        const tPages = res.headers.get('X-Total-Pages');
        if (total) setTotalProducts(parseInt(total));
        if (tPages) setTotalPages(parseInt(tPages));
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setProducts([]);
        setLoading(false);
      });
  }, [selectedCategory, inPageQuery, selectedBrands, minPrice, maxPrice, onlyInStock, onlyDiscounted, sortBy, page]);

  const filteredProducts = products; // Already filtered on backend

  // Actions
  const toggleBrand = (brand: string) => {
    setPage(1); // Reset page on filter change
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const handlePricePreset = (preset: PricePreset) => {
    setPage(1);
    setMinPrice(preset.min);
    setMaxPrice(preset.max);
  };

  const handleCustomPrice = (min: number | '', max: number | '') => {
    setPage(1);
    setMinPrice(min);
    setMaxPrice(max);
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
    setPage(1);
  };

  const clearSearch = () => {
    setInPageQuery('');
    setPage(1);
  };

  const activeFiltersCount =
    (selectedCategory !== 'همه' ? 1 : 0) +
    selectedBrands.length +
    (minPrice !== '' || maxPrice !== '' ? 1 : 0) +
    (onlyDiscounted ? 1 : 0) +
    (onlyInStock ? 1 : 0) +
    (inPageQuery ? 1 : 0);

  return {
    products,
    filteredProducts,
    loading,
    categories,
    brands,
    selectedCategory,
    setSelectedCategory,
    selectedBrands,
    setSelectedBrands,
    toggleBrand,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    applyPricePreset: handlePricePreset,
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
