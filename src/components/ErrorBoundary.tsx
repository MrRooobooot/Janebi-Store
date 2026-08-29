import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[var(--color-surface-dark)] flex flex-col items-center justify-center p-6 text-right font-sans dir-rtl">
          <div className="max-w-md w-full bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] rounded-3xl p-8 border border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] shadow-xl text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-bold text-[var(--color-text-main-light)] dark:text-[var(--color-text-main-dark)]">
              متأسفانه خطایی در نمایش صفحه رخ داد
            </h2>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              مشکلی رخ داده است. می‌توانید با بارگذاری مجدد صفحه، آن را دوباره امتحان کنید.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-6 py-3 rounded-2xl transition-all shadow-md mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              بارگذاری مجدد صفحه
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
