import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  Plus, Edit2, Trash2, Search, X, Filter, Image as ImageIcon, 
  CheckCircle, AlertTriangle, Package, Sparkles, Tag, DollarSign, Calculator, Upload,
  Smartphone, Shield, Zap, Cable, Headphones, BatteryCharging, Wand2
} from 'lucide-react';
import { Product } from '../../types';
import { toEnglishDigits, toPersianDigits, formatPrice } from '../../lib/utils';

const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  'هولدر و پایه': '/products/hld-13.svg',
  'قاب و کاور': '/products/cas-4.svg',
  'گلس': '/products/gls-3.svg',
  'کابل': '/products/cbl-1.svg',
  'محافظ کابل': '/products/cpr-14.svg',
  'شارژر': '/products/chg-2.svg',
  'هندزفری': '/products/ear-6.svg',
  'پاوربانک': '/products/pb-7.svg',
};

const PRESET_GALLERY = [
  { id: 'hld-13', category: 'هولدر و پایه', brand: 'Baseus', label: 'هولدر مگنتی مگ‌سیف MagPro', url: '/products/hld-13.svg' },
  { id: 'cpr-14', category: 'محافظ کابل', brand: 'Baseus', label: 'محافظ کابل سیلیکونی فنری', url: '/products/cpr-14.svg' },
  { id: 'ear-6', category: 'هندزفری', brand: 'Samsung', label: 'هندزفری TWS بلوتوثی Pro', url: '/products/ear-6.svg' },
  { id: 'ear-10', category: 'هندزفری', brand: 'Xiaomi', label: 'هندزفری In-Ear ارگونومیک', url: '/products/ear-10.svg' },
  { id: 'chg-2', category: 'شارژر', brand: 'Anker', label: 'شارژر فست GaN 20W', url: '/products/chg-2.svg' },
  { id: 'chg-5', category: 'شارژر', brand: 'Samsung', label: 'شارژر سوپرفست 25W', url: '/products/chg-5.svg' },
  { id: 'chg-9', category: 'شارژر', brand: 'Apple', label: 'پد شارژر وایرلس مگ‌سیف', url: '/products/chg-9.svg' },
  { id: 'cbl-1', category: 'کابل', brand: 'Anker', label: 'کابل فست Type-C به Type-C', url: '/products/cbl-1.svg' },
  { id: 'cbl-11', category: 'کابل', brand: 'Apple', label: 'کابل فست لایتنینگ MFi', url: '/products/cbl-11.svg' },
  { id: 'cas-4', category: 'قاب و کاور', brand: 'Apple', label: 'کاور سیلیکونی مگ‌سیف', url: '/products/cas-4.svg' },
  { id: 'cas-8', category: 'قاب و کاور', brand: 'Nillkin', label: 'قاب آرمور ضدضربه CamShield', url: '/products/cas-8.svg' },
  { id: 'gls-3', category: 'گلس', brand: 'Samsung', label: 'گلس شیشه‌ای فول چسب 9H', url: '/products/gls-3.svg' },
  { id: 'gls-12', category: 'گلس', brand: 'Baseus', label: 'گلس سرامیکی انعطاف‌پذیر', url: '/products/gls-12.svg' },
  { id: 'pb-7', category: 'پاوربانک', brand: 'Baseus', label: 'پاوربانک 65W با نمایشگر دیجیتال', url: '/products/pb-7.svg' },
];

