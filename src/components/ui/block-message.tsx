"use client";

import { AlertBanner } from "./alert-banner";
import type { AlertType } from "@/hooks/use-alert";

interface BlockMessageProps {
  title: string;
  description: string;
  type?: AlertType;
}

export function BlockMessage({ title, description, type = "error" }: BlockMessageProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <AlertBanner
        type={type}
        message={
          <div className="space-y-1">
            <p className="font-semibold">{title}</p>
            <p className="text-sm">{description}</p>
          </div>
        }
      />
    </div>
  );
}