'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — fixed, bottom-center, above everything */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`
              pointer-events-auto px-5 py-2.5 rounded-lg
              font-mono text-sm tracking-wide
              backdrop-blur-xl border
              animate-toast-in
              cursor-pointer
              transition-all duration-300 hover:scale-105
              ${t.type === 'success'
                ? 'bg-[#0A1A0A]/85 border-[#00FF41]/20 text-[#B3FFB3] shadow-[0_0_20px_rgba(0,255,65,0.08)]'
                : t.type === 'error'
                ? 'bg-[#1A0A0A]/85 border-[#FF1A40]/20 text-[#FFB3B3] shadow-[0_0_20px_rgba(255,26,64,0.08)]'
                : 'bg-[#0A1A1A]/85 border-[#00E5FF]/20 text-[#B3F0FF] shadow-[0_0_20px_rgba(0,229,255,0.06)]'
              }
            `}
          >
            <span className="flex items-center gap-2">
              <span className={`text-xs ${t.type === 'success' ? 'text-[#00FF41]' : t.type === 'error' ? 'text-[#FF1A40]' : 'text-[#00E5FF]'}`}>
                {t.type === 'success' ? '◆' : t.type === 'error' ? '◇' : '◈'}
              </span>
              {t.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
