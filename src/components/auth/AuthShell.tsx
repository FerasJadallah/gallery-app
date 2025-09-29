import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
  className,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div
        className={cn(
          "w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm",
          className
        )}
      >
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {description ? (
            <p className="text-sm text-slate-600">{description}</p>
          ) : null}
        </header>

        {children}

        {footer ? <footer className="text-center text-sm text-slate-600">{footer}</footer> : null}
      </div>
    </div>
  );
}
