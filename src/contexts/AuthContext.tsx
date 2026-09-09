import { authFetch } from '../lib/api';
import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "./ToastContext";

export interface AddressItem {
  id: string;
  title: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  joinedDate?: string;
  vipPoints?: number;
  addresses?: AddressItem[];
  role?: string;
  mustChangePassword?: boolean;
}

interface AuthContextType {
 user: UserProfile | null;
 isLoggedIn: boolean;
 mustChangePassword: boolean;
 clearMustChangePassword: () => void;
 login: (phone: string, password: string) => Promise<{ ok: boolean; mustChangePassword: boolean }>;
  verifyOtp: (phone: string, code: string, name?: string) => Promise<boolean>;
  register: (name: string, phone: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  addAddress: (address: Omit<AddressItem, "id">) => void;
  updateAddress: (id: string, address: Partial<AddressItem>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  // Admin first-login gate: mirrors user.mustChangePassword so the Login page
  // can redirect to the forced change-password screen before anything else.
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Latest user snapshot — avoids stale-closure reads inside async mutations.
  const userRef = React.useRef<UserProfile | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            return;
          }
        }
      }

      // Try automatic token refresh via HttpOnly refresh cookie. The cookie is
      // HttpOnly so document.cookie can never reveal it — always attempt once;
      // a 401 here simply means logged out.
      {
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include"
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.user) {
            setUser(refreshData.user);
            if (refreshData.accessToken) {
              localStorage.setItem("token", refreshData.accessToken);
            }
            return;
          }
        }
      }

      setUser(null);
      localStorage.removeItem("token");
    } catch {
      setUser(null);
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (phone: string, password: string): Promise<{ ok: boolean; mustChangePassword: boolean }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setMustChangePassword(Boolean(data.mustChangePassword || data.user?.mustChangePassword));
        if (data.accessToken) {
          localStorage.setItem("token", data.accessToken);
        }
        addToast(data.message, "success");
        // Return the FRESH flag — reading state here from the caller would be a
        // stale closure (state update hasn't re-rendered yet).
        return { ok: true, mustChangePassword: Boolean(data.mustChangePassword || data.user?.mustChangePassword) };
      } else {
        addToast(data.message, "error");
        return { ok: false, mustChangePassword: false };
      }
    } catch (e) {
      addToast("خطا در ارتباط با سرور", "error");
      return { ok: false, mustChangePassword: false };
    }
  };

  
  const verifyOtp = async (phone: string, code: string, name?: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, name }),
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setUser(data.user);
        if (data.accessToken) {
          localStorage.setItem("token", data.accessToken);
        }
        addToast(data.message, "success");
        return true;
      } else if (res.status === 503) {
        // SMS provider is not wired in production — backend returns 503 on
        // /api/auth/otp/* (audit known blocker #5).
        addToast("سرویس پیامکی فعال نیست", "error");
        return false;
      } else {
        addToast(data.message, "error");
        return false;
      }
    } catch {
      addToast("خطا در ارتباط با سرور", "error");
      return false;
    }
  };

  const register = async (name: string, phone: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
        credentials: "include"
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        if (data.accessToken) {
          localStorage.setItem("token", data.accessToken);
        }
        addToast(data.message, "success");
        return true;
      } else {
        addToast(data.message, "error");
        return false;
      }
    } catch (e) {
      addToast("خطا در ارتباط با سرور", "error");
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch {}
    setUser(null);
    setMustChangePassword(false);
    localStorage.removeItem("token");
    addToast("با موفقیت خارج شدید", "success");
  };

  // Called after the forced password change succeeds — lifts the admin gate.
  const clearMustChangePassword = () => {
    setMustChangePassword(false);
    setUser(prev => prev ? { ...prev, mustChangePassword: false } : null);
  };

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      const res = await authFetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        credentials: "include",
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setUser(prev => prev ? { ...prev, ...data } : null);
        addToast("پروفایل با موفقیت بروزرسانی شد", "success");
      } else {
        const error = await res.json();
        addToast(error.message, "error");
      }
    } catch (e) {
      addToast("خطا در ارتباط با سرور", "error");
    }
  };

  const addAddress = async (address: Omit<AddressItem, "id">) => {
    if (!userRef.current) return;
    try {
      const res = await authFetch("/api/users/me/addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        credentials: "include",
        body: JSON.stringify(address)
      });
      if (res.ok) {
        const data = await res.json();
        // Derive from the freshest state — never close over `user`.
        // Server address payload is the source of truth.
        setUser(prev => {
          if (!prev) return prev;
          if (Array.isArray(data.addresses)) {
            return { ...prev, addresses: data.addresses };
          }
          const existing = prev.addresses || [];
          if (data.address && existing.some(a => a.id === data.address.id)) {
            return { ...prev, addresses: existing.map(a => a.id === data.address.id ? data.address : a) };
          }
          return { ...prev, addresses: [...existing, data.address] };
        });
        addToast(data.message, "success");
      } else {
        const error = await res.json();
        addToast(error.message, "error");
      }
    } catch (e) {
      addToast("خطا در ارتباط با سرور", "error");
    }
  };

  const updateAddress = async (id: string, address: Partial<AddressItem>) => {
    if (!userRef.current) return;
    try {
      const res = await authFetch(`/api/users/me/addresses/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        credentials: "include",
        body: JSON.stringify(address)
      });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => {
          if (!prev) return prev;
          if (Array.isArray(data.addresses)) {
            return { ...prev, addresses: data.addresses };
          }
          const existing = prev.addresses || [];
          return { ...prev, addresses: existing.map(a => a.id === id ? (data.address || { ...a, ...address }) : a) };
        });
        addToast(data.message, "success");
      } else {
        const error = await res.json();
        addToast(error.message, "error");
      }
    } catch (e) {
      addToast("خطا در ارتباط با سرور", "error");
    }
  };

  const deleteAddress = async (id: string) => {
    if (!userRef.current) return;
    try {
      const res = await authFetch(`/api/users/me/addresses/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setUser(prev => {
          if (!prev) return prev;
          if (Array.isArray(data.addresses)) {
            return { ...prev, addresses: data.addresses };
          }
          const existing = prev.addresses || [];
          return { ...prev, addresses: existing.filter(a => a.id !== id) };
        });
        addToast("آدرس حذف شد", "success");
      } else {
        const error = await res.json();
        addToast(error.message, "error");
      }
    } catch (e) {
      addToast("خطا در ارتباط با سرور", "error");
    }
  };

  const setDefaultAddress = async (id: string) => {
    if (!userRef.current) return;
    try {
      const res = await authFetch(`/api/users/me/addresses/${id}/default`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setUser(prev => {
          if (!prev) return prev;
          if (Array.isArray(data.addresses)) {
            return { ...prev, addresses: data.addresses };
          }
          const existing = prev.addresses || [];
          return {
            ...prev,
            addresses: existing.map(a => ({
              ...a,
              isDefault: a.id === id
            }))
          };
        });
        addToast("آدرس پیش‌فرض تغییر کرد", "success");
      } else {
        const error = await res.json();
        addToast(error.message, "error");
      }
    } catch (e) {
      addToast("خطا در ارتباط با سرور", "error");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        mustChangePassword,
        clearMustChangePassword,
        isLoading,
        login,
        verifyOtp,
        register,
        logout,
        updateProfile,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
