import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { MdCheckCircle, MdError, MdInfo, MdWarning, MdClose } from 'react-icons/md';

/* ── Context ─────────────────────────────────────────────────────────────────── */
const ToastCtx = createContext(null);

export const useToast = () => useContext(ToastCtx);

const ICONS = {
  success: <MdCheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />,
  error: <MdError className="w-5 h-5 shrink-0 text-red-500" />,
  info: <MdInfo className="w-5 h-5 shrink-0 text-blue-500" />,
  warning: <MdWarning className="w-5 h-5 shrink-0 text-amber-500" />,
};

const STYLES = {
  success:
    'bg-white/95 dark:bg-slate-800/95 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 shadow-emerald-500/10',
  error:
    'bg-white/95 dark:bg-slate-800/95 border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300 shadow-red-500/10',
  info:
    'bg-white/95 dark:bg-slate-800/95 border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 shadow-blue-500/10',
  warning:
    'bg-white/95 dark:bg-slate-800/95 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 shadow-amber-500/10',
};

/* ── Single Toast Item ───────────────────────────────────────────────────────── */
function ToastItem({ toast, onDismiss }) {
  return (
    <div
      className={`toast-enter flex items-center gap-3.5 px-5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-xl text-sm font-semibold max-w-md transition-all duration-300 pointer-events-auto ${
        STYLES[toast.type] || STYLES.info
      }`}
      role="alert"
    >
      <div className="flex-shrink-0">{ICONS[toast.type] || ICONS.info}</div>
      <span className="flex-1 text-slate-800 dark:text-slate-100 leading-snug">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors ml-1"
        aria-label="Dismiss notification"
      >
        <MdClose size={16} />
      </button>
    </div>
  );
}

/* ── Provider ────────────────────────────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, type = 'info', duration = 4500) => {
      if (!message) return null;
      const id = Date.now() + Math.random();
      setToasts((prev) => {
        // Prevent duplicate toasts with the exact same message within short window
        const exists = prev.some((t) => t.message === message && t.type === type);
        if (exists) return prev;
        return [...prev.slice(-4), { id, message, type }]; // Keep max 5 visible
      });
      setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (msg, dur) => show(msg, 'success', dur),
      error: (msg, dur) => show(msg, 'error', dur),
      info: (msg, dur) => show(msg, 'info', dur),
      warning: (msg, dur) => show(msg, 'warning', dur),
    }),
    [show]
  );

  // Global listener for automatic API errors from Axios interceptor
  useEffect(() => {
    const handleApiError = (event) => {
      const detail = event.detail;
      if (detail?.message) {
        toast.error(detail.message);
      }
    };
    window.addEventListener('app:api-error', handleApiError);
    return () => window.removeEventListener('app:api-error', handleApiError);
  }, [toast]);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm sm:max-w-md w-full px-4">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export default ToastProvider;
