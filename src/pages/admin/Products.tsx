import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { Product } from '../../types';
import { toEnglishDigits } from '../../lib/utils';

export default function AdminProducts() {
  const token = localStorage.getItem('token');
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '', category: '', price: '', originalPrice: '', discount: '', image: '', brand: '', warranty: '', description: '', stockQuantity: '10', sku: ''
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
        image: product.image,
        brand: product.brand,
        warranty: product.warranty || '',
        description: product.description || '',
        stockQuantity: (product.stockQuantity ?? 10).toString(),
        sku: product.sku || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({ title: '', category: '', price: '', originalPrice: '', discount: '0', image: '', brand: '', warranty: '', description: '', stockQuantity: '10', sku: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrice = toEnglishDigits(formData.price);
    const cleanOrigPrice = formData.originalPrice ? toEnglishDigits(formData.originalPrice) : '';
    const cleanDiscount = toEnglishDigits(formData.discount);
    const cleanStock = toEnglishDigits(formData.stockQuantity);

    const payload = {
      ...formData,
      price: parseInt(cleanPrice, 10) || 0,
      originalPrice: cleanOrigPrice ? parseInt(cleanOrigPrice, 10) : null,
      discount: parseInt(cleanDiscount, 10) || 0,
      stockQuantity: parseInt(cleanStock, 10) || 0
    };

    try {
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

      addToast(editingProduct ? 'محصول بروزرسانی شد' : 'محصول جدید اضافه شد', 'success');
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      addToast('خطا در ذخیره محصول', 'error');
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
      addToast('محصول حذف شد', 'success');
      fetchProducts();
    } catch (err) {
      addToast('خطا در حذف محصول', 'error');
    }
  };

  const [categoryFilter, setCategoryFilter] = useState('all');

  const handleQuickStockUpdate = async (productId: number, newStock: number) => {
    if (newStock < 0) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stockQuantity: newStock })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, stockQuantity: newStock } : p));
        addToast('موجودی انبار بروزرسانی شد', 'success');
      } else {
        addToast('خطا در تغییر موجودی', 'error');
      }
    } catch {
      addToast('خطا در ارتباط با سرور', 'error');
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  const filteredProducts = products.filter(p => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || 
      p.sku?.toLowerCase().includes(search.toLowerCase()) || 
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">مدیریت محصولات و انبار</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">افزودن، ویرایش، حذف و کنترل موجودی انبار محصولات</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-md shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" />
          افزودن محصول جدید
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <input 
              type="text" 
              placeholder="جستجو در محصولات (نام، برند، SKU)..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:border-orange-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:border-orange-500"
            >
              <option value="all">همه دسته‌بندی‌ها</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500 font-bold px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
              {filteredProducts.length} کالا
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="p-3.5 font-bold">تصویر</th>
                <th className="p-3.5 font-bold">نام و برند محصول</th>
                <th className="p-3.5 font-bold">دسته‌بندی</th>
                <th className="p-3.5 font-bold">قیمت</th>
                <th className="p-3.5 font-bold">موجودی انبار (تغییر سریع)</th>
                <th className="p-3.5 font-bold text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="text-center p-8 text-gray-400">در حال بارگذاری...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-8 text-gray-500 dark:text-gray-400 font-medium">محصولی یافت نشد — فیلترها را تغییر دهید یا محصول جدیدی اضافه کنید.</td></tr>
              ) : filteredProducts.map(p => {
                const qty = p.stockQuantity ?? 0;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-3.5">
                      <img src={p.image} alt={p.title} className="w-12 h-12 rounded-lg object-contain bg-white dark:bg-gray-900 p-1 border border-gray-100 dark:border-gray-800" />
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-gray-900 dark:text-white">{p.title}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">برند: {p.brand} | {p.sku ? `کد: ${p.sku}` : ''}</div>
                    </td>
                    <td className="p-3.5 text-gray-600 dark:text-gray-300">{p.category}</td>
                    <td className="p-3.5 font-bold text-gray-900 dark:text-white font-mono">{p.price.toLocaleString()} تومان</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleQuickStockUpdate(p.id, Math.max(0, qty - 1))}
                          className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center font-bold text-xs transition-colors"
                          title="کاهش موجودی"
                        >
                          -
                        </button>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                          qty > 5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                          qty > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                          'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {qty} عدد
                        </span>
                        <button
                          onClick={() => handleQuickStockUpdate(p.id, qty + 1)}
                          className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-emerald-100 hover:text-emerald-600 flex items-center justify-center font-bold text-xs transition-colors"
                          title="افزایش موجودی"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openModal(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="ویرایش کامل"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="حذف محصول"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام محصول *</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">دسته‌بندی *</label>
                  <input required type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">قیمت فروش (تومان) *</label>
                  <input required type="text" dir="ltr" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-left font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">قیمت اصلی بدون تخفیف (اختیاری)</label>
                  <input type="text" dir="ltr" value={formData.originalPrice} onChange={e => setFormData({...formData, originalPrice: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-left font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">برند *</label>
                  <input required type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تعداد موجودی انبار *</label>
                  <input required type="text" dir="ltr" value={formData.stockQuantity} onChange={e => setFormData({...formData, stockQuantity: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-bold text-left font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">کد کالا (SKU)</label>
                  <input type="text" dir="ltr" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-left font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">گارانتی</label>
                  <input type="text" placeholder="مثلاً: ۱۸ ماه گارانتی شرکتی" value={formData.warranty} onChange={e => setFormData({...formData, warranty: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">آدرس تصویر (URL) *</label>
                  <input required type="url" dir="ltr" value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-left font-mono" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">توضیحات محصول</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 resize-none" />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer">انصراف</button>
                <button type="submit" className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-md shadow-orange-500/20 cursor-pointer">
                  {editingProduct ? 'ذخیره تغییرات' : 'افزودن محصول'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
