"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useCallback, useMemo, useState } from "react";
import { z } from "zod";

import { supabase } from "@/app/supabase/client";
import { useAlert } from "@/hooks/use-alerts";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

type FieldErrors = Partial<Record<keyof LoginValues, string>>;

const INITIAL_VALUES: LoginValues = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const { alert, showAlert, clearAlert } = useAlert();
  const [values, setValues] = useState<LoginValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldHasError = useCallback(
    (field: keyof LoginValues) => Boolean(errors[field]),
    [errors]
  );

  const handleChange = useCallback(
    (field: keyof LoginValues) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        setValues((prev) => ({ ...prev, [field]: event.target.value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      },
    []
  );

  const alertStyles = useMemo(() => {
    if (!alert) return "";
    if (alert.type === "success") {
      return "border-green-200 bg-green-50 text-green-700";
    }
    if (alert.type === "error") {
      return "border-red-200 bg-red-50 text-red-700";
    }
    return "border-blue-200 bg-blue-50 text-blue-700";
  }, [alert]);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      clearAlert();
      setErrors({});

      const parsed = loginSchema.safeParse(values);

      if (!parsed.success) {
        const { fieldErrors } = parsed.error.flatten();
        setErrors({
          email: fieldErrors.email?.[0],
          password: fieldErrors.password?.[0],
        });
        showAlert(
          "error",
          "Please resolve the highlighted fields and try again."
        );
        return;
      }

      const { email, password } = parsed.data;
      setIsSubmitting(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        showAlert(
          "error",
          error.message || "We couldn't sign you in. Please double-check your credentials."
        );
        setIsSubmitting(false);
        return;
      }

      showAlert("success", "Welcome back! Redirecting to your dashboard...");

      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    },
    [clearAlert, router, showAlert, values]
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-600">
            Sign in to continue managing your gallery.
          </p>
        </div>

        {alert && (
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              "transition-colors",
              alertStyles
            )}
          >
            {alert.message}
          </div>
        )}

        <form className="space-y-5" onSubmit={onSubmit} noValidate>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={cn(
                "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition",
                fieldHasError("email")
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              )}
              value={values.email}
              onChange={handleChange("email")}
              disabled={isSubmitting}
              required
            />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={cn(
                "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition",
                fieldHasError("password")
                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              )}
              value={values.password}
              onChange={handleChange("password")}
              disabled={isSubmitting}
              required
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition",
              isSubmitting
                ? "cursor-not-allowed opacity-70"
                : "hover:bg-slate-800"
            )}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Need an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
