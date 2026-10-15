import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, Calculator, ImagePlus, Loader2, Package, Plus, ShieldCheck, Star, Trash2, X,
} from 'lucide-react';
import { authFetch } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { Product } from '../../types';
import { toPersianDigits } from '../../lib/utils';
import { PRODUCT_CATEGORY_OPTIONS } from '../../lib/productForm';
import {
  MAX_GALLERY, MAX_FEATURES, MAX_FEATURE_LENGTH, MAX_BRAND_LENGTH, MAX_TITLE_LENGTH, MAX_BARCODE_LENGTH,
  PRESET_PHOTOS, WARRANTY_SUGGESTIONS,
  ProductFormErrors, ProductFormField, ProductFormValues,
  addFeature, buildProductPayload, computeDiscountPercent, digitsOnly, emptyProductForm, fieldFromIssuePath,
  formatAmount, isBelowMarginFloor, isPresetPhoto, isRealPhoto, marginPercent, presetForCategory,
  priceFromPercent, snapshotOf, toInt, valuesFromProduct, validateProductForm,
} from '../../lib/productForm';

// Phone photos are often 5-12MB (or HEIC). Re-encode anything large to a
// 1800px JPEG in the browser so the upload never trips the server size limit.
async function shrinkPhoto(file: File): Promise<Blob> {
  if (file.size <= 1.5 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.88));
    return blob ?? file;
  } catch {
    return file;
  }
}

async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', await shrinkPhoto(file), file.name.replace(/\.[^.]+$/, '') + '.jpg');
  const res = await authFetch('/api/admin/upload/product-image', { method: 'POST', headers: {}, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.message || 'آپلود عکس ناموفق بود');
  return data.url as string;
}

const errorText = (err: unknown) => (err instanceof Error && err.message ? err.message : 'خطا در آپلود عکس');
const shortName = (name: string) => (name.length > 24 ? `${name.slice(0, 22)}…` : name);

const INPUT_BASE =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-base sm:text-sm font-bold text-gray-800 placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:bg-gray-100 disabled:text-gray-400 dark:bg-gray-900/40 dark:text-gray-100 dark:disabled:bg-gray-800';
const inputClass = (invalid: boolean) =>
  `${INPUT_BASE} ${invalid ? 'border-rose-400 dark:border-rose-500' : 'border-gray-200 dark:border-gray-600'}`;

const CHIP =
  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition-colors';

function Field({
  id, label, required, error, hint, children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-200">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-sm font-black text-gray-900 dark:text-white">{title}</legend>
      {children}
    </fieldset>
  );
}

export interface ProductFormModalProps {
  /** null = create a new product. */
  product: Product | null;
  brandSuggestions: string[];
  onClose: () => void;
  /** Called after each successful save so the list can refresh. */
  onSaved: () => void;
}

