"use client";

import { cn } from "@/lib/utils";
import type { AlertType } from "@/hooks/use-alerts";

type AlertBannerProps = {
  variant: AlertType;
  message: string;
  className?: string;
};

const VARIANT_STYLES: Record<AlertType, string> = {
  success: "border-green-200 bg-green-50 text-green-700",
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

export function AlertBanner({ variant, message, className }: AlertBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm transition-colors",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {message}
    </div>
  );
}
