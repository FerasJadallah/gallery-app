"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AlertBanner } from "@/components/ui/alert-banner";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <AuthShell title="Verify your email">
      <div className="flex w-full flex-col gap-6">
        <div>

          <p className="mt-2 text-sm text-slate-600">
            We sent a verification link to {email ? <strong>{email}</strong> : "your email address"}
          </p>
        </div>

        <AlertBanner
          type="info"
          message={`Click the link in the email to verify your account. If you do not see it, check your spam folder. ${
            timeLeft > 0 ? `You can request a new verification email in ${timeLeft} seconds.` : ""
          }`}
        />

        <div className="text-sm text-slate-600">
          <p>After verifying your email, you will be asked to set up your profile.</p>
        </div>
      </div>
    </AuthShell>
  );
}
