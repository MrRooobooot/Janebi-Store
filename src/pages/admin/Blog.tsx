import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, Pencil, Trash2, X, Eye, EyeOff, Loader2, Search } from 'lucide-react';
import { authFetch } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  image: string | null;
  category: string;
  author: string;
  readTime: string | null;
  tags: string | null;
  published: boolean;
  createdAt: string;
}

const EMPTY_FORM = {
  id: '', title: '', excerpt: '', body: '',
  image: '', category: 'مقالات', author: 'تیم جانبی آرنا', readTime: '', tags: '', published: true,
};

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();
  const token = localStorage.getItem('token');

  const fetchPosts = async () => {
    try {
      const res = await authFetch('/api/blog/admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      } else {
        addToast('خطا در دریافت مقاله‌ها', 'error');
      }
    } catch {
      addToast('خطا در دریافت مقاله‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (post: BlogPost) => {
    setForm({
      id: post.id, title: post.title, excerpt: post.excerpt, body: post.body,
      image: post.image || '', category: post.category, author: post.author,
      readTime: post.readTime || '', tags: post.tags || '', published: post.published,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.body.trim()) {
      addToast('عنوان، خلاصه و متن مقاله الزامی است', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title, excerpt: form.excerpt, body: form.body,
      image: form.image || null, category: form.category, author: form.author,
      readTime: form.readTime || null, tags: form.tags || null, published: form.published,
    };
    try {
      const res = await authFetch(form.id ? `/api/blog/admin/${form.id}` : '/api/blog/admin', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        addToast(form.id ? 'مقاله بروزرسانی شد' : 'مقاله منتشر شد', 'success');
        setShowForm(false);
        fetchPosts();
      } else {
        const data = await res.json().catch(() => ({}));
        addToast(data.message || 'خطا در ذخیره مقاله', 'error');
      }
    } catch {
      addToast('خطا در ذخیره مقاله', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (post: BlogPost) => {
    const res = await authFetch(`/api/blog/admin/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ published: !post.published }),
    });
    if (res.ok) {
      addToast(post.published ? 'مقاله پیش‌نویس شد' : 'مقاله منتشر شد', 'success');
      fetchPosts();
    } else {
      addToast('خطا در تغییر وضعیت انتشار', 'error');
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!window.confirm(`حذف «${post.title}» قابل بازگشت نیست. مطمئنید؟`)) return;
    const res = await authFetch(`/api/blog/admin/${post.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      addToast('مقاله حذف شد', 'success');
      setPosts(prev => prev.filter(p => p.id !== post.id));
    } else {
      addToast('خطا در حذف مقاله', 'error');
    }
  };

  const filtered = posts.filter(p =>
    !search || p.title.includes(search) || p.category.includes(search)
  );

  return (
    <div className="space-y-6 text-right">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-orange-600" /> مدیریت مجله (بلاگ)
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {posts.length} مقاله — انتشار، ویرایش و حذف مقالات مجله جانبی آرنا
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs"
        >
          <Plus className="h-4 w-4" /> مقاله جدید
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی عنوان یا دسته..."
          className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 pr-10 pl-3 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-orange-500"
        />
      </div>

      <div className="bg-[var(--color-surface-light)] dark:bg-gray-800 rounded-2xl border border-[var(--color-border-light)] dark:border-gray-700/60 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs">در حال بارگذاری مقاله‌ها...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">مقاله ای یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 border-b border-[var(--color-border-light)] dark:border-gray-700/60">
                <tr>
                  <th className="p-3.5 font-bold">عنوان</th>
                  <th className="p-3.5 font-bold">دسته</th>
                  <th className="p-3.5 font-bold">نویسنده</th>
                  <th className="p-3.5 font-bold">وضعیت</th>
                  <th className="p-3.5 font-bold">تاریخ</th>
                  <th className="p-3.5 font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                {filtered.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="p-3.5 max-w-[280px]">
                      <div className="font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)] truncate" title={post.title}>{post.title}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{post.excerpt}</div>
                    </td>
                    <td className="p-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">{post.category}</td>
                    <td className="p-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">{post.author}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${post.published
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                        {post.published ? 'منتشرشده' : 'پیش‌نویس'}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-500 dark:text-gray-400 text-[11px] whitespace-nowrap">
                      {new Date(post.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePublish(post)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-orange-600 transition-colors"
                          title={post.published ? 'پیش‌نویس کردن' : 'انتشار'}
                        >
                          {post.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => openEdit(post)}
                          className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-orange-600 transition-colors"
                          title="ویرایش"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(post)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-900 dark:text-gray-100">
                {form.id ? 'ویرایش مقاله' : 'مقاله جدید'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" aria-label="بستن">
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="عنوان مقاله *"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
            />
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="خلاصه مقاله (تا ۱۰۰۰ کاراکتر) *"
              rows={2}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
            />
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="متن کامل مقاله — پاراگراف‌ها را با خط خالی جدا کنید *"
              rows={10}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3 text-xs leading-6 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="آدرس تصویر (مثلاً /products/pb-7.svg)"
                dir="ltr"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-gray-100 text-left focus:outline-none focus:border-orange-500"
              />
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="دسته‌بندی"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
              />
              <input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="نویسنده"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
              />
              <input
                value={form.readTime}
                onChange={(e) => setForm({ ...form, readTime: e.target.value })}
                placeholder="زمان مطالعه (مثلاً ۵ دقیقه)"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
              />
            </div>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="تگ‌های SEO (با کاما جدا کنید)"
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
            />
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="accent-orange-600 w-4 h-4"
              />
              انتشار عمومی
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                انصراف
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {form.id ? 'ذخیره تغییرات' : 'انتشار مقاله'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
