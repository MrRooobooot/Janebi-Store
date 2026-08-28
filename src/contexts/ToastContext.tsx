import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            aria-live="assertive"
            className={`px-4 py-3 rounded-2xl shadow-xl border text-white font-medium text-sm transition-all transform pointer-events-auto flex items-center gap-2 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-600/95 dark:bg-emerald-700/95 border-emerald-500/30'
                : toast.type === 'error'
                ? 'bg-rose-600/95 dark:bg-rose-700/95 border-rose-500/30'
                : toast.type === 'warning'
                ? 'bg-amber-600/95 dark:bg-amber-700/95 border-amber-500/30'
                : 'bg-blue-600/95 dark:bg-blue-700/95 border-blue-500/30'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
