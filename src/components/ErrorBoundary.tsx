import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertOctagon } from 'lucide-react';
import { MasarLogo } from './MasarLogo';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4" dir="rtl">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center">
            <div className="flex justify-center mb-6">
              <MasarLogo size="lg" />
            </div>

            <div className="mx-auto w-14 h-14 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-5 border border-amber-200 dark:border-amber-900/50">
              <AlertOctagon className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              حدث خطأ غير متوقع أثناء عرض الصفحة
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              واجه التطبيق خطأً أثناء معالجة هذه الصفحة. يمكنك المحاولة مجدداً أو إعادة تحميل التطبيق.
            </p>

            {this.state.error && (
              <details className="mb-6 text-right bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-400 select-none">
                  تفاصيل إضافية للمساعدة
                </summary>
                <pre className="mt-2 text-[11px] font-mono text-red-600 dark:text-red-400 overflow-x-auto whitespace-pre-wrap text-left" dir="ltr">
                  {this.state.error.toString()}
                  {this.state.error.stack ? `\n${this.state.error.stack.slice(0, 500)}...` : ''}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
              >
                محاولة المتابعة
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة التحميل</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
