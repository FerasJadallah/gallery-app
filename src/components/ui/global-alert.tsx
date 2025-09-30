"use client";

import { useAlert } from "@/hooks/use-alert";
import { AlertBanner } from "./alert-banner";

export function GlobalAlert() {
  const { alert, clearAlert } = useAlert();

  if (!alert) return null;

  return (
    <div
      className="fixed top-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2"
      onClick={clearAlert}
    >
      <AlertBanner variant={alert.type} message={alert.message} />
    </div>
  );
}
