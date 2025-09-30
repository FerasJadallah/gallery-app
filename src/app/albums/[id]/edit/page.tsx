"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAlert } from "@/hooks/use-alert";

const LINK_CLASSES = "inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-white";

export default function EditAlbumPage() {
  const params = useParams();
  const albumId = params?.id as string;
  const { alert, showAlert, clearAlert } = useAlert();
  const [title, setTitle] = useState("Untitled album");
  const [description, setDescription] = useState("This description is a placeholder. Replace with real content.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAlert();

    if (!title.trim()) {
      showAlert("error", "Album title cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      showAlert("success", "Album updated. Redirecting to the detail page...");
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Edit album</p>
            <h1 className="text-3xl font-semibold text-slate-900">Album #{albumId}</h1>
          </div>
          <Link href={`/albums/${albumId}`} className={LINK_CLASSES}>
            Cancel
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Album details</CardTitle>
            <CardDescription>Fine-tune the title and description of your album.</CardDescription>
          </CardHeader>
          <CardContent>
            {alert ? (
              <AlertBanner variant={alert.type} message={alert.message} className="mb-4" />
            ) : null}

            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="space-y-1">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save changes"}
                </Button>
                <Link href={`/albums/${albumId}`} className={LINK_CLASSES}>
                  Discard
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
