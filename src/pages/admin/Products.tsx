import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  Plus, Edit2, Trash2, Search, X, Filter, Image as ImageIcon, 
  CheckCircle, AlertTriangle, Package, Sparkles, Tag, DollarSign, Calculator, Upload
} from 'lucide-react';
import { Product } from '../../types';
import { toEnglishDigits, toPersianDigits, formatPrice } from '../../lib/utils';

const PRESET_GALLERY = [
  { id: 'chg-2', category: 'شارژر', brand: 'Anker', label: 'شارژر دیواری ۲۰ وات انکر', url: '/products/chg-2.svg' },
  { id: 'chg-5', category: 'شارژر', brand: 'Samsung', label: 'شارژر ۲۵ وات سامسونگ', url: '/products/chg-5.svg' },
  { id: 'chg-9', category: 'شارژر', brand: 'Apple', label: 'شارژر مگ‌سیف بی‌سیم', url: '/products/chg-9.svg' },
  { id: 'cbl-1', category: 'کابل', brand: 'Anker', label: 'کابل تایپ‌سی فست', url: '/products/cbl-1.svg' },
  { id: 'cbl-11', category: 'کابل', brand: 'Anker', label: 'کابل لایتنینگ MFi', url: '/products/cbl-11.svg' },
  { id: 'cas-4', category: 'قاب و کاور', brand: 'Apple', label: 'قاب سیلیکونی مگ‌سیف', url: '/products/cas-4.svg' },
  { id: 'cas-8', category: 'قاب و کاور', brand: 'Nillkin', label: 'قاب ضدضربه نیلکین', url: '/products/cas-8.svg' },
  { id: 'gls-3', category: 'گلس', brand: 'Samsung', label: 'گلس شیشه‌ای S24 Ultra', url: '/products/gls-3.svg' },
  { id: 'gls-12', category: 'گلس', brand: 'Baseus', label: 'گلس سرامیکی ۱۵ پرو مکس', url: '/products/gls-12.svg' },
  { id: 'ear-6', category: 'هندزفری', brand: 'Samsung', label: 'Galaxy Buds2 Pro', url: '/products/ear-6.svg' },
  { id: 'ear-10', category: 'هندزفری', brand: 'Xiaomi', label: 'Redmi Buds 5 Pro', url: '/products/ear-10.svg' },
  { id: 'pb-7', category: 'پاوربانک', brand: 'Baseus', label: 'پاوربانک ۶۵ وات Adaman', url: '/products/pb-7.svg' },
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
    category: 'قاب و کاور',
    price: '',
    originalPrice: '',
    discount: '0',
    image: '/products/cas-4.svg',
    brand: 'Apple',
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
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (err) {
      addToast('خطا در دریافت لیست محصولات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        title: product.title,
        category: product.category,
        price: product.price.toString(),
        originalPrice: product.originalPrice?.toString() || '',
        discount: product.discount?.toString() || '0',
        image: product.image || '/products/cas-4.svg',
        brand: product.brand,
        warranty: product.warranty || '',
        description: product.description || '',
        stockQuantity: (product.stockQuantity ?? 10).toString(),
        sku: product.sku || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        title: '',
        category: 'قاب و کاور',
        price: '450000',
        originalPrice: '500000',
        discount: '10',
        image: '/products/cas-4.svg',
        brand: 'Apple',
        warranty: '۷ روز مهلت تست فیزیکی',
        description: '',
        stockQuantity: '20',
        sku: `SKU-${Date.now().toString().slice(-6)}`
      });
    }
    setIsModalOpen(true);
  };

  // Smart Price & Discount calculation
  const handleOriginalPriceChange = (val: string) => {
    const orig = parseInt(toEnglishDigits(val)) || 0;
    const disc = parseInt(toEnglishDigits(formData.discount)) || 0;
    let newPrice = formData.price;
    if (orig > 0 && disc > 0) {
      newPrice = Math.round(orig * (1 - disc / 100)).toString();
    } else if (orig > 0 && (!formData.price || formData.price === '0')) {
      newPrice = orig.toString();
    }
    setFormData({ ...formData, originalPrice: val, price: newPrice });
  };

  const handleDiscountChange = (val: string) => {
    const disc = Math.min(Math.max(parseInt(toEnglishDigits(val)) || 0, 0), 99);
    const orig = parseInt(toEnglishDigits(formData.originalPrice)) || parseInt(toEnglishDigits(formData.price)) || 0;
    let newPrice = formData.price;
    if (orig > 0) {
      newPrice = Math.round(orig * (1 - disc / 100)).toString();
    }
    setFormData({ ...formData, discount: disc.toString(), price: newPrice });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        category: formData.category,
        price: parseInt(toEnglishDigits(formData.price)) || 0,
        originalPrice: formData.originalPrice ? parseInt(toEnglishDigits(formData.originalPrice)) : null,
        discount: parseInt(toEnglishDigits(formData.discount)) || 0,
        image: formData.image,
        brand: formData.brand,
        warranty: formData.warranty,
        description: formData.description,
        stockQuantity: parseInt(toEnglishDigits(formData.stockQuantity)) || 0,
        sku: formData.sku
      };

      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error();

      addToast(editingProduct ? 'محصول با موفقیت ویرایش شد' : 'محصول جدید با موفقیت اضافه شد', 'success');
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      addToast('خطا در ذخیره اطلاعات محصول', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('آیا از حذف این محصول اطمینان دارید؟')) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      addToast('محصول با موفقیت حذف شد', 'success');
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      addToast('خطا در حذف محصول', 'error');
    }
  };

  // Filtered Products List
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
                          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    
    let matchesStock = true;
    const stock = p.stockQuantity ?? 10;
    if (stockFilter === 'in_stock') matchesStock = stock > 5;
    else if (stockFilter === 'low_stock') matchesStock = stock > 0 && stock <= 5;
    else if (stockFilter === 'out_of_stock') matchesStock = stock <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const categoriesList = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-1">مدیریت محصولات و موجودی انبار</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">افزودن کالا، تنظیم هوشمند قیمت و تخفیف، کنترل موجودی و گارانتی</p>
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
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs flex flex-col md:flex-row items-center gap-3">
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
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-50/80 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="p-4 font-bold">تصویر و عنوان محصول</th>
                <th className="p-4 font-bold">دسته‌بندی و برند</th>
                <th className="p-4 font-bold">قیمت و تخفیف</th>
                <th className="p-4 font-bold">موجودی انبار</th>
                <th className="p-4 font-bold">کد SKU</th>
                <th className="p-4 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">در حال بارگذاری لیست کالاها...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">هیچ محصولی با این مشخصات یافت نشد.</td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stock = p.stockQuantity ?? 10;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img 
                          src={p.image} 
                          alt={p.title} 
                          className="w-12 h-12 rounded-xl object-contain bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 p-1 shrink-0 shadow-xs"
                        />
                        <div className="truncate max-w-xs">
                          <div className="font-extrabold text-gray-900 dark:text-white truncate">{p.title}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{p.warranty || 'بدون گارانتی'}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800 dark:text-gray-200">{p.category}</div>
                        <div className="text-[10px] text-orange-600 dark:text-orange-400 font-bold">{p.brand}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-black text-gray-900 dark:text-white">{toPersianDigits(p.price.toLocaleString('fa-IR'))} تومان</div>
                        {p.discount ? (
                          <div className="text-[10px] text-rose-500 font-bold">{toPersianDigits(p.discount)}٪ تخفیف</div>
                        ) : null}
                      </td>
                      <td className="p-4">
                        {stock <= 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900/40">
                            اتمام موجودی
                          </span>
                        ) : stock <= 5 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/40 text-amber-700 border border-amber-200 dark:border-amber-900/40">
                            {toPersianDigits(stock)} عدد (بحرانی)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 border border-emerald-200 dark:border-emerald-900/40">
                            {toPersianDigits(stock)} عدد موجود
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-gray-500 dark:text-gray-400">{p.sku || '-'}</td>
                      <td className="p-4 text-center">
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
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[92vh] overflow-hidden text-right animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Sticky Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
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
                  placeholder="مثال: شارژر دیواری ۲۰ وات انکر مدل Nano Pro"
                  className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-800 dark:text-gray-200 mb-1.5">
                    دسته‌بندی <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="قاب و کاور">قاب و کاور</option>
                    <option value="گلس">گلس</option>
                    <option value="شارژر">شارژر</option>
                    <option value="کابل">کابل</option>
                    <option value="هندزفری">هندزفری</option>
                    <option value="پاوربانک">پاوربانک</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-800 dark:text-gray-200 mb-1.5">
                    برند سازنده <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="مثال: Anker, Apple, Samsung, Baseus"
                    className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Smart Pricing & Discount Box */}
              <div className="bg-orange-50/60 dark:bg-gray-750 p-4 rounded-3xl border border-orange-100 dark:border-gray-700 space-y-3">
                <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-black text-xs">
                  <Calculator className="h-4 w-4" />
                  <span>تنظیم هوشمند قیمت و درصد تخفیف</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1">قیمت اصلی قبل تخفیف</label>
                    <input
                      type="text"
                      value={formData.originalPrice}
                      onChange={(e) => handleOriginalPriceChange(e.target.value)}
                      placeholder="600000"
                      className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white font-mono text-left dir-ltr focus:outline-none focus:border-orange-500"
                    />
                    {formData.originalPrice ? (
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {toPersianDigits(parseInt(formData.originalPrice || '0').toLocaleString('fa-IR'))} تومان
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1">درصد تخفیف (٪)</label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={formData.discount}
                      onChange={(e) => handleDiscountChange(e.target.value)}
                      placeholder="10"
                      className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 text-xs text-rose-600 dark:text-rose-400 font-bold font-mono text-left dir-ltr focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 mb-1">
                      قیمت نهایی فروش (تومان) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="540000"
                      className="w-full bg-white dark:bg-gray-700 border-2 border-orange-500 rounded-xl p-2.5 text-xs font-black text-orange-600 dark:text-orange-400 font-mono text-left dir-ltr focus:outline-none"
                    />
                    {formData.price ? (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">
                        فروش: {toPersianDigits(parseInt(formData.price || '0').toLocaleString('fa-IR'))} تومان
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Stock & Warranty */}
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
                  <span>تصویر و وکتور کالا (هاست‌شده و بدون باگ)</span>
                  <span className="text-[11px] text-gray-400 font-normal">کلیک روی هر گزینه برای انتخاب سریع</span>
                </label>

                {/* Selected Preview Box */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-200 dark:border-gray-600 mb-3">
                  <img 
                    src={formData.image} 
                    alt="Preview" 
                    className="w-14 h-14 rounded-xl border border-gray-200 dark:border-gray-600 object-contain p-1 bg-white dark:bg-gray-900 shadow-sm shrink-0" 
                  />
                  <div className="overflow-hidden grow">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">آدرس فایل تصویر:</span>
                    <span className="font-mono text-xs text-orange-600 dark:text-orange-400 font-bold truncate block dir-ltr text-left">
                      {formData.image}
                    </span>
                  </div>
                </div>

                {/* Visual Grid Selector */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 pr-2">
                  {PRESET_GALLERY.map((item) => {
                    const isSelected = formData.image === item.url;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setFormData({ ...formData, image: item.url })}
                        className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all border ${
                          isSelected 
                            ? 'bg-orange-500 text-white border-orange-600 shadow-xs' 
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-orange-300'
                        }`}
                      >
                        <img src={item.url} alt={item.label} className="w-7 h-7 rounded-lg object-contain bg-white dark:bg-gray-900 p-0.5 shrink-0" />
                        <span className="text-[10px] font-bold truncate leading-tight">{item.label}</span>
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
            <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/90 dark:bg-gray-850/90 backdrop-blur-md shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {editingProduct ? 'در حال ویرایش محصول موجود' : 'محصول جدید با SKU خودکار ثبت می‌شود'}
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-100 transition-colors cursor-pointer text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  form="product-form"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black shadow-md shadow-orange-500/25 transition-all cursor-pointer text-xs hover:scale-105 active:scale-95"
                >
                  {editingProduct ? 'ذخیره تغییرات کالا' : 'ثبت و انتشار محصول'}
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
