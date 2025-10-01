"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { z } from "zod";

import { supabase } from "@/app/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAlert } from "@/hooks/use-alert";

const profileSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(20, "Username must be at most 20 characters.")
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscore; start with a letter."),
});

type ProfileValues = z.infer<typeof profileSchema>;

const INITIAL_VALUES: ProfileValues = {
  fullName: "",
  username: "",
};

export default function SetupProfilePage() {
  const router = useRouter();
  const { alert, showAlert, clearAlert } = useAlert();
  const [values, setValues] = useState<ProfileValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileValues, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof ProfileValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAlert();
    setErrors({});

    const parsed = profileSchema.safeParse(values);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        fullName: fieldErrors.fullName?.[0],
        username: fieldErrors.username?.[0],
      });
      showAlert("error", "Please fix the highlighted issues and try again.");
      return;
    }

    const { fullName, username } = parsed.data;
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        showAlert("error", "You must be logged in to set up your profile.");
        router.push("/login");
        return;
      }

      // First check if username is taken
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        setErrors({ username: "This username is already taken" });
        return;
      }

      // Update the profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username: username.toLowerCase(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        showAlert("error", "Failed to update profile. Please try again.");
        return;
      }

      showAlert("success", "Profile updated successfully!");
      router.push("/dashboard");
    } catch (err) {
      console.error("Error:", err);
      showAlert("error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell title="Set up your profile">
      <div className="flex w-full flex-col gap-6">
        <div>
          <p className="text-sm text-slate-600">Choose a username and enter your full name to complete your profile.</p>
        </div>

        {alert && <AlertBanner {...alert} />}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              type="text"
              value={values.fullName}
              onChange={handleChange("fullName")}
              hasError={!!errors.fullName}
              required
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={values.username}
              onChange={handleChange("username")}
              hasError={!!errors.username}
              required
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-500">{errors.username}</p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            variant="primary"
          >
            {isSubmitting ? 'Setting up...' : 'Complete Setup'}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}