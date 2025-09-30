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

const INITIAL_VALUES: SignupValues = {
  email: "",
  password: "",
  confirmPassword: "",
};

export default function SignupPage() {
  const router = useRouter();
  const { alert, showAlert, clearAlert } = useAlert();
  const [values, setValues] = useState<SignupValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupValues, string>>>({});
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
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange("password")}
            disabled={isSubmitting}
            hasError={Boolean(errors.password)}
            required
          />
          {errors.password ? (
            <p className="text-xs text-red-600">{errors.password}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={handleChange("confirmPassword")}
            disabled={isSubmitting}
            hasError={Boolean(errors.confirmPassword)}
            required
          />
          {errors.confirmPassword ? (
            <p className="text-xs text-red-600">{errors.confirmPassword}</p>
          ) : null}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Creating account..." : "Sign up"}
        </Button>
      </form>
    </AuthShell>
  );
}
