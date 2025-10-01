"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

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
import { supabase } from "@/app/supabase/client";
import { AlbumImage } from "@/types";

const LINK_CLASSES = "inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-white";

export default function EditAlbumPage() {
  const params = useParams();
  const albumId = params?.id as string;
  const { alert, showAlert, clearAlert } = useAlert();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("private");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [uploading, setUploading] = useState(false);

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
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load album";
        showAlert("error", message);
      }
    };
    if (!loading && albumId) void run();
  }, [albumId, loading, router, showAlert, user]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearAlert();

    if (!title.trim()) {
      showAlert("error", "Album title cannot be empty.");
      return;
    }

    try {
      setIsSubmitting(true);
      await albumService.updateAlbum(albumId, {
        title: title.trim(),
        description: description.trim() || null,
        privacy,
      });
      showAlert("success", "Album updated. Redirecting to the detail page...");
      setTimeout(() => router.push(`/albums/${albumId}`), 900);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update album";
      showAlert("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddImages = async (files: File[]) => {
    if (!user) return;
    try {
      setUploading(true);
      const uploaded: { path: string }[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${albumId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("album-images")
          .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        uploaded.push({ path });
      }
      const start = images.length > 0 ? Math.max(...images.map((i) => i.display_order)) + 1 : 0;
      await albumService.addImagesToAlbum(
        albumId,
        uploaded.map((u, idx) => ({ storage_path: u.path, display_order: start + idx }))
      );
      const { images: refreshed } = await albumService.getAlbumWithImages(albumId);
      setImages(refreshed ?? []);
      showAlert("success", "Images added");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add images";
      showAlert("error", message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (storagePath: string) => {
    try {
      const { error: removeErr } = await supabase.storage.from("album-images").remove([storagePath]);
      if (removeErr) throw removeErr;
      const { error: dbErr } = await supabase
        .from("album_images")
        .delete()
        .eq("album_id", albumId)
        .eq("storage_path", storagePath);
      if (dbErr) throw dbErr;
      setImages((prev) => prev.filter((i) => i.storage_path !== storagePath));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete image";
      showAlert("error", message);
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
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>Add or remove images in this album.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload onSelect={(files) => void handleAddImages(files)} />
            {uploading && <p className="text-sm text-slate-600">Uploading...</p>}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {images.map((img) => {
                const url = supabase.storage.from("album-images").getPublicUrl(img.storage_path).data.publicUrl;
                return (
                  <div key={img.storage_path} className="relative aspect-square">
                    {url ? (
                      <Image
                        src={url}
                        alt="Album image"
                        fill
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
                        Missing image
                      </div>
                    )}
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded bg-white/80 px-2 py-1 text-xs text-red-700 shadow hover:bg-white"
                      onClick={() => void handleDeleteImage(img.storage_path)}
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
