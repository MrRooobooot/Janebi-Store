import { describe, expect, it } from 'vitest';
import {
  MAX_FEATURES, MAX_FEATURE_LENGTH, MAX_GALLERY, MIN_MARGIN_PCT,
  addFeature, buildProductPayload, computeDiscountPercent, emptyProductForm, fieldFromIssuePath,
  formatAmount, isBelowMarginFloor, isPresetPhoto, isRealPhoto, marginPercent, presetForCategory,
  priceFromPercent, valuesFromProduct, validateProductForm, toInt,
  type ProductFormValues,
} from '../../src/lib/productForm';
import type { Product } from '../../src/types';

const filled = (overrides: Partial<ProductFormValues> = {}): ProductFormValues => ({
  ...emptyProductForm(),
  title: 'هندزفری تست',
  category: 'هندزفری و ایرباد',
  brand: 'Anker',
  image: '/images/products/p-test.webp',
  price: '980000',
  stockQuantity: '5',
  ...overrides,
});

describe('money math', () => {
  it('computes the percent off, rounded, and 0 without an original price', () => {
    expect(computeDiscountPercent(1200000, 980000)).toBe(18);
    expect(computeDiscountPercent(null, 980000)).toBe(0);
    expect(computeDiscountPercent(900000, 980000)).toBe(0);
  });

  it('turns a typed percent into a sale price only when there is an original price', () => {
    expect(priceFromPercent(1000000, 20)).toBe(800000);
    expect(priceFromPercent(null, 20)).toBeNull();
  });

  it('computes gross margin and flags it below the floor', () => {
    expect(marginPercent(1000000, 650000)).toBe(35);
    expect(marginPercent(1000000, null)).toBeNull();
    expect(marginPercent(1000000, 0)).toBeNull();
    expect(isBelowMarginFloor(MIN_MARGIN_PCT - 1)).toBe(true);
    expect(isBelowMarginFloor(MIN_MARGIN_PCT)).toBe(false);
    expect(isBelowMarginFloor(null)).toBe(false);
  });

  it('reads Persian digits and strips separators', () => {
    expect(toInt('۹۸۰,۰۰۰')).toBe(980000);
    expect(toInt('')).toBeNull();
  });

  it('formats an amount with grouped digits and no currency suffix', () => {
    expect(formatAmount(980000)).toBe('۹۸۰,۰۰۰');
    expect(formatAmount(null)).toBe('');
  });
});

describe('validateProductForm', () => {
  it('accepts a complete new product', () => {
    expect(validateProductForm(filled())).toEqual({});
  });

  it('asks for every required field on an empty form', () => {
    const errors = validateProductForm(emptyProductForm());
    expect(Object.keys(errors).sort()).toEqual(['brand', 'category', 'image', 'price', 'stockQuantity', 'title'].sort());
  });

  it('treats stock 0 as a valid answer, not as missing', () => {
    expect(validateProductForm(filled({ stockQuantity: '0' })).stockQuantity).toBeUndefined();
  });

  it('rejects a category outside the approved list for a new product', () => {
    expect(validateProductForm(filled({ category: 'کالای دلخواه' })).category).toBeDefined();
  });

  it('keeps a legacy category on an existing product', () => {
    expect(validateProductForm(filled({ category: 'کالای قدیمی' }), 'کالای قدیمی').category).toBeUndefined();
  });

  it('rejects an original price below the sale price', () => {
    expect(validateProductForm(filled({ originalPrice: '500000' })).originalPrice).toBeDefined();
    expect(validateProductForm(filled({ originalPrice: '1200000' })).originalPrice).toBeUndefined();
  });

  it('rejects a barcode longer than the server limit', () => {
    expect(validateProductForm(filled({ barcode: '1'.repeat(25) })).barcode).toBeDefined();
  });
});

