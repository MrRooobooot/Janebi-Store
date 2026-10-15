import { authFetch } from '../../lib/api';
import { jsonFetch } from '../../lib/jsonFetch';
import { useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Plus, Edit2, Trash2, Search, Filter, Package } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader';
import ProductFormModal from '../../components/admin/ProductFormModal';
import { MIN_MARGIN_PCT } from '../../lib/productForm';
import { Product } from '../../types';
import { toEnglishDigits, toPersianDigits, formatPrice } from '../../lib/utils';

export default function AdminProducts() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Inline quick stock edit: click the stock cell, type a number, Enter/blur saves.
  const [stockEditId, setStockEditId] = useState<number | null>(null);
  const [stockEditValue, setStockEditValue] = useState('');
  const [stockSaving, setStockSaving] = useState(false);

  const saveQuickStock = async (id: number) => {
    const stockNum = parseInt(toEnglishDigits(stockEditValue).replace(/[^0-9]/g, ''), 10);
    if (isNaN(stockNum) || stockNum < 0) {
      addToast('موجودی باید عددی مثبت باشد', 'error');
      setStockEditId(null);
      return;
    }
    setStockSaving(true);
    try {
      await jsonFetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {},
        body: JSON.stringify({ stockQuantity: stockNum })
      });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, stockQuantity: stockNum } : p));
      addToast('موجودی بروزرسانی شد', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'خطا در ارتباط با سرور', 'error');
    } finally {
      setStockSaving(false);
      setStockEditId(null);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // limit=1000: the default page size is 20 — the admin catalogue must see
      // every product, not just the first page.
      // /api/admin/products is the authed list: it carries costPrice/barcode/
      // isActive, which the public /api/products deliberately omits.
      // no-store: after create/delete the browser must NOT replay a stale list.
      const res = await authFetch('/api/admin/products?limit=1000', { cache: 'no-store' });
      if (!res.ok) throw new Error(`خطای سرور (${res.status})`);
      const data = (await res.json()) as Product[];
      setProducts(data);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'خطا در ارتباط با سرور', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (product?: Product) => {
    setEditingProduct(product ?? null);
    setIsModalOpen(true);
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm('آیا از حذف این محصول اطمینان دارید؟')) return;

    try {
      const res = await authFetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: {}
      });

      if (res.ok) {
        addToast('محصول حذف شد', 'success');
        fetchProducts();
      } else {
        const data = await res.json();
        addToast(data.error || 'خطا در حذف محصول', 'error');
      }
    } catch (err) {
      addToast('خطا در ارتباط با سرور', 'error');
    }
  };

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || 
      p.title.toLowerCase().includes(q) || 
      p.brand.toLowerCase().includes(q) ||
      (!!p.sku && p.sku.toLowerCase().includes(q));
    
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    
    let matchesStock = true;
    const stock = p.stockQuantity ?? 10;
    if (stockFilter === 'in_stock') matchesStock = stock > 5;
    else if (stockFilter === 'low_stock') matchesStock = stock > 0 && stock <= 5;
    else if (stockFilter === 'out_of_stock') matchesStock = stock <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const categoriesList = Array.from(new Set(products.map(p => p.category)));
  // Brand suggestions for the form's datalist, most recent catalogue first.
  const brandSuggestions = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeader icon={ Package } title="مدیریت محصولات و موجودی انبار" subtitle="افزودن کالا، تنظیم هوشمند قیمت و تخفیف، تخصیص خودکار وکتور کالا و کنترل موجودی" />
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary flex items-center gap-2 bg-[var(--color-cta)] hover:bg-[var(--color-cta-hover)] text-white font-bold px-5 py-3 rounded-2xl text-xs shadow-lg shadow-primary-500/25 transition-all cursor-pointer self-start sm:self-auto hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>افزودن محصول جدید</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 p-4 rounded-2xl border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="جستجوی نام کالا، برند یا کد SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full md:w-44 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          <option value="all">همه دسته‌بندی‌ها</option>
          {categoriesList.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Stock Filter */}
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="w-full md:w-44 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          <option value="all">همه وضعیت‌های انبار</option>
          <option value="in_stock">موجود در انبار</option>
          <option value="low_stock">موجودی بحرانی (زیر ۵ عدد)</option>
          <option value="out_of_stock">اتمام موجودی</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-2xl border border-[var(--color-border-light)] dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border-light)] dark:border-gray-700 bg-gray-50/75 dark:bg-gray-800/50 text-xs font-bold text-gray-600 dark:text-gray-300">
                <th className="p-4 pr-6">کالا و دسته‌بندی</th>
                <th className="p-4">برند</th>
                <th className="p-4">قیمت اصلی</th>
                <th className="p-4">تخفیف</th>
                <th className="p-4">قیمت نهایی فروش</th>
                <th className="p-4">حاشیه سود</th>
                <th className="p-4">موجودی انبار</th>
                <th className="p-4 pl-6 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-2" />
                    <p className="font-bold">در حال بارگذاری لیست محصولات...</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-2 stroke-[1.5]" />
                    <p className="font-bold">هیچ محصولی با این مشخصات یافت نشد.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stock = p.stockQuantity ?? 10;
                  const hasDiscount = p.discount && p.discount > 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="p-4 pr-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.title}
                            width="48"
                            height="48"
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 rounded-xl object-contain bg-gray-50 dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-gray-700 p-1 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] line-clamp-1 leading-snug">{p.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/40">
                                {p.category}
                              </span>
                              {p.sku && (
                                <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                                  SKU: {p.sku}
                                </span>
                              )}
                              {p.isActive === 0 && (
                                <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-300/60 dark:border-gray-700">
                                  مخفی
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-700 dark:text-gray-300">
                        {p.brand}
                      </td>
                      <td className="p-4 font-mono font-bold text-gray-500">
                        {p.originalPrice && p.originalPrice > p.price ? formatPrice(p.originalPrice) : formatPrice(p.price)}
                      </td>
                      <td className="p-4">
                        {hasDiscount ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40">
                            {toPersianDigits(p.discount || 0)}٪
                          </span>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-[var(--color-emphasis-text)] font-mono">
                        {formatPrice(p.price)}
                      </td>
                      <td className="p-4">
                        {p.costPrice && p.price > 0 ? (
                          (() => {
                            const margin = p.price - p.costPrice;
                            const pct = Math.round((margin / p.price) * 100);
                            const belowFloor = pct < MIN_MARGIN_PCT;
                            return (
                              <div className="flex flex-col items-start gap-1">
                                <span className="font-mono text-xs">{formatPrice(margin)}</span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                                    belowFloor
                                      ? 'text-rose-700 bg-rose-50 dark:bg-rose-900/20 border-rose-200/50 dark:border-rose-800/40'
                                      : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/40'
                                  }`}
                                >
                                  {toPersianDigits(pct)}٪{belowFloor ? ' · زیر کف' : ''}
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {stockEditId === p.id ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            autoFocus
                            disabled={stockSaving}
                            defaultValue={stockEditValue}
                            onChange={(e) => setStockEditValue(e.target.value)}
                            onBlur={() => saveQuickStock(p.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                              if (e.key === 'Escape') setStockEditId(null);
                            }}
                            aria-label={`موجودی جدید برای ${p.title}`}
                            className="w-20 bg-white dark:bg-gray-700 border-2 border-primary-500 rounded-xl px-2 py-1 text-xs font-mono font-bold text-gray-800 dark:text-gray-100 focus:outline-none text-center"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setStockEditId(p.id); setStockEditValue(String(stock)); }}
                            title="کلیک برای تغییر سریع موجودی"
                            className={`inline-flex items-center gap-1.5 font-bold rounded-lg px-1.5 py-0.5 -mx-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors cursor-pointer ${
                              stock > 5 ? 'text-emerald-600 dark:text-emerald-400' :
                              stock > 0 ? 'text-amber-600 dark:text-amber-400' :
                              'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              stock > 5 ? 'bg-emerald-500' :
                              stock > 0 ? 'bg-amber-500 animate-pulse' :
                              'bg-rose-500'
                            }`} />
                            {stock > 0 ? `${toPersianDigits(stock)} عدد` : 'ناموجود'}
                          </button>
                        )}
                      </td>
                      <td className="p-4 pl-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openModal(p)}
                            className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                            title="ویرایش کالا"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                            title="حذف کالا"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <ProductFormModal
          product={editingProduct}
          brandSuggestions={brandSuggestions}
          onClose={() => setIsModalOpen(false)}
          onSaved={fetchProducts}
        />
      )}
    </div>
  );
}
