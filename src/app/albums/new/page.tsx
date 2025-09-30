"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { z } from "zod";
import slugify from "slugify";

import { supabase } from "@/app/supabase/client";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAlert } from "@/hooks/use-alert";
import { useAuth } from "@/contexts/AuthContext";

const MAX_FILES = 5;
const ALBUM_IMAGES_BUCKET = "album-images";

// Enhanced schema with slug generation
const albumSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string(),
  description: z.string().max(500, "Description is too long").optional().or(z.literal("")),
  privacy: z.enum(["public", "private"], {
    errorMap: () => ({ message: "Please select a privacy setting" }),
  }),
  files: z
    .array(
      z.instanceof(File)
        .refine((file) => file.type.startsWith("image/"), {
          message: "Only image files are supported",
        })
        .refine((file) => file.size <= 5 * 1024 * 1024, {
          message: "Images must be 5MB or smaller",
        })
    )
    .min(1, "At least one image is required")
    .max(MAX_FILES, `You can upload up to ${MAX_FILES} images.`),
});

type FormErrors = Partial<Record<"title" | "description" | "privacy" | "files", string>>;
type UploadProgress = Record<string, number>;

export default function CreateAlbumPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { alert, showAlert, clearAlert } = useAlert();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("private");
  const [files, setFiles] = useState<File[]>([]);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});

  const isOverFileLimit = useMemo(() => files.length > MAX_FILES, [files.length]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    const selected = Array.from(event.target.files);
    const nextFiles = [...files, ...selected].slice(0, MAX_FILES);

    if (files.length + selected.length > MAX_FILES) {
      showAlert("error", `You can upload up to ${MAX_FILES} images.`);
    }

    setFiles(nextFiles);
    setErrors((prev) => ({ ...prev, files: undefined }));

    // Set cover preview for the first image
    if (!coverPreview && nextFiles[0]) {
      const previewUrl = URL.createObjectURL(nextFiles[0]);
      setCoverPreview(previewUrl);
    }

    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (index === 0) {
        // Update cover preview if first image is removed
        URL.revokeObjectURL(coverPreview);
        setCoverPreview(updated[0] ? URL.createObjectURL(updated[0]) : "");
      }
      return updated;
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      showAlert("error", "You must be signed in to create an album.");
      return;
    }

    clearAlert();
    setErrors({});

    const slug = slugify(title.toLowerCase(), { strict: true });

    try {
      const parsed = albumSchema.parse({
        title: title.trim(),
        slug,
        description: description.trim(),
        privacy,
        files,
      });

      setIsSubmitting(true);
      setUploadProgress({});

      // Create album record
      const { data: albumInsert, error: albumError } = await supabase
        .from("albums")
        .insert({
          user_id: user.id,
          title: parsed.title,
          slug: parsed.slug,
          description: parsed.description || null,
          privacy: parsed.privacy,
        })
        .select("id")
        .single();

      if (albumError || !albumInsert) {
        throw new Error(albumError?.message || "Failed to create album");
      }

      const albumId = albumInsert.id;
      const uploadedPhotos: { url: string; path: string }[] = [];

      // Upload images
      for (const file of parsed.files) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${albumId}/${crypto.randomUUID()}.${fileExt}`;

        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        const { error: uploadError } = await supabase.storage
          .from(ALBUM_IMAGES_BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
          .from(ALBUM_IMAGES_BUCKET)
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          uploadedPhotos.push({ url: publicUrlData.publicUrl, path: filePath });
          setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        }
      }

      // Create photo records and update album cover
      if (uploadedPhotos.length > 0) {
        const { error: photosError } = await supabase
          .from("album_images") // Changed from "photos" to "album_images" to match your schema
          .insert(
            uploadedPhotos.map((photo) => ({
              album_id: albumId,
              storage_path: photo.path,
              display_order: 0, // Add this as it's required in your schema
            }))
          );

        if (photosError) {
          console.error("Photos error:", photosError);
          throw new Error("Failed to create photo records");
        }
      }

      showAlert("success", "Album created successfully!");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (error) {
      console.error("Album creation error:", error);
      showAlert("error", error instanceof Error ? error.message : "Failed to create album");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Albums</p>
          <h1 className="text-3xl font-semibold text-slate-900">Create album</h1>
          <p className="text-sm text-slate-600">
            Give your album a title, choose who can see it, and upload up to five images.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Album details</CardTitle>
            <CardDescription>Describe the collection you are about to build.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {alert && <AlertBanner variant={alert.type} message={alert.message} />}

            <form className="space-y-6" onSubmit={onSubmit}>
              {/* Title field */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder="Summer Collection"
                  required
                  hasError={Boolean(errors.title)}
                />
                {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
              </div>

              {/* Description field */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Optional summary for your album"
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
                {errors.description && (
                  <p className="text-xs text-red-600">{errors.description}</p>
                )}
              </div>

              {/* Privacy field */}
              <div className="space-y-2">
                <Label>Privacy</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      value: "public",
                      title: "Public",
                      description: "Anyone with the link can view this album.",
                    },
                    {
                      value: "private",
                      title: "Private",
                      description: "Only you can view this album.",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300"
                    >
                      <input
                        type="radio"
                        name="privacy"
                        value={option.value}
                        checked={privacy === option.value}
                        onChange={() => {
                          setPrivacy(option.value as "public" | "private");
                          setErrors((prev) => ({ ...prev, privacy: undefined }));
                        }}
                      />
                      <span>
                        <span className="block font-medium">{option.title}</span>
                        <span className="text-xs text-slate-500">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.privacy && <p className="text-xs text-red-600">{errors.privacy}</p>}
              </div>

              {/* Image upload field */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="images">Images</Label>
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    hasError={Boolean(errors.files) || isOverFileLimit}
                  />
                  <p className="text-xs text-slate-500">
                    Upload up to {MAX_FILES} images (PNG, JPG, WebP). Each must be 5MB or smaller.
                  </p>
                  {errors.files && <p className="text-xs text-red-600">{errors.files}</p>}
                </div>

                {/* Cover preview */}
                {coverPreview && (
                  <div className="space-y-2">
                    <Label>Cover Preview</Label>
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200">
                      <img
                        src={coverPreview}
                        alt="Album cover preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* File list */}
                {files.length > 0 && (
                  <ul className="space-y-2 text-sm text-slate-600">
                    {files.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate" title={file.name}>
                            {file.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeFile(index)}
                            disabled={isSubmitting}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                        {uploadProgress[file.name] !== undefined && (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-slate-900 transition-all duration-300"
                              style={{ width: `${uploadProgress[file.name]}%` }}
                            />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating album..." : "Create album"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
