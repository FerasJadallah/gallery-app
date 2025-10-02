"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { albumService, type AlbumPreview } from "@/lib/albumService";
import AlbumCard from "@/components/ui/AlbumCard";
import { getSupabaseClient } from "@/app/supabase/client";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAlert } from "@/hooks/use-alert";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800";

type Album = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  coverUrl: string | null;
  privacy: "public" | "private";
  creator: {
    username: string | null;
    full_name: string | null;
  } | null;
};

type FetchState = "idle" | "loading" | "success" | "error";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const { alert, showAlert, clearAlert } = useAlert();

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    }

    fetchProfile();
  }, [supabase, user?.id]);

  const displayName = profile?.full_name || user?.email || "";

  const [albums, setAlbums] = useState<Album[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAlbums = useCallback(async () => {
    if (!user) return;

    setFetchState("loading");
    clearAlert();

    try {
      // Use service with creator profiles
      const data = await albumService.getUserAlbumsWithCreators(user.id);

      const parsed: Album[] = data.map((row: AlbumPreview) => {
        const images = row.album_images ?? [];
        const preferred = images.find((image) => image.display_order === 0) ?? images[0];
        const coverPath = preferred?.storage_path;
        const coverUrl = coverPath
          ? supabase.storage.from("album-images").getPublicUrl(coverPath).data.publicUrl
          : null;
        return {
          id: row.id,
          title: row.title ?? "Untitled album",
          description: row.description ?? null,
          createdAt: row.created_at,
          coverUrl,
          privacy: row.privacy === "public" ? "public" : "private",
          creator: row.profiles
            ? {
                username: row.profiles.username,
                full_name: row.profiles.full_name,
              }
            : null,
        };
      });

      setAlbums(parsed);
      setFetchState("success");
    } catch (error: unknown) {
      console.error("Failed to load albums", error);
      setFetchState("error");
      const message = error instanceof Error ? error.message : "We couldn't load your albums. Please try again.";
      showAlert("error", message);
      return;
    }

  }, [clearAlert, showAlert, supabase, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!authLoading && user) {
      void loadAlbums();
    }
  }, [authLoading, loadAlbums, user]);

  const handleRefresh = () => {
    void loadAlbums();
  };

  const handleDeleteAlbum = useCallback(
    async (albumId: string) => {
      if (!user) {
        showAlert("error", "You must be signed in to delete an album.");
        return;
      }

      const confirmed = window.confirm(
        "Are you sure you want to delete this album? This action cannot be undone."
      );
      if (!confirmed) return;

      setDeletingId(albumId);

      try {
        await albumService.deleteAlbumWithStorage(albumId);
        setAlbums((prev) => prev.filter((album) => album.id !== albumId));
        showAlert("success", "Album deleted.");
      } catch (error: unknown) {
        console.error("Failed to delete album", error);
        const message = error instanceof Error ? error.message : "Failed to delete album. Please try again.";
        showAlert("error", message);
      } finally {
        setDeletingId(null);
      }
    },
    [showAlert, user]
  );

  const isLoading = fetchState === "loading" || (authLoading && fetchState === "idle");
  const showEmptyState = fetchState === "success" && albums.length === 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">My albums</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Welcome back{displayName ? `, ${displayName}` : ""}
            </h1>
            <p className="text-sm text-slate-600">Create albums to organize and share your work.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? "Refreshing" : "Refresh"}
            </Button>
            <Link href="/albums/create" className={PRIMARY_BUTTON_CLASSES}>
              Create album
            </Link>
          </div>
        </header>

        {alert && <AlertBanner type={alert.type} message={alert.message} />}

        {isLoading && (
          <Card>
            <CardContent className="space-y-4 py-10">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-slate-200" />
            </CardContent>
          </Card>
        )}

        {showEmptyState && (
          <Card>
            <CardHeader>
              <CardTitle>You do not have any albums yet</CardTitle>
              <CardDescription>Start by creating your first album.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-3">
              <p className="text-sm text-slate-600">Albums keep your photos organized and easy to share.</p>
              <Link href="/albums/create" className={PRIMARY_BUTTON_CLASSES}>
                Create album
              </Link>
            </CardContent>
          </Card>
        )}

        {fetchState === "success" && albums.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {albums.map((album) => (
              <div key={album.id} className="space-y-2">
                <AlbumCard
                  id={album.id}
                  title={album.title}
                  description={album.description}
                  coverUrl={album.coverUrl}
                  href={`/albums/${album.id}`}
                  creator={album.creator}
                />
                <div className="flex gap-3">
                  <Button
                    asChild
                    variant="secondary"
                    className={deletingId === album.id ? "pointer-events-none opacity-60" : undefined}
                  >
                    <Link href={`/albums/${album.id}/edit`}>Edit</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="border border-transparent text-red-600 hover:bg-red-50"
                    onClick={() => void handleDeleteAlbum(album.id)}
                    disabled={deletingId === album.id}
                  >
                    {deletingId === album.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
