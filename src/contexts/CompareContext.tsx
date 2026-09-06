import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from './ToastContext';
import { Product } from '../types';

interface CompareContextType {
  compareItems: Product[];
  toggleCompare: (product: Product) => void;
  isInCompare: (id: number) => boolean;
  clearCompare: () => void;
  /** Silent bulk replace (no toasts) — used by live-price sync on the Compare page. */
  replaceCompare: (products: Product[]) => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareItems, setCompareItems] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('compare');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Failed to access localStorage', e);
      return [];
    }
  });
  const { addToast } = useToast();

  const saveCompare = (items: Product[]) => {
    setCompareItems(items);
    try {
      localStorage.setItem('compare', JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save compare to localStorage', e);
    }
  };

  const toggleCompare = (product: Product) => {
    const exists = isInCompare(product.id);
    if (exists) {
      addToast('محصول از لیست مقایسه حذف شد', 'info');
      saveCompare(compareItems.filter((p) => p.id !== product.id));
    } else {
      if (compareItems.length >= 3) {
        addToast('حداکثر ۳ محصول را می‌توانید مقایسه کنید', 'error');
        return;
      }
      addToast('محصول به لیست مقایسه اضافه شد', 'success');
      saveCompare([...compareItems, product]);
    }
  };

  const isInCompare = (id: number) => compareItems.some((p) => p.id === id);

  const replaceCompare = (products: Product[]) => saveCompare(products);

  const clearCompare = () => {
    saveCompare([]);
    addToast('لیست مقایسه خالی شد', 'info');
  };

  return (
    <CompareContext.Provider value={{ compareItems, toggleCompare, isInCompare, clearCompare, replaceCompare }}>
      {children}
    </CompareContext.Provider>
  );
}

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) throw new Error('useCompare must be used within CompareProvider');
  return context;
};
