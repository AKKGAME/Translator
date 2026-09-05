import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Sparkles,
  HelpCircle,
  Trash2,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'gemini';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

export interface AlertOptions {
  title?: string;
  message: string;
  okText?: string;
  type?: 'error' | 'warning' | 'info' | 'success';
}

interface AlertToastContextType {
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
    gemini: (message: string, title?: string, duration?: number) => void;
  };
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
}

const AlertToastContext = createContext<AlertToastContextType | null>(null);

// Global notification bus for non-React or easy standalone calls
let globalToast: AlertToastContextType['toast'] | null = null;
let globalConfirm: ((options: ConfirmOptions | string) => Promise<boolean>) | null = null;
let globalAlert: ((options: AlertOptions | string) => Promise<void>) | null = null;

export const notify = {
  success: (msg: string, title?: string, duration?: number) => globalToast?.success(msg, title, duration),
  error: (msg: string, title?: string, duration?: number) => globalToast?.error(msg, title, duration),
  warning: (msg: string, title?: string, duration?: number) => globalToast?.warning(msg, title, duration),
  info: (msg: string, title?: string, duration?: number) => globalToast?.info(msg, title, duration),
  gemini: (msg: string, title?: string, duration?: number) => globalToast?.gemini(msg, title, duration),
};

export const showConfirm = (options: ConfirmOptions | string): Promise<boolean> => {
  if (globalConfirm) {
    return globalConfirm(options);
  }
  return Promise.resolve(window.confirm(typeof options === 'string' ? options : options.message));
};

export const showAlert = (options: AlertOptions | string): Promise<void> => {
  if (globalAlert) {
    return globalAlert(options);
  }
  window.alert(typeof options === 'string' ? options : options.message);
  return Promise.resolve();
};

export const useNotify = () => {
  const context = useContext(AlertToastContext);
  if (!context) {
    throw new Error('useNotify must be used within an AlertToastProvider');
  }
  return context;
};

export const AlertToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    options: AlertOptions;
    resolve: () => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, title?: string, duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = { id, type, title, message, duration };

    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep up to 5 at once

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toastMethods = {
    success: (msg: string, title?: string, dur?: number) => addToast('success', msg, title || 'အောင်မြင်ပါသည်', dur),
    error: (msg: string, title?: string, dur?: number) => addToast('error', msg, title || 'အမှားဖြစ်ပေါ်ပါသည်', dur || 5000),
    warning: (msg: string, title?: string, dur?: number) => addToast('warning', msg, title || 'သတိပြုရန်', dur || 4500),
    info: (msg: string, title?: string, dur?: number) => addToast('info', msg, title || 'အသိပေးချက်', dur),
    gemini: (msg: string, title?: string, dur?: number) => addToast('gemini', msg, title || 'Gemini AI', dur),
  };

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const normalizedOptions: ConfirmOptions =
      typeof options === 'string'
        ? { message: options, title: 'အတည်ပြုရန်', confirmText: 'သေချာပါသည်', cancelText: 'မလုပ်တော့ပါ', type: 'warning' }
        : {
            title: options.title || 'အတည်ပြုရန်',
            confirmText: options.confirmText || 'သေချာပါသည်',
            cancelText: options.cancelText || 'မလုပ်တော့ပါ',
            type: options.type || 'warning',
            ...options,
          };

    return new Promise<boolean>((resolve) => {
      setConfirmModal({
        isOpen: true,
        options: normalizedOptions,
        resolve,
      });
    });
  }, []);

  const customAlert = useCallback((options: AlertOptions | string): Promise<void> => {
    const normalizedOptions: AlertOptions =
      typeof options === 'string'
        ? { message: options, title: 'အသိပေးချက်', okText: 'နားလည်ပါပြီ', type: 'info' }
        : {
            title: options.title || 'အသိပေးချက်',
            okText: options.okText || 'နားလည်ပါပြီ',
            type: options.type || 'info',
            ...options,
          };

    return new Promise<void>((resolve) => {
      setAlertModal({
        isOpen: true,
        options: normalizedOptions,
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    globalToast = toastMethods;
    globalConfirm = confirm;
    globalAlert = customAlert;
  }, [confirm, customAlert]);

  return (
    <AlertToastContext.Provider value={{ toast: toastMethods, confirm, alert: customAlert }}>
      {children}

      {/* Floating Toasts Container (Bottom Right / Top Right responsive) */}
      <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
              t.type === 'success'
                ? 'bg-[#0e1e17]/95 border-emerald-500/40 text-emerald-100 shadow-emerald-950/50'
                : t.type === 'error'
                ? 'bg-[#230f14]/95 border-rose-500/40 text-rose-100 shadow-rose-950/50'
                : t.type === 'warning'
                ? 'bg-[#221708]/95 border-amber-500/40 text-amber-100 shadow-amber-950/50'
                : t.type === 'gemini'
                ? 'bg-[#181128]/95 border-purple-500/40 text-purple-100 shadow-purple-950/50'
                : 'bg-[#0f172a]/95 border-sky-500/40 text-sky-100 shadow-sky-950/50'
            }`}
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === 'gemini' && <Sparkles className="w-5 h-5 text-purple-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {t.title && (
                <div
                  className={`text-xs font-bold leading-tight mb-0.5 ${
                    t.type === 'success'
                      ? 'text-emerald-300'
                      : t.type === 'error'
                      ? 'text-rose-300'
                      : t.type === 'warning'
                      ? 'text-amber-300'
                      : t.type === 'gemini'
                      ? 'text-purple-300'
                      : 'text-sky-300'
                  }`}
                >
                  {t.title}
                </div>
              )}
              <div className="text-xs text-slate-200 leading-relaxed break-words font-sans">
                {t.message}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 text-slate-400 hover:text-slate-100 p-0.5 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Modern Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#121622] border border-[#262f44] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl border shrink-0 ${
                  confirmModal.options.type === 'danger'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : confirmModal.options.type === 'warning'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : confirmModal.options.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                }`}
              >
                {confirmModal.options.type === 'danger' ? (
                  <Trash2 className="w-6 h-6" />
                ) : confirmModal.options.type === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-100">
                  {confirmModal.options.title || 'အတည်ပြုရန်'}
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed whitespace-pre-line">
                  {confirmModal.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1f2537]">
              <button
                type="button"
                onClick={() => {
                  confirmModal.resolve(false);
                  setConfirmModal(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#181f2f] hover:bg-[#20283d] text-slate-300 border border-[#2b354c] transition cursor-pointer"
              >
                {confirmModal.options.cancelText || 'မလုပ်တော့ပါ'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.resolve(true);
                  setConfirmModal(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md cursor-pointer ${
                  confirmModal.options.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'
                    : confirmModal.options.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                }`}
              >
                {confirmModal.options.confirmText || 'သေချာပါသည်'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#121622] border border-[#262f44] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl border shrink-0 ${
                  alertModal.options.type === 'error'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : alertModal.options.type === 'warning'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : alertModal.options.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                }`}
              >
                {alertModal.options.type === 'error' ? (
                  <AlertCircle className="w-6 h-6" />
                ) : alertModal.options.type === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : alertModal.options.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-100">
                  {alertModal.options.title || 'အသိပေးချက်'}
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed whitespace-pre-line font-sans">
                  {alertModal.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#1f2537]">
              <button
                type="button"
                onClick={() => {
                  alertModal.resolve();
                  setAlertModal(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-950/40 cursor-pointer"
              >
                {alertModal.options.okText || 'နားလည်ပါပြီ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertToastContext.Provider>
  );
};
