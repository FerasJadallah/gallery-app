"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import Image from "next/image";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAlert } from "@/hooks/use-alert";
import { albumService } from "@/lib/albumService";
import { useAuth } from "@/contexts/AuthContext";
import ImageUpload from "@/components/ui/ImageUpload";
import { getSupabaseClient } from "@/app/supabase/client";
import { AlbumImage } from "@/types";
import { cn } from "@/lib/utils";

const LINK_CLASSES = "inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-white";
const MAX_FILES = 5;

type PendingUpload = {
  id: string;
  file: File;
  preview: string;
};

const createUid = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function EditAlbumPage() {
  const params = useParams();
  const albumId = params?.id as string;
  const { alert, showAlert, clearAlert } = useAlert();
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("private");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [imagesToRemove, setImagesToRemove] = useState<Set<string>>(new Set());
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const pendingUploadsRef = useRef<PendingUpload[]>([]);
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false);

  useEffect(() => {
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);

  useEffect(() => {
    return () => {
      pendingUploadsRef.current.forEach((upload) => {
        URL.revokeObjectURL(upload.preview);
      });
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const { album, images: albumImages } = await albumService.getAlbumWithImages(albumId);
        // Auth/owner guard
        if (!user) {
          router.replace(`/login?next=/albums/${albumId}/edit`);
          return;
        }
        if (album.user_id && user.id !== album.user_id) {
          router.replace(`/albums/${albumId}`);
          return;
        }
        setTitle(album.title ?? "");
        setDescription(album.description ?? "");
        setPrivacy(album.privacy === "public" ? "public" : "private");
        setImages(albumImages ?? []);
        setImagesToRemove(new Set());
        setPendingUploads((prev) => {
          prev.forEach((upload) => URL.revokeObjectURL(upload.preview));
          return [];
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load album";
        showAlert("error", message);
      }
    };
    if (!loading && albumId) void run();
  }, [albumId, loading, router, showAlert, supabase, user]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAlert();

    if (!title.trim()) {
      showAlert("error", "Album title cannot be empty.");
      return;
    }

    if (!user) {
      showAlert("error", "You must be signed in to update this album.");
      return;
    }

    const removals = Array.from(imagesToRemove);
    const pendingUploadsSnapshot = [...pendingUploads];

    const resultingCount = images.length - removals.length + pendingUploadsSnapshot.length;
    if (resultingCount > MAX_FILES) {
      showAlert("error", `An album can contain at most ${MAX_FILES} images.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await albumService.updateAlbum(albumId, {
        title: title.trim(),
        description: description.trim() || null,
        privacy,
      });

      if (removals.length > 0) {
        const { error: storageError } = await supabase.storage.from("album-images").remove(removals);
        if (storageError) throw storageError;

        const { error: dbError } = await supabase
          .from("album_images")
          .delete()
          .eq("album_id", albumId)
          .in("storage_path", removals);
        if (dbError) throw dbError;
      }

      if (pendingUploadsSnapshot.length > 0) {
        const remainingImages = images.filter((img) => !imagesToRemove.has(img.storage_path));
        const highestOrder =
          remainingImages.length > 0
            ? Math.max(...remainingImages.map((img) => img.display_order ?? 0))
            : -1;
        let nextOrder = highestOrder + 1;

        const uploadsForDb: { storage_path: string; display_order: number }[] = [];

        for (const pending of pendingUploadsSnapshot) {
          const file = pending.file;
          const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
          const path = `${user.id}/${albumId}/${createUid()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("album-images")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type,
            });
          if (uploadError) throw uploadError;
          uploadsForDb.push({ storage_path: path, display_order: nextOrder });
          nextOrder += 1;
        }

        await albumService.addImagesToAlbum(albumId, uploadsForDb);
      }

      pendingUploadsSnapshot.forEach((upload) => URL.revokeObjectURL(upload.preview));
      setPendingUploads([]);
      setImagesToRemove(new Set());
      showAlert("success", "Album updated. Redirecting to the detail page...");
      setTimeout(() => router.push(`/albums/${albumId}`), 900);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update album";
      showAlert("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddImages = (files: File[]) => {
    if (files.length === 0) return;

    const keptImagesCount = images.filter((img) => !imagesToRemove.has(img.storage_path)).length;
    const totalWithNew = keptImagesCount + pendingUploads.length + files.length;

    if (totalWithNew > MAX_FILES) {
      showAlert(
        "error",
        `You can only keep up to ${MAX_FILES} images in this album. Remove some before adding more.`
      );
      return;
    }

    const newUploads = files.map((file) => ({
      id: createUid(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingUploads((prev) => [...prev, ...newUploads]);
  };

  const handleToggleExistingImage = (storagePath: string) => {
    setImagesToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(storagePath)) {
        next.delete(storagePath);
      } else {
        next.add(storagePath);
      }
      return next;
    });
  };

  const handleRemovePendingUpload = (id: string) => {
    setPendingUploads((prev) => {
      const target = prev.find((upload) => upload.id === id);
      if (target) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((upload) => upload.id !== id);
    });
  };

  const handleDeleteAlbum = async () => {
    if (!user) {
      showAlert("error", "You must be signed in to delete this album.");
      return;
    }
    const confirmed = window.confirm(
      "Are you sure you want to delete this album? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setIsDeletingAlbum(true);
      await albumService.deleteAlbumWithStorage(albumId);
      pendingUploadsRef.current.forEach((upload) => URL.revokeObjectURL(upload.preview));
      setPendingUploads([]);
      setImagesToRemove(new Set());
      showAlert("success", "Album deleted. Redirecting to your dashboard...");
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete album";
      showAlert("error", message);
      setIsDeletingAlbum(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Edit album</p>
            <h1 className="text-3xl font-semibold text-slate-900">{title || `Album #${albumId}`}</h1>
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
              <AlertBanner type={alert.type} message={alert.message} className="mb-4" />
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
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-1">
                <Label>Privacy</Label>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="privacy"
                      value="public"
                      checked={privacy === "public"}
                      onChange={() => setPrivacy("public")}
                    />
                    Public
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="privacy"
                      value="private"
                      checked={privacy === "private"}
                      onChange={() => setPrivacy("private")}
                    />
                    Private
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={isSubmitting || isDeletingAlbum}>
                  {isSubmitting ? "Saving..." : "Save changes"}
                </Button>
                <Link href={`/albums/${albumId}`} className={LINK_CLASSES}>
                  Discard
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  className="border border-transparent text-red-600 hover:bg-red-50"
                  onClick={handleDeleteAlbum}
                  disabled={isSubmitting || isDeletingAlbum}
                >
                  {isDeletingAlbum ? "Deleting..." : "Delete album"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>Add or remove images in this album.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload onSelect={handleAddImages} />
            {(pendingUploads.length > 0 || imagesToRemove.size > 0) && (
              <p className="text-xs text-slate-500">
                Changes to images are staged and will be applied when you save this album.
              </p>
            )}
            {images.length === 0 && pendingUploads.length === 0 && (
              <p className="text-sm text-slate-500">This album does not have any images yet.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {images.map((img) => {
                const isMarkedForRemoval = imagesToRemove.has(img.storage_path);
                return (
                  <div
                    key={img.storage_path}
                    className={cn("relative aspect-square", isMarkedForRemoval && "opacity-70")}
                  >
                    {img.url ? (
                      <Image src={img.url} alt="Album image" fill className="rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
                        Missing image
                      </div>
                    )}
                    {isMarkedForRemoval && (
                      <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                        Pending removal
                      </span>
                    )}
                    <button
                      type="button"
                      className={cn(
                        "absolute right-2 top-2 rounded px-2 py-1 text-xs font-medium shadow",
                        isMarkedForRemoval
                          ? "bg-white/90 text-slate-800 hover:bg-white"
                          : "bg-white/90 text-red-700 hover:bg-white"
                      )}
                      onClick={() => handleToggleExistingImage(img.storage_path)}
                    >
                      {isMarkedForRemoval ? "Undo" : "Remove"}
                    </button>
                  </div>
                );
              })}
              {pendingUploads.map((upload) => (
                <div key={upload.id} className="relative aspect-square">
                  <Image
                    src={upload.preview}
                    alt="Pending upload"
                    fill
                    unoptimized
                    className="rounded-lg object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                    Pending upload
                  </span>
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-xs font-medium text-red-700 shadow hover:bg-white"
                    onClick={() => handleRemovePendingUpload(upload.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
