"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { z } from "zod";

import { supabase } from "@/app/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { AlertBanner } from "@/components/ui/alert-banner";
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

  const footer = (
    <p>
      Need an account?{" "}
      <Link
        href="/signup"
        className="font-medium text-slate-900 underline-offset-4 hover:underline"
      >
        Create one
      </Link>
    </p>
  );

  const handleChange = (field: keyof LoginValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      showAlert("error", "Please resolve the highlighted fields and try again.");
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
  };

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to continue managing your gallery."
      footer={footer}
    >
      {alert ? <AlertBanner variant={alert.type} message={alert.message} /> : null}

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
              errors.email
                ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            )}
            value={values.email}
            onChange={handleChange("email")}
            disabled={isSubmitting}
            required
          />
          {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
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
              errors.password
                ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            )}
            value={values.password}
            onChange={handleChange("password")}
            disabled={isSubmitting}
            required
          />
          {errors.password ? (
            <p className="text-xs text-red-600">{errors.password}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition",
            isSubmitting ? "cursor-not-allowed opacity-70" : "hover:bg-slate-800"
          )}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
