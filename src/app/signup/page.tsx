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

const signupSchema = z
  .object({
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters long."),
    confirmPassword: z.string(),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

type SignupValues = z.infer<typeof signupSchema>;

type FieldErrors = Partial<Record<keyof SignupValues, string>>;

const INITIAL_VALUES: SignupValues = {
  email: "",
  password: "",
  confirmPassword: "",
};

export default function SignupPage() {
  const router = useRouter();
  const { alert, showAlert, clearAlert } = useAlert();
  const [values, setValues] = useState<SignupValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const footer = (
    <p>
      Already have an account?{" "}
      <Link
        href="/login"
        className="font-medium text-slate-900 underline-offset-4 hover:underline"
      >
        Log in
      </Link>
    </p>
  );

  const handleChange = (field: keyof SignupValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAlert();
    setErrors({});

    const parsed = signupSchema.safeParse(values);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      });
      showAlert("error", "Please fix the highlighted issues and try signing up again.");
      return;
    }

    const { email, password } = parsed.data;
    setIsSubmitting(true);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      showAlert(
        "error",
        error.message || "We couldn't create your account. Please try again."
      );
      setIsSubmitting(false);
      return;
    }

    showAlert("success", "Account created! Redirecting you to login...");
    setValues(INITIAL_VALUES);

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  };

  return (
    <AuthShell
      title="Create account"
      description="Enter your details to start exploring the gallery."
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
            autoComplete="new-password"
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

        <div className="space-y-1">
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="confirmPassword"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={cn(
              "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition",
              errors.confirmPassword
                ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            )}
            value={values.confirmPassword}
            onChange={handleChange("confirmPassword")}
            disabled={isSubmitting}
            required
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-red-600">{errors.confirmPassword}</p>
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
          {isSubmitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </AuthShell>
  );
}
