"use client";

import { useCallback, useState } from "react";

export type AlertType = "success" | "error" | "info";

export type AlertState = {
  type: AlertType;
  message: string;
} | null;

export function useAlert(initialState: AlertState = null) {
  const [alert, setAlert] = useState<AlertState>(initialState);

  const showAlert = useCallback((type: AlertType, message: string) => {
    setAlert({ type, message });
  }, []);

  const clearAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return {
    alert,
    showAlert,
    clearAlert,
  };
}
