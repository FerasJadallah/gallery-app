"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { supabase } from "@/app/supabase/client";
import { albumService } from "@/lib/albumService";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AlbumCard from "@/components/ui/AlbumCard";
import { Input } from "@/components/ui/input";

const BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800";

export default function PublicFeedPage() {
  const [albums, setAlbums] = useState<any[] | null>(null);
  const [q, setQ] = useState("");

  useState(() => {
    albumService
      .getPublicAlbumsWithCreators()
      .then((data) => setAlbums(data))
      .catch((e) => console.error("Error loading albums:", e?.message));
  });

  const filtered = useMemo(() => {
    if (!albums) return [];
    const term = q.trim().toLowerCase();
    if (!term) return albums;
    return albums.filter((a) => (a.title || "").toLowerCase().includes(term));
  }, [albums, q]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <header className="space-y-5 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Discover</p>
          <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
            Explore galleries curated by photographers around the world
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-600">
            Browse featured albums, follow creators you love, and start building your own collection.
          </p>
          <div className="mx-auto flex w-full max-w-md flex-col items-stretch gap-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search albums by title..."
            />
          </div>
        </header>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((album) => {
            // Prefer image with display_order === 0, else fallback to first
            const images = Array.isArray(album.album_images) ? album.album_images : [];
            const preferred = images.find((img: any) => img.display_order === 0) ?? images[0];
            const coverPath = preferred?.storage_path;
            const publicUrl = coverPath
              ? supabase.storage.from("album-images").getPublicUrl(coverPath).data.publicUrl
              : null;
            return (
              <AlbumCard
                key={album.id}
                id={album.id}
                title={album.title}
                description={album.description}
                coverUrl={publicUrl}
              />
            );
          })}
        </section>
      </section>
    </main>
  );
}
