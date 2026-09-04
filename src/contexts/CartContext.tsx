import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from './ToastContext';
import { Product, CartItem } from '../types';
import { MAX_CART_QUANTITY } from '../lib/constants';
import { authFetch } from '../lib/api';
import { useAuth } from './AuthContext';
import { CouponData, calculateCouponDiscount } from '../lib/coupon';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  appliedCoupon: string | null;
  couponDetails: CouponData | null;
  couponDiscount: number;
  setAppliedCoupon: (code: string | null, details?: CouponData | null) => void;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [appliedCoupon, setAppliedCouponState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('appliedCoupon') || null;
    } catch {
      return null;
    }
  });
  const [couponDetails, setCouponDetails] = useState<CouponData | null>(() => {
    try {
      const saved = localStorage.getItem('couponDetails');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setAppliedCoupon = (code: string | null, details: CouponData | null = null) => {
    setAppliedCouponState(code);
    setCouponDetails(details);
    try {
      if (code) {
        localStorage.setItem('appliedCoupon', code);
      } else {
        localStorage.removeItem('appliedCoupon');
      }
      if (details) {
        localStorage.setItem('couponDetails', JSON.stringify(details));
      } else {
        localStorage.removeItem('couponDetails');
      }
    } catch {
      // ignore localStorage quota/access error
    }
  };

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const { addToast } = useToast();

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  // Sync cart from server when logged in
  React.useEffect(() => {
    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      authFetch('/api/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCart(data);
          localStorage.setItem('cart', JSON.stringify(data));
        }
      })
      .catch(err => console.error('Failed to fetch cart', err));
    }
  }, [isLoggedIn]);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem('cart', JSON.stringify(newCart));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  };

  const addToCart = async (product: Product, quantity = 1) => {
    const existing = cart.find(item => item.id === product.id);
    let newQty = quantity;
    if (existing) {
      if (existing.quantity >= MAX_CART_QUANTITY) {
        addToast(`حداکثر تعداد مجاز (${MAX_CART_QUANTITY} عدد) در سبد خرید قرار دارد`, 'warning');
        return;
      }
      newQty = Math.min(existing.quantity + quantity, MAX_CART_QUANTITY);
      saveCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: newQty } : item
      ));
    } else {
      newQty = Math.min(quantity, MAX_CART_QUANTITY);
      saveCart([...cart, { ...product, quantity: newQty }]);
    }
    
    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      try {
        await authFetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ productId: product.id, quantity })
        });
      } catch (err) {
        console.error('Failed to sync add to cart', err);
      }
    }
    
    addToast('محصول به سبد خرید اضافه شد', 'success');
    setIsCartDrawerOpen(true);
  };

  const removeFromCart = async (id: number) => {
    saveCart(cart.filter(item => item.id !== id));
    
    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      try {
        await authFetch(`/api/cart/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Failed to sync remove from cart', err);
      }
    }
    addToast('محصول از سبد خرید حذف شد', 'info');
  };

  const updateQuantity = async (id: number, quantity: number) => {
    if (quantity < 1) return;
    if (quantity > MAX_CART_QUANTITY) {
      addToast(`حداکثر تعداد مجاز ${MAX_CART_QUANTITY} عدد می‌باشد`, 'warning');
      return;
    }
    saveCart(cart.map(item => item.id === id ? { ...item, quantity } : item));
    
    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      try {
        await authFetch(`/api/cart/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ quantity })
        });
      } catch (err) {
        console.error('Failed to sync update quantity', err);
      }
    }
  };

  const clearCart = async () => {
    saveCart([]);
    
    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      try {
        await authFetch(`/api/cart`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Failed to sync clear cart', err);
      }
    }
    addToast('سبد خرید خالی شد', 'info');
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
  const couponDiscount = calculateCouponDiscount(couponDetails, cartTotal);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
      appliedCoupon,
      couponDetails,
      couponDiscount,
      setAppliedCoupon,
      isCartDrawerOpen,
      setIsCartDrawerOpen,
      openCartDrawer,
      closeCartDrawer
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
