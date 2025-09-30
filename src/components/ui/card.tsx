import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;

type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

type CardContentProps = HTMLAttributes<HTMLDivElement>;

type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-xl border border-slate-200 bg-white p-6 shadow-sm", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div className={cn("mb-4 space-y-1", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold text-slate-900", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn("text-sm text-slate-600", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div className={cn("space-y-4", className)} {...props} />
  );
}

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div className={cn("mt-6 flex items-center justify-end gap-2", className)} {...props} />
  );
}
