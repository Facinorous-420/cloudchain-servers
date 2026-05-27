"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  addToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timerRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timerRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, tone }]);
      const timer = setTimeout(() => remove(id), 4000);
      timerRef.current.set(id, timer);
    },
    [remove],
  );

  // Read flash cookie set by server actions before redirect
  useEffect(() => {
    const match = document.cookie.match(/cloudchain_flash=([^;]+)/);
    if (!match) return;
    try {
      const { message, tone } = JSON.parse(decodeURIComponent(match[1]));
      if (message) addToast(message, tone ?? "success");
    } catch {
      // malformed cookie — ignore
    }
    document.cookie =
      "cloudchain_flash=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 text-[13px] shadow-lg transition-all ${
              t.tone === "success"
                ? "border-status-green/40 bg-panel text-text"
                : t.tone === "error"
                  ? "border-red-500/40 bg-panel text-red-400"
                  : "border-border bg-panel text-text"
            }`}
          >
            <span
              className={
                t.tone === "success"
                  ? "text-status-green"
                  : t.tone === "error"
                    ? "text-red-400"
                    : "text-accent"
              }
            >
              {t.tone === "success" ? "✓" : t.tone === "error" ? "✕" : "ℹ"}
            </span>
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="ml-1 text-text-dim hover:text-text"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
