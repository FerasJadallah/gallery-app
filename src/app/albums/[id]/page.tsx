"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { albumService } from "@/lib/albumService";
import { useAuth } from "@/contexts/AuthContext";
import { LoadedAlbumState } from "@/types";

const buttonStyles = {
  primary: "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800",
  secondary: "inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-white"
} as const;

type State = LoadedAlbumState | { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string };

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params?.id as string;
  const { user } = useAuth();
  const [state, setState] = useState<State>({ kind: "idle" });

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!albumId) return;
      setState({ kind: "loading" });
      try {
        const { album, images } = await albumService.getAlbumWithImages(albumId);
        if (album.privacy !== "public" && album.user_id !== user?.id) {
          throw new Error("You do not have access to this private album.");
        }
        if (ignore) return;
        setState({ kind: "loaded", album, images });
      } catch (error: unknown) {
        if (ignore) return;
        const message = error instanceof Error ? error.message : "Failed to load album";
        setState({ kind: "error", message });
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [albumId, user?.id]);

  const coverUrl = state.kind === "loaded"
    ? (() => {
        if (state.album.signed_cover_url) {
          return state.album.signed_cover_url;
        }
        const albumCoverPath = state.album.cover_url;
        const coverFromAlbum = albumCoverPath
          ? state.images.find((image) => image.storage_path === albumCoverPath)?.url
          : null;
        if (coverFromAlbum) return coverFromAlbum;
        const preferred = state.images.find((image) => image.display_order === 0) ?? state.images[0];
        return preferred?.url ?? null;
      })()
    : null;

  if (state.kind === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">{state.message}</p>
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading album...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Album</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {state.kind === "loaded" ? state.album.title || `Album #${albumId}` : `Album #${albumId}`}
            </h1>
            {state.kind === "loaded" && (
              <>
                <p className="text-sm text-slate-600">{state.album.description ?? ""}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Created by {(() => {
                    const creator = state.album.profiles;
                    if (creator?.username || creator?.full_name) {
                      return creator.username ?? creator.full_name;
                    }
                    if (user && user.id === state.album.user_id) {
                      return user.user_metadata?.username || user.user_metadata?.full_name || user.email;
                    }
                    return "the owner";
                  })()}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className={buttonStyles.secondary}>
              Back to dashboard
            </Link>
            {state.kind === "loaded" && state.album.user_id === user?.id && (
              <Link href={`/albums/${albumId}/edit`} className={buttonStyles.primary}>
                Edit album
              </Link>
            )}
          </div>
        </header>

        {state.kind === "loaded" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Album overview</CardTitle>
                <CardDescription>
                  {new Date(state.album.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })} · {" "}
                  {state.album.privacy === "public" ? "Public" : "Private"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="relative h-40 w-full overflow-hidden rounded-lg bg-slate-100 sm:col-span-1">
                  {coverUrl ? (
                    <Image src={coverUrl} alt={state.album.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">No cover</div>
                  )}
                </div>
                <div className="sm:col-span-2 space-y-2 text-sm text-slate-600">
                  <p>{state.album.description ?? "No description"}</p>
                </div>
              </CardContent>
            </Card>

            <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {state.images.length === 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  This album has no images yet.
                </div>
              )}
              {state.images.map((img) => (
                <div
                  key={img.storage_path}
                  className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100"
                >
                  {img.url ? (
                    <Image src={img.url} alt="Album image" fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                      Missing image
                    </div>
                  )}
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
