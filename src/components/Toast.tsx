import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastItemProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const exitTimer = setTimeout(() => setExiting(true), duration - 400);
    const removeTimer = setTimeout(() => onClose(toast.id), duration);
    return () => { clearTimeout(exitTimer); clearTimeout(removeTimer); };
  }, [toast.id, toast.duration, onClose]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose(toast.id), 300);
  };

  const config = {
    success: {
      icon: <CheckCircle size={20} />,
      bg: 'from-green-600/95 to-emerald-700/95',
      border: 'border-green-400/30',
      iconColor: 'text-green-200',
      bar: 'bg-green-300',
    },
    error: {
      icon: <XCircle size={20} />,
      bg: 'from-red-600/95 to-red-700/95',
      border: 'border-red-400/30',
      iconColor: 'text-red-200',
      bar: 'bg-red-300',
    },
    warning: {
      icon: <AlertTriangle size={20} />,
      bg: 'from-amber-600/95 to-orange-700/95',
      border: 'border-amber-400/30',
      iconColor: 'text-amber-200',
      bar: 'bg-amber-300',
    },
    info: {
      icon: <Info size={20} />,
      bg: 'from-blue-600/95 to-indigo-700/95',
      border: 'border-blue-400/30',
      iconColor: 'text-blue-200',
      bar: 'bg-blue-300',
    },
  };

  const c = config[toast.type];

  return (
    <div
      className={`relative overflow-hidden w-full max-w-sm bg-gradient-to-r ${c.bg} backdrop-blur-xl border ${c.border} rounded-xl shadow-2xl shadow-black/30 transition-all duration-300 ${
        exiting ? 'opacity-0 translate-x-8 scale-95' : 'opacity-100 translate-x-0 scale-100'
      }`}
      style={{ animation: exiting ? undefined : 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`${c.iconColor} shrink-0 mt-0.5`}>{c.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{toast.title}</p>
          {toast.message && <p className="text-white/70 text-xs mt-0.5 break-words">{toast.message}</p>}
        </div>
        <button onClick={handleClose} className="text-white/50 hover:text-white shrink-0 transition-colors p-0.5">
          <X size={16} />
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-black/20">
        <div
          className={`h-full ${c.bar} opacity-60`}
          style={{ animation: `shrink ${toast.duration ?? 4000}ms linear forwards` }}
        />
      </div>
    </div>
  );
};

// ==============================
// Toast Container
// ==============================

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

// ==============================
// Hook
// ==============================

export type ToastActions = {
  toasts: ToastData[];
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
};

export function useToast(): ToastActions {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (type: ToastType, title: string, message?: string, duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 6);
    setToasts(prev => [...prev, { id, type, title, message, duration: duration ?? 4000 }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const success = (title: string, message?: string) => addToast('success', title, message);
  const error = (title: string, message?: string) => addToast('error', title, message, 6000);
  const info = (title: string, message?: string) => addToast('info', title, message);
  const warning = (title: string, message?: string) => addToast('warning', title, message, 5000);

  return { toasts, removeToast, success, error, info, warning, addToast };
}
