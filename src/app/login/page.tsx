"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { z } from "zod";

import { supabase } from "@/app/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAlert } from "@/hooks/use-alert";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

const INITIAL_VALUES: LoginValues = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const { alert, showAlert, clearAlert } = useAlert();
  const [values, setValues] = useState<LoginValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof LoginValues, string>>>({});
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
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange("email")}
            disabled={isSubmitting}
            hasError={Boolean(errors.email)}
            required
          />
          {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange("password")}
            disabled={isSubmitting}
            hasError={Boolean(errors.password)}
            required
          />
          {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : null}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