export default function AdminProducts() {
  const token = localStorage.getItem('token');
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'هندزفری',
    price: '',
    originalPrice: '',
    discount: '0',
    image: '/products/ear-6.svg',
    brand: 'Samsung',
    warranty: '۷ روز مهلت تست',
    description: '',
    stockQuantity: '15',
    sku: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        addToast('خطا در دریافت لیست محصولات', 'error');
      }
    } catch (err) {
      addToast('خطا در ارتباط با سرور', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (val: string) => {
    const rawVal = toEnglishDigits(val).replace(/[^0-9]/g, '');
    const priceNum = parseInt(rawVal, 10) || 0;
    const origNum = parseInt(toEnglishDigits(formData.originalPrice).replace(/[^0-9]/g, ''), 10) || 0;
    
    let disc = '0';
    if (origNum > priceNum && origNum > 0) {
      disc = Math.round(((origNum - priceNum) / origNum) * 100).toString();
    }

    setFormData(prev => ({
      ...prev,
      price: rawVal,
      discount: disc
    }));
  };

  const handleOriginalPriceChange = (val: string) => {
    const rawVal = toEnglishDigits(val).replace(/[^0-9]/g, '');
    const origNum = parseInt(rawVal, 10) || 0;
    const priceNum = parseInt(toEnglishDigits(formData.price).replace(/[^0-9]/g, ''), 10) || 0;
    
    let disc = '0';
    if (origNum > priceNum && origNum > 0) {
      disc = Math.round(((origNum - priceNum) / origNum) * 100).toString();
    }

    setFormData(prev => ({
      ...prev,
      originalPrice: rawVal,
      discount: disc
    }));
  };

  const handleDiscountChange = (val: string) => {
    const rawVal = toEnglishDigits(val).replace(/[^0-9]/g, '');
    const discNum = Math.min(100, parseInt(rawVal, 10) || 0);
    const origNum = parseInt(toEnglishDigits(formData.originalPrice).replace(/[^0-9]/g, ''), 10) || 0;
    
    let calcPrice = formData.price;
    if (origNum > 0 && discNum >= 0) {
      const calculated = Math.round(origNum * (1 - discNum / 100));
      calcPrice = calculated.toString();
    }

    setFormData(prev => ({
      ...prev,
      discount: discNum.toString(),
      price: calcPrice
    }));
  };

  // Smart Category Change: Automatically sets the relevant vector icon!
  const handleCategoryChange = (newCat: string) => {
    const defaultImg = CATEGORY_DEFAULT_IMAGES[newCat] || '/products/cas-4.svg';
    setFormData(prev => ({
      ...prev,
      category: newCat,
      image: defaultImg
    }));
    addToast(`تصویر مرتبط با دسته "${newCat}" خودکار انتخاب شد`, 'info');
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        title: product.title,
        category: product.category,
        price: product.price ? product.price.toString() : '',
        originalPrice: product.originalPrice ? product.originalPrice.toString() : '',
        discount: product.discount ? product.discount.toString() : '0',
        image: product.image || CATEGORY_DEFAULT_IMAGES[product.category] || '/products/cas-4.svg',
        brand: product.brand,
        warranty: product.warranty || '۷ روز مهلت تست',
        description: product.description || '',
        stockQuantity: product.stockQuantity ? product.stockQuantity.toString() : '10',
        sku: (product as any).sku || ''
      });
    } else {
      setEditingProduct(null);
      const defaultCat = 'هندزفری';
      setFormData({
        title: '',
        category: defaultCat,
        price: '',
        originalPrice: '',
        discount: '0',
        image: CATEGORY_DEFAULT_IMAGES[defaultCat],
        brand: 'Samsung',
        warranty: '۷ روز مهلت تست',
        description: '',
        stockQuantity: '15',
        sku: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseInt(toEnglishDigits(formData.price).replace(/[^0-9]/g, ''), 10);
    const origNum = parseInt(toEnglishDigits(formData.originalPrice).replace(/[^0-9]/g, ''), 10) || priceNum;
    const discNum = parseInt(toEnglishDigits(formData.discount).replace(/[^0-9]/g, ''), 10) || 0;
    const stockNum = parseInt(toEnglishDigits(formData.stockQuantity).replace(/[^0-9]/g, ''), 10) || 0;

    if (!priceNum || priceNum <= 0) {
      addToast('لطفا قیمت معتبر وارد کنید', 'error');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      price: priceNum,
      originalPrice: origNum,
      discount: discNum,
      image: formData.image,
      brand: formData.brand.trim(),
      warranty: formData.warranty.trim(),
      description: formData.description.trim(),
      stockQuantity: stockNum,
      sku: formData.sku.trim() || undefined
    };

    try {
      const url = editingProduct 
        ? `/api/admin/products/${editingProduct.id}` 
        : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        addToast(editingProduct ? 'محصول با موفقیت بروزرسانی شد' : 'محصول با موفقیت ایجاد شد', 'success');
        setIsModalOpen(false);
        fetchProducts();
      } else {
        const data = await res.json();
        addToast(data.error || 'خطا در ثبت محصول', 'error');
      }
    } catch (err) {
      addToast('خطا در ارتباط با سرور', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('آیا از حذف این محصول اطمینان دارید؟')) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      ((p as any).sku && (p as any).sku.toLowerCase().includes(q));
    
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    
    let matchesStock = true;
    const stock = p.stockQuantity ?? 10;
    if (stockFilter === 'in_stock') matchesStock = stock > 5;
    else if (stockFilter === 'low_stock') matchesStock = stock > 0 && stock <= 5;
    else if (stockFilter === 'out_of_stock') matchesStock = stock <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const categoriesList = Array.from(new Set(products.map(p => p.category)));

  // Sorted Preset Gallery: matches current form category first!
  const sortedGallery = [...PRESET_GALLERY].sort((a, b) => {
    if (a.category === formData.category && b.category !== formData.category) return -1;
    if (a.category !== formData.category && b.category === formData.category) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main-light)] dark:text-white mb-1">مدیریت محصولات و موجودی انبار</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">افزودن کالا، تنظیم هوشمند قیمت و تخفیف، تخصیص خودکار وکتور کالا و کنترل موجودی</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs shadow-lg shadow-orange-500/25 transition-all cursor-pointer self-start sm:self-auto hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>افزودن محصول جدید</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 p-4 rounded-3xl border border-[var(--color-border-light)] dark:border-gray-700 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="جستجوی نام کالا، برند یا کد SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
          />
          <Search className="h-4 w-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full md:w-44 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:border-orange-500 cursor-pointer"
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
          className="w-full md:w-44 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:border-orange-500 cursor-pointer"
        >
          <option value="all">همه وضعیت‌های انبار</option>
          <option value="in_stock">موجود در انبار</option>
          <option value="low_stock">موجودی بحرانی (زیر ۵ عدد)</option>
          <option value="out_of_stock">اتمام موجودی</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl border border-[var(--color-border-light)] dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border-light)] dark:border-gray-700 bg-gray-50/75 dark:bg-gray-800/50 text-[11px] font-black text-gray-500 dark:text-gray-400">
                <th className="p-4 pr-6">کالا و دسته‌بندی</th>
                <th className="p-4">برند</th>
                <th className="p-4">قیمت اصلی</th>
                <th className="p-4">تخفیف</th>
                <th className="p-4">قیمت نهایی فروش</th>
                <th className="p-4">موجودی انبار</th>
                <th className="p-4 pl-6 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mb-2" />
                    <p className="font-bold">در حال بارگذاری لیست محصولات...</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400">
                    <Package className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-2 stroke-[1.5]" />
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
                            className="w-12 h-12 rounded-xl object-contain bg-gray-50 dark:bg-[var(--color-surface-dark)] border border-[var(--color-border-light)] dark:border-gray-700 p-1 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] line-clamp-1 leading-snug">{p.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/40">
                                {p.category}
                              </span>
                              {(p as any).sku && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  SKU: {(p as any).sku}
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40">
                            {toPersianDigits(p.discount || 0)}٪
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-orange-600 dark:text-orange-400 font-mono">
                        {formatPrice(p.price)}
                      </td>
                      <td className="p-4">
                        {stock > 5 ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {toPersianDigits(stock)} عدد موجود
                          </span>
                        ) : stock > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            تنها {toPersianDigits(stock)} عدد باقی‌مانده
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            ناموجود
                          </span>
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

      {/* Modern Fixed-Height Responsive Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-md">
          <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-3xl max-w-2xl w-full shadow-2xl border border-[var(--color-border-light)] dark:border-gray-700 flex flex-col max-h-[92vh] overflow-hidden text-right animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Sticky Header */}
            <div className="p-5 border-b border-[var(--color-border-light)] dark:border-gray-700 flex items-center justify-between bg-[var(--color-surface-light)]/80 dark:bg-gray-800/80 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--color-text-main-light)] dark:text-white">
                    {editingProduct ? `ویرایش کالا: ${editingProduct.title}` : 'افزودن کالای جدید به فروشگاه'}
                  </h2>
                  <span className="text-[11px] text-gray-400">اطلاعات کالا به صورت زنده در کاتالوگ و انبار ذخیره خواهد شد</span>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSubmit} id="product-form" className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs font-bold">
              
              {/* Product Title */}
              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1.5 font-black">
                  عنوان کامل محصول <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: هندزفری بی‌سیم سامسونگ Galaxy Buds2 Pro"
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-800 dark:text-gray-200 mb-1.5 flex items-center justify-between">
                    <span>دسته‌بندی <span className="text-rose-500">*</span></span>
                    <span className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-1 font-bold">
                      <Wand2 className="h-3 w-3" /> انتخاب خودکار وکتور
                    </span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="هولدر و پایه">هولدر و پایه</option>
                    <option value="قاب و کاور">قاب و کاور</option>
                    <option value="گلس">گلس</option>
                    <option value="کابل">کابل</option>
                    <option value="محافظ کابل">محافظ کابل</option>
                    <option value="شارژر">شارژر</option>
                    <option value="هندزفری">هندزفری</option>
                    <option value="پاوربانک">پاوربانک</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-800 dark:text-gray-200 mb-1.5">
                    برند محصول <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="مثال: Samsung, Apple, Anker, Xiaomi"
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Price Calculation Hub */}
              <div className="bg-orange-50/50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-200/60 dark:border-orange-800/40 space-y-4">
                <div className="flex items-center gap-2 text-orange-800 dark:text-orange-300 font-black">
                  <Calculator className="h-4 w-4 text-orange-600" />
                  <span>محاسبه هوشمند قیمت و تخفیف کالا</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1 text-[11px]">قیمت اصلی (قبل تخفیف - تومان)</label>
                    <input
                      type="text"
                      value={formData.originalPrice ? formatPrice(parseInt(toEnglishDigits(formData.originalPrice), 10) || 0) : ''}
                      onChange={(e) => handleOriginalPriceChange(e.target.value)}
                      placeholder="مثال: ۱,۲۰۰,۰۰۰"
                      className="w-full bg-[var(--color-surface-light)] dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-xs font-mono font-bold text-[var(--color-text-main-light)] dark:text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1 text-[11px]">درصد تخفیف (٪)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.discount}
                      onChange={(e) => handleDiscountChange(e.target.value)}
                      placeholder="۰"
                      className="w-full bg-[var(--color-surface-light)] dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1 text-[11px]">قیمت نهایی فروش (تومان) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.price ? formatPrice(parseInt(toEnglishDigits(formData.price), 10) || 0) : ''}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder="مثال: ۹۸۰,۰۰۰"
                      className="w-full bg-[var(--color-surface-light)] dark:bg-gray-800 border border-orange-300 dark:border-orange-500 rounded-xl p-2.5 text-xs font-mono font-black text-orange-600 dark:text-orange-400 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Quantity & Warranty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-800 dark:text-gray-200 mb-1.5">
                    موجودی انبار (تعداد) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-800 dark:text-gray-200 mb-1.5">گارانتی و ضمانت</label>
                  <input
                    type="text"
                    value={formData.warranty}
                    onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                    placeholder="مثال: ۱۸ ماهه ایستا / ۷ روز مهلت تست"
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Visual Vector Asset Gallery Selector */}
              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-2 flex items-center justify-between">
                  <span>تصویر و وکتور کالا (کاملاً متقارن و سنتر)</span>
                  <span className="text-[11px] text-orange-600 dark:text-orange-400 font-bold">
                    پیشنهاد متناسب با دسته: {formData.category}
                  </span>
                </label>

                {/* Selected Preview Box */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-200 dark:border-gray-600 mb-3">
                  <img 
                    src={formData.image} 
                    alt="Preview" 
                    className="w-16 h-16 rounded-xl border border-gray-200 dark:border-gray-600 object-contain p-1.5 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] shadow-sm shrink-0" 
                  />
                  <div className="overflow-hidden grow">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">آدرس فایل تصویر وکتور:</span>
                    <span className="font-mono text-xs text-orange-600 dark:text-orange-400 font-bold truncate block dir-ltr text-left">
                      {formData.image}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                      ✓ بهینه‌سازی‌شده برای بارگذاری محلی و بدون باگ در شبکه ایران
                    </span>
                  </div>
                </div>

                {/* Visual Grid Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 pr-2">
                  {sortedGallery.map((item) => {
                    const isSelected = formData.image === item.url;
                    const isCategoryMatch = item.category === formData.category;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setFormData({ ...formData, image: item.url })}
                        className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all border ${
                          isSelected 
                            ? 'bg-orange-500 text-white border-orange-600 shadow-md scale-102' 
                            : isCategoryMatch
                              ? 'bg-orange-50/70 dark:bg-orange-950/20 text-gray-800 dark:text-[var(--color-text-main-dark)] border-orange-200 dark:border-orange-800 hover:border-orange-400'
                              : 'bg-[var(--color-surface-light)] dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <img src={item.url} alt={item.label} className="w-9 h-9 rounded-lg object-contain bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] p-0.5 shrink-0 shadow-xs" />
                        <div className="min-w-0">
                          <span className="text-[11px] font-black truncate block leading-tight">{item.label}</span>
                          <span className={`text-[9px] block ${isSelected ? 'text-orange-100' : 'text-gray-400'}`}>{item.category}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1.5">مشخصات و توضیحات فنی کالا</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="توضیحات تکمیلی محصول..."
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500 leading-relaxed"
                />
              </div>
            </form>

            {/* Sticky Action Footer */}
            <div className="p-4 sm:p-5 border-t border-[var(--color-border-light)] dark:border-gray-700 flex items-center justify-end gap-3 bg-[var(--color-surface-light)]/80 dark:bg-gray-800/80 backdrop-blur-md shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                form="product-form"
                className="px-6 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md shadow-orange-500/25 transition-all cursor-pointer hover:scale-102 active:scale-95"
              >
                {editingProduct ? 'ذخیره تغییرات محصول' : 'ثبت و انتشار محصول'}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
