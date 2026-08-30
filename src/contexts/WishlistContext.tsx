import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from './ToastContext';
import { Product } from '../types';
import { authFetch } from '../lib/api';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlist: Product[];
  toggleWishlist: (product: Product) => void;
  isInWishlist: (id: number) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  React.useEffect(() => {
    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      authFetch('/api/wishlist', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setWishlist(data);
          localStorage.setItem('wishlist', JSON.stringify(data));
        }
      })
      .catch(err => console.error('Failed to fetch wishlist', err));
    }
  }, [isLoggedIn]);
  const { addToast } = useToast();

  const toggleWishlist = async (product: Product) => {
    const exists = isInWishlist(product.id);
    if (exists) {
      addToast('محصول از علاقه‌مندی‌ها حذف شد', 'info');
      setWishlist((prev) => {
        const newList = prev.filter((p) => p.id !== product.id);
        try { localStorage.setItem('wishlist', JSON.stringify(newList)); } catch(e) {}
        return newList;
      });
      
      if (isLoggedIn) {
        const token = localStorage.getItem('token');
        try {
          await authFetch(`/api/wishlist/${product.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (err) {
          console.error('Failed to sync remove from wishlist', err);
        }
      }
    } else {
      addToast('محصول به علاقه‌مندی‌ها اضافه شد', 'success');
      setWishlist((prev) => {
        const newList = [...prev, product];
        try { localStorage.setItem('wishlist', JSON.stringify(newList)); } catch(e) {}
        return newList;
      });
      
      if (isLoggedIn) {
        const token = localStorage.getItem('token');
        try {
          await authFetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ productId: product.id })
          });
        } catch (err) {
          console.error('Failed to sync add to wishlist', err);
        }
      }
    }
  };

  const isInWishlist = (id: number) => wishlist.some((p) => p.id === id);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};
