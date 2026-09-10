import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from './ToastContext';
import { Product, CartItem } from '../types';
import { MAX_CART_QUANTITY } from '../lib/constants';
import { authFetch } from '../lib/api';
import { useAuth } from './AuthContext';
import { CouponData, calculateCouponDiscount } from '../lib/coupon';
import { toPersianDigits } from '../lib/utils';

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
  // R2-03: live mirror of the cart for mutation handlers (avoids stale closures).
  const cartRef = React.useRef<CartItem[]>(cart);

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  // Sync cart from server when logged in — MERGE guest cart instead of replacing it.
  // Guest-only items are pushed to the server (POST is an upsert), then the
  // authoritative server list replaces local state. Runs once per login transition.
  const mergedForToken = React.useRef<string | null>(null);
  // Flips on logout so an in-flight merge loop stops immediately.
  const mergeAborted = React.useRef(false);
  const isLoggedInRef = React.useRef(isLoggedIn);
  React.useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
    if (!isLoggedIn) {
      mergeAborted.current = true;
    }
  }, [isLoggedIn]);
  React.useEffect(() => {
    if (!isLoggedIn) return;
    const token = localStorage.getItem('token');
    if (!token || mergedForToken.current === token) return;
    mergedForToken.current = token;
    mergeAborted.current = false;

    const guestItems = cart.filter(item => typeof item.id === 'number');

    (async () => {
      const failedItems: CartItem[] = [];
      for (const item of guestItems) {
        // Abort: user logged out mid-merge.
        if (mergeAborted.current || !isLoggedInRef.current) return;
        try {
          const res = await authFetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ productId: item.id, quantity: item.quantity })
          });
          if (!res.ok) failedItems.push(item);
        } catch (err) {
          console.error('Failed to merge guest cart item', err);
          failedItems.push(item);
        }
      }
      // Partial failure: keep failed items in the local cart, surface a toast.
      if (failedItems.length > 0) {
        if (!mergeAborted.current && isLoggedInRef.current) {
          addToast('برخی اقلام سبد خرید همگام‌سازی نشدند', 'warning');
          saveCart(failedItems);
        }
        return;
      }
      if (mergeAborted.current || !isLoggedInRef.current) return;
      try {
        const res = await authFetch('/api/cart', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (Array.isArray(data) && !mergeAborted.current && isLoggedInRef.current) {
          setCart(data);
          localStorage.setItem('cart', JSON.stringify(data));
        }
      } catch (err) {
        console.error('Failed to fetch cart', err);
      }
    })();
  }, [isLoggedIn]);

  const saveCart = (newCart: CartItem[]) => {
    cartRef.current = newCart;
    setCart(newCart);
    try {
      localStorage.setItem('cart', JSON.stringify(newCart));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  };

  // Keeps cartRef in sync with every setCart (merge effect calls setCart directly).
  React.useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // R2-16: When a cart mutation endpoint echoes back the authoritative server
  // cart list, replace the optimistic local state with it.
  const applyServerCart = async (res: Response) => {
    if (!res.ok) return;
    try {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveCart(data);
      }
    } catch {
      // endpoint returned no JSON body — keep optimistic state
    }
  };

  // R2-03: Reads the live cart (not a stale closure) so rapid consecutive
  // addToCart calls compute quantities from the latest state.
  const addToCart = async (product: Product, quantity = 1) => {
    const existing = cartRef.current.find(item => item.id === product.id);
    let newQty = quantity;
    if (existing) {
      if (existing.quantity >= MAX_CART_QUANTITY) {
        addToast(`حداکثر تعداد مجاز (${toPersianDigits(MAX_CART_QUANTITY)} عدد) در سبد خرید قرار دارد`, 'warning');
        return;
      }
      newQty = Math.min(existing.quantity + quantity, MAX_CART_QUANTITY);
      saveCart(cartRef.current.map(item =>
        item.id === product.id ? { ...item, quantity: newQty } : item
      ));
    } else {
      newQty = Math.min(quantity, MAX_CART_QUANTITY);
      saveCart([...cartRef.current, { ...product, quantity: newQty }]);
    }

    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      try {
        const res = await authFetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ productId: product.id, quantity })
        });
        // Server responds with the authoritative cart list (upsert) — adopt it.
        await applyServerCart(res);
      } catch (err) {
        console.error('Failed to sync add to cart', err);
      }
    }

    addToast('محصول به سبد خرید اضافه شد', 'success');
    setIsCartDrawerOpen(true);
  };

  const removeFromCart = async (id: number) => {
    saveCart(cartRef.current.filter(item => item.id !== id));

    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      try {
        const res = await authFetch(`/api/cart/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await applyServerCart(res);
      } catch (err) {
        console.error('Failed to sync remove from cart', err);
      }
    }
    addToast('محصول از سبد خرید حذف شد', 'info');
  };

  const updateQuantity = async (id: number, quantity: number) => {
    if (quantity < 1) return;
    if (quantity > MAX_CART_QUANTITY) {
      addToast(`حداکثر تعداد مجاز ${toPersianDigits(MAX_CART_QUANTITY)} عدد می‌باشد`, 'warning');
      return;
    }
    saveCart(cartRef.current.map(item => item.id === id ? { ...item, quantity } : item));

    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      try {
        const res = await authFetch(`/api/cart/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ quantity })
        });
        await applyServerCart(res);
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
