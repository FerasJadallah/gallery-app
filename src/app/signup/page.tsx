"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { z } from "zod";

import { getSupabaseClient } from "@/app/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAlert } from "@/hooks/use-alert";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

const signupSchema = z
  .object({
    email: z.string().email("Please enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters long."),
    confirmPassword: z.string()
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
  confirmPassword: ""
};

export default function SignupPage() {
  const router = useRouter();
  const { alert, showAlert, clearAlert } = useAlert();
  const [values, setValues] = useState<SignupValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof SignupValues, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const footer = (
    <p>
      Already have an account?{" "}
      <Link href="/login" className="font-medium text-slate-900 underline-offset-4 hover:underline">
        Log in
      </Link>
    </p>
  );

  const handleChange = (field: keyof SignupValues) => (event: ChangeEvent<HTMLInputElement>) => {
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
        confirmPassword: fieldErrors.confirmPassword?.[0]
      });
      showAlert("error", "Please fix the highlighted issues and try signing up again.");
      return;
    }

    const { email, password } = parsed.data;
    setIsSubmitting(true);




    try {
      // Proceed with signup
      const supabase = getSupabaseClient();
      const redirectOrigin = "https://gallery-app-sigma-livid.vercel.app";

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${redirectOrigin}/setup-profile`,
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        showAlert('error', signUpError.message);
        return;
      }

      if (!data?.user?.id) {
        showAlert('error', 'Failed to create account. Please try again.');
        return;
      }

      showAlert('success', 'Please check your email to verify your account.');
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      console.error('Unexpected error during signup:', err);
      showAlert('error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell title="Create an account" footer={footer}>
      <div className="flex w-full flex-col gap-6">
        <div>
          <p className="text-sm text-slate-600">Create an account to share your photo albums with friends and family.</p>
        </div>

        {alert && <AlertBanner {...alert} />}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={values.email}
              onChange={handleChange("email")}
              hasError={!!errors.email}
              required
            />
          </div>



          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={values.password}
                onChange={handleChange("password")}
                hasError={!!errors.password || (values.password.length > 0 && values.password.length < 8)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-700 hover:text-slate-900"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {values.password.length > 0 && values.password.length < 8 && (
              <p className="text-xs text-red-600">Minimum 8 characters</p>
            )}
            {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={values.confirmPassword}
                onChange={handleChange("confirmPassword")}
                hasError={!!errors.confirmPassword}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-700 hover:text-slate-900"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword}</p>}
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            variant="primary"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