describe('buildProductPayload', () => {
  it('builds the body the admin API expects, with trimmed text and derived discount', () => {
    const payload = buildProductPayload(filled({
      title: '  هندزفری تست  ',
      brand: ' Anker ',
      originalPrice: '1200000',
      costPrice: '650000',
      barcode: ' 6264012345678 ',
      isActive: false,
      features: ['  جنس سیلیکون  ', '', 'شارژ سریع'],
    }));
    expect(payload).toMatchObject({
      title: 'هندزفری تست',
      brand: 'Anker',
      price: 980000,
      originalPrice: 1200000,
      discount: 18,
      costPrice: 650000,
      barcode: '6264012345678',
      isActive: 0,
      features: ['جنس سیلیکون', 'شارژ سریع'],
    });
  });

  it('falls back to the sale price as the original and sends no cost when empty', () => {
    const payload = buildProductPayload(filled());
    expect(payload.originalPrice).toBe(980000);
    expect(payload.discount).toBe(0);
    expect(payload.costPrice).toBeNull();
    expect(payload.barcode).toBeNull();
  });

  it('sends stock 0 as 0', () => {
    expect(buildProductPayload(filled({ stockQuantity: '0' })).stockQuantity).toBe(0);
  });

  it('never sends the cover photo again in the gallery and caps the gallery', () => {
    const many = Array.from({ length: MAX_GALLERY + 3 }, (_, i) => `/images/products/g${i}.webp`);
    const payload = buildProductPayload(filled({ images: [filled().image, ...many] }));
    expect(payload.images).not.toContain('/images/products/p-test.webp');
    expect(payload.images.length).toBe(MAX_GALLERY);
  });
});

describe('valuesFromProduct', () => {
  const product: Product = {
    id: 7,
    title: 'کابل تست',
    category: 'کابل و سیم',
    price: 500000,
    originalPrice: 500000,
    discount: 0,
    image: '/images/products/c.webp',
    images: ['/images/products/c.webp', '/images/products/c2.webp'],
    brand: 'MCdodo',
    warranty: '',
    features: ['طول ۱ متر'],
    stockQuantity: 0,
    costPrice: 300000,
    barcode: null,
    isActive: 0,
  };

  it('keeps stock 0 instead of turning it into another number', () => {
    expect(valuesFromProduct(product).stockQuantity).toBe('0');
  });

  it('shows no original price when it only repeats the sale price', () => {
    expect(valuesFromProduct(product).originalPrice).toBe('');
  });

  it('does not invent a warranty when the product has none', () => {
    expect(valuesFromProduct(product).warranty).toBe('');
  });

  it('keeps hidden products hidden and drops the cover from the gallery', () => {
    const values = valuesFromProduct(product);
    expect(values.isActive).toBe(false);
    expect(values.images).toEqual(['/images/products/c2.webp']);
    expect(values.costPrice).toBe('300000');
  });
});

describe('spec lines and photos', () => {
  it('adds a spec line, ignoring blanks, duplicates and overflow', () => {
    let list: string[] = [];
    list = addFeature(list, '   ');
    list = addFeature(list, 'جنس سیلیکون');
    list = addFeature(list, 'جنس سیلیکون');
    expect(list).toEqual(['جنس سیلیکون']);
    for (let i = 0; i < MAX_FEATURES + 5; i++) list = addFeature(list, `ویژگی ${i}`);
    expect(list.length).toBe(MAX_FEATURES);
    expect(addFeature([], 'x'.repeat(MAX_FEATURE_LENGTH + 30))[0].length).toBe(MAX_FEATURE_LENGTH);
  });

  it('knows real photos from vector stand-ins', () => {
    expect(isRealPhoto('/images/products/p.webp')).toBe(true);
    expect(isRealPhoto('/images/products/p.JPG?v=2')).toBe(true);
    expect(isRealPhoto('/products/cbl-1.svg')).toBe(false);
    expect(isRealPhoto('')).toBe(false);
  });

  it('recognises preset stand-ins and gives a category its default one', () => {
    expect(isPresetPhoto('/products/cbl-1.svg')).toBe(true);
    expect(isPresetPhoto('/images/products/p.webp')).toBe(false);
    expect(presetForCategory('کابل و سیم')).toBe('/products/cbl-1.svg');
    expect(presetForCategory('دسته ناشناخته')).toBeNull();
  });

  it('maps a server issue path to the form field it belongs to', () => {
    expect(fieldFromIssuePath(['body', 'brand'])).toBe('brand');
    expect(fieldFromIssuePath(['body', 'images', 0])).toBe('images');
    expect(fieldFromIssuePath(['body', 'nope'])).toBeNull();
    expect(fieldFromIssuePath(undefined)).toBeNull();
  });
});
