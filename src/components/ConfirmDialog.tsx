import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'warning' | 'info';
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolver?: (value: boolean) => void;
}

const toneStyles = {
  danger: {
    icon: 'text-red-300',
    border: 'border-red-500/30',
    bg: 'from-red-950/95 to-gray-900/95',
    button: 'bg-red-600 hover:bg-red-700',
  },
  warning: {
    icon: 'text-amber-300',
    border: 'border-amber-500/30',
    bg: 'from-amber-950/95 to-gray-900/95',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
  info: {
    icon: 'text-blue-300',
    border: 'border-blue-500/30',
    bg: 'from-blue-950/95 to-gray-900/95',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
};

export function useConfirm(): { confirm: ConfirmFn; dialog: React.ReactNode } {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    tone: 'warning',
  });

  const close = (result: boolean) => {
    if (state.resolver) state.resolver(result);
    setState(prev => ({ ...prev, open: false, resolver: undefined }));
  };

  const confirm: ConfirmFn = (options) =>
    new Promise(resolve => {
      setState({
        open: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        tone: options.tone || 'warning',
        resolver: resolve,
      });
    });

  const dialog = state.open ? (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => close(false)} />
      <div
        className={`relative w-full max-w-md rounded-2xl border bg-gradient-to-b ${toneStyles[state.tone!].bg} ${toneStyles[state.tone!].border} shadow-2xl`}
      >
        <div className="flex items-start gap-3 p-5">
          <div className={`${toneStyles[state.tone!].icon} mt-0.5`}>
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{state.title}</h3>
            {state.message && <p className="mt-2 text-sm text-gray-300 whitespace-pre-line">{state.message}</p>}
          </div>
          <button onClick={() => close(false)} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={() => close(true)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${toneStyles[state.tone!].button}`}
          >
            {state.confirmText}
          </button>
          <button
            onClick={() => close(false)}
            className="flex-1 rounded-xl bg-gray-800 hover:bg-gray-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {state.cancelText}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
