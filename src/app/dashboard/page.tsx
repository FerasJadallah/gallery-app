"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/app/supabase/client";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800";

const BADGE_BASE = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
const BADGE_VARIANTS = {
  public: "bg-emerald-100 text-emerald-700",
  private: "bg-slate-200 text-slate-700",
} as const;

type Album = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  coverUrl: string | null;
  privacy: "public" | "private";
};

type FetchState = "idle" | "loading" | "success" | "error";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadAlbums = useCallback(async () => {
    if (!user) return;

    setFetchState("loading");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("albums")
      .select("id, title, description, created_at, privacy, cover_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load albums", error);
      setFetchState("error");
      setErrorMessage(error.message || "We couldn't load your albums. Please try again.");
      return;
    }

    const parsed: Album[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title ?? "Untitled album",
      description: row.description ?? null,
      createdAt: row.created_at,
      coverUrl: typeof row.cover_url === "string" ? row.cover_url : null,
      privacy: row.privacy === "public" ? "public" : "private",
    }));

    setAlbums(parsed);
    setFetchState("success");
  }, [user]);

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

  const isLoading = fetchState === "loading" || (authLoading && fetchState === "idle");
  const showEmptyState = fetchState === "success" && albums.length === 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">My albums</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Welcome back{user ? `, ${user.email}` : ""}
            </h1>
            <p className="text-sm text-slate-600">Create albums to organize and share your work.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? "Refreshing" : "Refresh"}
            </Button>
            <Link href="/albums/new" className={PRIMARY_BUTTON_CLASSES}>
              Create album
            </Link>
          </div>
        </header>

        {errorMessage && <AlertBanner variant="error" message={errorMessage} />}

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
              <Link href="/albums/new" className={PRIMARY_BUTTON_CLASSES}>
                Create album
              </Link>
            </CardContent>
          </Card>
        )}

        {fetchState === "success" && albums.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {albums.map((album) => (
              <Card key={album.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="truncate">{album.title}</CardTitle>
                    <span className={`${BADGE_BASE} ${BADGE_VARIANTS[album.privacy]}`}>
                      {album.privacy === "public" ? "Public" : "Private"}
                    </span>
                  </div>
                  {album.description && (
                    <CardDescription className="line-clamp-2">{album.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm text-slate-600">
                  <p>
                    Created{" "}
                    {new Date(album.createdAt).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </p>
                  <div className="flex gap-3">
                    <Button asChild variant="ghost">
                      <Link href={`/albums/${album.id}`}>View album</Link>
                    </Button>
                    <Button asChild variant="secondary">
                      <Link href={`/albums/${album.id}/edit`}>Edit</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