export default function ProductFormModal({ product, brandSuggestions, onClose, onSaved }: ProductFormModalProps) {
  const { addToast } = useToast();
  const editing = product !== null;

  const [initial] = useState<ProductFormValues>(() => (product ? valuesFromProduct(product) : emptyProductForm()));
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [baseline, setBaseline] = useState(() => snapshotOf(initial));
  const dirty = snapshotOf(values) !== baseline;

  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadFailures, setUploadFailures] = useState<string[]>([]);
  const [featureDraft, setFeatureDraft] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Lock page scroll while open; Escape asks before discarding edits.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = 'unset';
    };
    // requestClose reads `dirty`; re-binding on every change keeps it current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const requestClose = () => {
    if (dirty && !window.confirm('تغییرات ذخیره‌نشده از بین می‌رود. ادامه می‌دهید؟')) return;
    onClose();
  };

  const clearErrors = (...keys: ProductFormField[]) =>
    setErrors((prev) => {
      if (!keys.some((k) => prev[k])) return prev;
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });

  const set = <K extends ProductFormField>(key: K, value: ProductFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    clearErrors(key);
  };

  // ---- price block: sale price, original price, and percent stay in step ----
  const onPriceInput = (raw: string) => {
    const price = toInt(raw);
    setValues((prev) => ({
      ...prev,
      price: price === null ? '' : String(price),
      discount: String(computeDiscountPercent(toInt(prev.originalPrice), price)),
    }));
    clearErrors('price', 'originalPrice');
  };

  const onOriginalInput = (raw: string) => {
    const original = toInt(raw);
    setValues((prev) => ({
      ...prev,
      originalPrice: original === null ? '' : String(original),
      discount: String(computeDiscountPercent(original, toInt(prev.price))),
    }));
    clearErrors('originalPrice', 'price');
  };

  const onPercentInput = (raw: string) => {
    const percent = Math.min(99, toInt(raw) ?? 0);
    setValues((prev) => {
      const next = priceFromPercent(toInt(prev.originalPrice), percent);
      return { ...prev, discount: String(percent), price: next === null ? prev.price : String(next) };
    });
    clearErrors('price');
  };

  const price = toInt(values.price);
  const original = toInt(values.originalPrice);
  const cost = toInt(values.costPrice);
  const margin = marginPercent(price, cost);
  const belowFloor = isBelowMarginFloor(margin);

  // ---- photos ----
  const replaceCover = (url: string) => {
    setValues((prev) => {
      if (prev.image === url) return prev;
      // A real cover that is replaced moves into the gallery instead of disappearing.
      const keepOld = isRealPhoto(prev.image) && !prev.images.includes(prev.image);
      const rest = prev.images.filter((u) => u !== url);
      const images = (keepOld ? [prev.image, ...rest] : rest).slice(0, MAX_GALLERY);
      return { ...prev, image: url, images };
    });
    clearErrors('image');
  };

  const onCoverFile = async (file: File) => {
    setUploadFailures([]);
    setUploading('در حال آپلود عکس اصلی…');
    try {
      replaceCover(await uploadPhoto(file));
      addToast('عکس اصلی به‌روزرسانی شد', 'success');
    } catch (err) {
      setUploadFailures([`${shortName(file.name)}: ${errorText(err)}`]);
    } finally {
      setUploading(null);
    }
  };

  const onGalleryFiles = async (files: File[]) => {
    const room = MAX_GALLERY - values.images.length;
    const failures: string[] = [];
    if (room <= 0) {
      setUploadFailures([`حداکثر ${toPersianDigits(MAX_GALLERY)} عکس اضافی مجاز است`]);
      return;
    }
    const batch = files.slice(0, room);
    if (files.length > batch.length) {
      failures.push(`${toPersianDigits(files.length - batch.length)} عکس به دلیل سقف ${toPersianDigits(MAX_GALLERY)} عکس اضافه نشد`);
    }
    const added: string[] = [];
    for (let i = 0; i < batch.length; i++) {
      setUploading(`در حال آپلود ${toPersianDigits(i + 1)} از ${toPersianDigits(batch.length)}…`);
      setUploadFailures([...failures]);
      try {
        added.push(await uploadPhoto(batch[i]));
      } catch (err) {
        // One bad file no longer throws away the good ones in the same batch.
        failures.push(`${shortName(batch[i].name)}: ${errorText(err)}`);
      }
    }
    if (added.length) {
      setValues((prev) => ({ ...prev, images: [...prev.images, ...added].slice(0, MAX_GALLERY) }));
      addToast(`${toPersianDigits(added.length)} عکس اضافه شد`, 'success');
    }
    setUploadFailures(failures);
    setUploading(null);
  };

  const onPickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void onCoverFile(file);
  };

  const onPickGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) void onGalleryFiles(files);
  };

  const removeGallery = (url: string) =>
    setValues((prev) => ({ ...prev, images: prev.images.filter((u) => u !== url) }));

  // Changing category swaps only a stand-in picture; a real uploaded photo stays.
  const onCategoryChange = (category: string) => {
    setValues((prev) => {
      const suggested = presetForCategory(category);
      const image = prev.image && !isPresetPhoto(prev.image) ? prev.image : suggested ?? prev.image;
      return { ...prev, category, image };
    });
    clearErrors('category', 'image');
  };

  // ---- spec lines ----
  const commitFeatures = (raw: string) => {
    setValues((prev) => {
      let list = prev.features;
      for (const line of raw.split('\n')) list = addFeature(list, line);
      return { ...prev, features: list };
    });
    setFeatureDraft('');
    clearErrors('features');
  };

  // ---- save ----
  const focusField = (key: ProductFormField) => {
    const id = key === 'image' || key === 'images' ? 'pf-photos' : `pf-${key}`;
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  };

  const submit = async (addAnother: boolean) => {
    const found = validateProductForm(values, product?.category);
    setErrors(found);
    const keys = Object.keys(found) as ProductFormField[];
    if (keys.length) {
      focusField(keys[0]);
      addToast(`${toPersianDigits(keys.length)} مورد نیاز به اصلاح دارد`, 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch(product ? `/api/admin/products/${product.id}` : '/api/admin/products', {
        method: product ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildProductPayload(values)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const mapped: ProductFormErrors = {};
        for (const issue of Array.isArray(data.details) ? data.details : []) {
          const field = fieldFromIssuePath(issue.path);
          if (field && !mapped[field]) mapped[field] = issue.message;
        }
        const message = typeof data.message === 'string' && data.message ? data.message : 'خطا در ثبت محصول';
        setErrors(Object.keys(mapped).length ? mapped : { form: message });
        const first = Object.keys(mapped)[0] as ProductFormField | undefined;
        if (first) focusField(first);
        addToast(message, 'error');
        return;
      }

      addToast(editing ? 'محصول با موفقیت بروزرسانی شد' : 'محصول با موفقیت ایجاد شد', 'success');
      onSaved();
      if (addAnother && !editing) {
        // Keep what repeats across products (category, brand, warranty, visibility); clear the rest.
        const carried: ProductFormValues = {
          ...emptyProductForm(),
          category: values.category,
          brand: values.brand,
          warranty: values.warranty,
          isActive: values.isActive,
        };
        setValues(carried);
        setBaseline(snapshotOf(carried));
        setErrors({});
        setUploadFailures([]);
        setFeatureDraft('');
        requestAnimationFrame(() => titleRef.current?.focus());
      } else {
        onClose();
      }
    } catch {
      setErrors({ form: 'خطا در ارتباط با سرور' });
      addToast('خطا در ارتباط با سرور', 'error');
    } finally {
      setSaving(false);
    }
  };

  const galleryFull = values.images.length >= MAX_GALLERY;
  const photosOk = !!values.image;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pf-heading"
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white text-right dark:bg-gray-800 sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl dark:sm:border-gray-700"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-primary-100 p-2 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="pf-heading" className="truncate text-base font-black text-gray-900 dark:text-white sm:text-lg">
                {product ? `ویرایش کالا: ${product.title}` : 'افزودن کالای جدید'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {dirty ? 'تغییرات ذخیره‌نشده دارید' : editing ? 'هیچ تغییری ثبت نشده' : 'فیلدهای ستاره‌دار الزامی‌اند'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="بستن فرم"
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errors.form && (
          <div role="alert" className="flex shrink-0 items-center gap-2 border-b border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {errors.form}
          </div>
        )}

        <form
          id="product-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit(false);
          }}
          className="flex-1 overflow-y-auto"
        >
          <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* Photos */}
            <section className="space-y-5 border-b border-gray-200 bg-gray-50/70 p-5 dark:border-gray-700 dark:bg-gray-900/30 lg:border-b-0 lg:border-l">
              <fieldset id="pf-photos" tabIndex={-1} className="space-y-4 outline-none">
                <legend className="mb-1 flex w-full items-center justify-between text-sm font-black text-gray-900 dark:text-white">
                  عکس کالا <span className="text-xs font-bold text-rose-500">*</span>
                </legend>

                <div className="mx-auto aspect-square w-full max-w-[200px] overflow-hidden sm:max-w-[240px] rounded-2xl border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900">
                  {values.image ? (
                    <img src={values.image} alt="عکس اصلی کالا" className="h-full w-full object-contain p-4" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                      <ImagePlus className="h-8 w-8" />
                      <span className="text-xs font-bold">عکسی انتخاب نشده</span>
                    </div>
                  )}
                </div>

                {values.image && (
                  isRealPhoto(values.image) ? (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> عکس واقعی؛ در صفحه اصلی نمایش داده می‌شود
                    </p>
                  ) : (
                    <p className="flex items-start gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>تصویر آماده (وکتور) است و در صفحه اصلی دیده نمی‌شود. عکس واقعی آپلود کنید.</span>
                    </p>
                  )
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs font-bold text-sky-700 transition-colors hover:bg-sky-100 aria-disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
                    <ImagePlus className="h-4 w-4" /> عکس اصلی
                    <input type="file" accept="image/*" className="sr-only" disabled={!!uploading} onChange={onPickCover} aria-label="آپلود عکس اصلی" />
                  </label>
                  <label
                    aria-disabled={galleryFull || !!uploading}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                      galleryFull || uploading
                        ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-800'
                        : 'cursor-pointer border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                    }`}
                  >
                    <Plus className="h-4 w-4" /> عکس بیشتر
                    <input type="file" accept="image/*" multiple className="sr-only" disabled={galleryFull || !!uploading} onChange={onPickGallery} aria-label="آپلود عکس‌های بیشتر" />
                  </label>
                </div>

                {uploading && (
                  <p role="status" className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                    <Loader2 className="h-4 w-4 animate-spin" /> {uploading}
                  </p>
                )}
                {uploadFailures.length > 0 && (
                  <ul role="alert" className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                    {uploadFailures.map((msg) => <li key={msg}>{msg}</li>)}
                  </ul>
                )}

                {values.images.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold text-gray-600 dark:text-gray-300">
                      عکس‌های بیشتر ({toPersianDigits(values.images.length)} از {toPersianDigits(MAX_GALLERY)})
                    </p>
                    <ul className="grid grid-cols-4 gap-2">
                      {values.images.map((url, idx) => (
                        <li key={url} className="group relative">
                          <img src={url} alt={`عکس ${toPersianDigits(idx + 2)}`} className="aspect-square w-full rounded-lg border border-gray-200 bg-white object-contain p-1 dark:border-gray-600" />
                          <div className="mt-1 flex justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => replaceCover(url)}
                              aria-label={`تبدیل عکس ${toPersianDigits(idx + 2)} به عکس اصلی`}
                              title="تبدیل به عکس اصلی"
                              className="rounded-md p-1 text-gray-500 hover:bg-gray-200 hover:text-amber-600 dark:hover:bg-gray-700"
                            >
                              <Star className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeGallery(url)}
                              aria-label={`حذف عکس ${toPersianDigits(idx + 2)}`}
                              title="حذف"
                              className="rounded-md p-1 text-gray-500 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {errors.image && (
                  <p role="alert" className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{errors.image}</p>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => setShowPresets((v) => !v)}
                    aria-expanded={showPresets}
                    className="text-xs font-bold text-gray-600 underline-offset-4 hover:underline dark:text-gray-300"
                  >
                    {showPresets ? 'بستن تصاویر آماده' : 'انتخاب از تصاویر آماده (وکتور)'}
                  </button>
                  {showPresets && (
                    <div className="mt-2 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1">
                      {[...PRESET_PHOTOS]
                        .sort((a, b) => Number(b.category === values.category) - Number(a.category === values.category))
                        .map((item) => {
                          const selected = values.image === item.url;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              aria-pressed={selected}
                              title={item.label}
                              onClick={() => replaceCover(item.url)}
                              className={`rounded-lg border p-1.5 transition-colors ${
                                selected
                                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                                  : 'border-gray-200 bg-white hover:border-gray-400 dark:border-gray-600 dark:bg-gray-900'
                              }`}
                            >
                              <img src={item.url} alt={item.label} width="56" height="56" loading="lazy" className="mx-auto h-14 w-14 object-contain" />
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              </fieldset>
            </section>

            {/* Details */}
            <div className="space-y-7 p-5 sm:p-6">
              <Section title="اطلاعات کالا">
                <Field id="pf-title" label="عنوان کالا" required error={errors.title} hint={`${toPersianDigits(values.title.length)}/${toPersianDigits(MAX_TITLE_LENGTH)}`}>
                  <input
                    ref={titleRef}
                    id="pf-title"
                    type="text"
                    value={values.title}
                    maxLength={MAX_TITLE_LENGTH}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder="مثال: هندزفری بی‌سیم سامسونگ Galaxy Buds2 Pro"
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? 'pf-title-error' : undefined}
                    className={inputClass(!!errors.title)}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="pf-category" label="دسته‌بندی" required error={errors.category}>
                    <select
                      id="pf-category"
                      value={values.category}
                      onChange={(e) => onCategoryChange(e.target.value)}
                      aria-invalid={!!errors.category}
                      className={`${inputClass(!!errors.category)} cursor-pointer`}
                    >
                      <option value="">انتخاب کنید…</option>
                      {PRODUCT_CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      {values.category && !PRODUCT_CATEGORY_OPTIONS.includes(values.category) && (
                        <option value={values.category}>{values.category} (خارج از فهرست مصوب)</option>
                      )}
                    </select>
                  </Field>

                  <Field id="pf-brand" label="برند" required error={errors.brand} hint={editing ? undefined : 'از فهرست برندهای قبلی انتخاب کنید یا تایپ کنید'}>
                    <input
                      id="pf-brand"
                      type="text"
                      list="pf-brand-options"
                      value={values.brand}
                      maxLength={MAX_BRAND_LENGTH}
                      onChange={(e) => set('brand', e.target.value)}
                      placeholder="مثال: Anker"
                      aria-invalid={!!errors.brand}
                      className={inputClass(!!errors.brand)}
                    />
                    <datalist id="pf-brand-options">
                      {brandSuggestions.map((b) => <option key={b} value={b} />)}
                    </datalist>
                  </Field>
                </div>
              </Section>

              <Section title="قیمت">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field id="pf-price" label="قیمت فروش (تومان)" required error={errors.price}>
                    <input
                      id="pf-price"
                      type="text"
                      inputMode="numeric"
                      value={formatAmount(price)}
                      onChange={(e) => onPriceInput(e.target.value)}
                      placeholder="۹۸۰,۰۰۰"
                      aria-invalid={!!errors.price}
                      className={`${inputClass(!!errors.price)} font-mono`}
                    />
                  </Field>
                  <Field id="pf-original" label="قیمت قبل از تخفیف" error={errors.originalPrice} hint="اختیاری">
                    <input
                      id="pf-original"
                      type="text"
                      inputMode="numeric"
                      value={formatAmount(original)}
                      onChange={(e) => onOriginalInput(e.target.value)}
                      placeholder="۱,۲۰۰,۰۰۰"
                      aria-invalid={!!errors.originalPrice}
                      className={`${inputClass(!!errors.originalPrice)} font-mono`}
                    />
                  </Field>
                  <Field id="pf-percent" label="درصد تخفیف" hint={original ? 'تغییر درصد، قیمت فروش را تنظیم می‌کند' : 'ابتدا قیمت قبل از تخفیف را وارد کنید'}>
                    <input
                      id="pf-percent"
                      type="text"
                      inputMode="numeric"
                      disabled={!original}
                      value={original ? values.discount : ''}
                      onChange={(e) => onPercentInput(digitsOnly(e.target.value))}
                      placeholder="۰"
                      className={`${inputClass(false)} font-mono text-rose-600 dark:text-rose-400`}
                    />
                  </Field>
                </div>
                {price && cost && (
                  <p className={`flex items-center gap-1.5 text-xs font-bold ${belowFloor ? 'text-amber-700 dark:text-amber-300' : 'text-gray-600 dark:text-gray-300'}`}>
                    <Calculator className="h-3.5 w-3.5" />
                    سود تخمینی: {toPersianDigits(margin ?? 0)}٪
                    {belowFloor && ' — کمتر از حداقل مجاز است'}
                  </p>
                )}
              </Section>

              <Section title="موجودی و گارانتی">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="pf-stock" label="موجودی (تعداد)" required error={errors.stockQuantity} hint="۰ یعنی ناموجود">
                    <input
                      id="pf-stock"
                      type="text"
                      inputMode="numeric"
                      value={values.stockQuantity}
                      onChange={(e) => set('stockQuantity', digitsOnly(e.target.value))}
                      aria-invalid={!!errors.stockQuantity}
                      className={`${inputClass(!!errors.stockQuantity)} font-mono`}
                    />
                  </Field>
                  <Field id="pf-warranty" label="گارانتی">
                    <input
                      id="pf-warranty"
                      type="text"
                      value={values.warranty}
                      onChange={(e) => set('warranty', e.target.value)}
                      placeholder="مثال: ۱۸ ماهه ایستا"
                      className={inputClass(false)}
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  {WARRANTY_SUGGESTIONS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => set('warranty', w)}
                      aria-pressed={values.warranty === w}
                      className={`${CHIP} ${values.warranty === w ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300' : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300'}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="مشخصات و توضیحات">
                <Field
                  id="pf-feature"
                  label="مشخصات فنی"
                  hint={`هر مورد را جدا وارد کنید (Enter). حداکثر ${toPersianDigits(MAX_FEATURES)} مورد. با چسباندن چند خط هم می‌شود.`}
                >
                  <div className="flex gap-2">
                    <input
                      id="pf-feature"
                      type="text"
                      value={featureDraft}
                      maxLength={MAX_FEATURE_LENGTH}
                      onChange={(e) => setFeatureDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitFeatures(featureDraft);
                        }
                      }}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('text');
                        if (text.includes('\n')) {
                          e.preventDefault();
                          commitFeatures([featureDraft, ...text.split('\n')].join('\n'));
                        }
                      }}
                      placeholder="مثال: جنس سیلیکون مات"
                      className={`${inputClass(false)} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => commitFeatures(featureDraft)}
                      disabled={!featureDraft.trim() || values.features.length >= MAX_FEATURES}
                      className="shrink-0 rounded-xl bg-gray-900 px-3 text-xs font-bold text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
                    >
                      افزودن
                    </button>
                  </div>
                </Field>
                {values.features.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {values.features.map((f, i) => (
                      <li key={`${f}-${i}`} className="inline-flex max-w-full items-center gap-1 rounded-full bg-gray-100 py-1 pl-1 pr-3 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                        <span className="truncate">{f}</span>
                        <button
                          type="button"
                          aria-label={`حذف ${f}`}
                          onClick={() => setValues((prev) => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }))}
                          className="rounded-full p-0.5 text-gray-500 hover:bg-gray-200 hover:text-rose-600 dark:hover:bg-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Field id="pf-description" label="توضیحات تکمیلی">
                  <textarea
                    id="pf-description"
                    rows={3}
                    value={values.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="اگر توضیح اضافه‌ای لازم است، اینجا بنویسید"
                    className={`${inputClass(false)} leading-relaxed`}
                  />
                </Field>
              </Section>

              <details open={editing ? !!cost || !!values.barcode || !values.isActive : false} className="group rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                <summary className="cursor-pointer text-sm font-black text-gray-900 dark:text-white">
                  تنظیمات پیشرفته
                  <span className="mr-2 text-xs font-bold text-gray-500">قیمت خرید، بارکد، نمایش در فروشگاه</span>
                </summary>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="pf-cost" label="قیمت خرید (تومان)" hint="فقط برای مدیریت؛ به مشتری نمایش داده نمی‌شود">
                      <input
                        id="pf-cost"
                        type="text"
                        inputMode="numeric"
                        value={formatAmount(cost)}
                        onChange={(e) => set('costPrice', digitsOnly(e.target.value))}
                        placeholder="۶۵۰,۰۰۰"
                        className={`${inputClass(false)} font-mono`}
                      />
                    </Field>
                    <Field id="pf-barcode" label="بارکد" error={errors.barcode}>
                      <input
                        id="pf-barcode"
                        type="text"
                        inputMode="numeric"
                        maxLength={MAX_BARCODE_LENGTH}
                        value={values.barcode}
                        onChange={(e) => set('barcode', digitsOnly(e.target.value))}
                        aria-invalid={!!errors.barcode}
                        className={`${inputClass(!!errors.barcode)} font-mono`}
                        dir="ltr"
                      />
                    </Field>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-bold text-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={values.isActive}
                      onChange={(e) => set('isActive', e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500/30 dark:border-gray-600"
                    />
                    نمایش در فروشگاه
                  </label>
                </div>
              </details>
            </div>
          </div>
        </form>

        {/* Footer: phone = primary button on its own row, secondary actions beneath */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 sm:justify-end sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={requestClose}
            className="order-1 flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 sm:order-none sm:flex-none sm:px-5"
          >
            انصراف
          </button>
          {!editing && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit(true)}
              className="order-2 flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700 sm:order-none sm:flex-none sm:px-5"
            >
              ثبت و افزودن کالای بعدی
            </button>
          )}
          <button
            type="submit"
            form="product-form"
            disabled={saving}
            className="order-first flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-cta)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-cta-hover)] disabled:opacity-60 sm:order-none sm:w-auto"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? 'ذخیره تغییرات' : 'ثبت و انتشار کالا'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
