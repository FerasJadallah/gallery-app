"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { AlertBanner } from "./alert-banner";

export type Toast = {
  id: string;
  message: string;
  variant: "success" | "error" | "info";
};

type ToastContextValue = {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo<ToastContextValue>(() => {
    const push: ToastContextValue["push"] = ({ message, variant }) => {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, variant }]);
    };

    const remove: ToastContextValue["remove"] = (id) => {
      setToasts((prev) => prev.filter((toast) => toast.id != id));
    };

    return { toasts, push, remove };
  }, [toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 flex w-80 flex-col gap-3">
        {toasts.map((toast) => (
          <AlertBanner key={toast.id} variant={toast.variant} message={toast.message} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
