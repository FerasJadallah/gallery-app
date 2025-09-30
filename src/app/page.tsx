import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/app/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800";

export default async function PublicFeedPage() {
  const { data: albums, error } = await supabase
    .from("albums")
    .select("id, title, description, album_images(storage_path)")
    .eq("privacy", "public")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading albums:", error.message);
  }

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
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={BUTTON_CLASSES}>
              Create your account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-white"
            >
              Already registered? Log in
            </Link>
          </div>
        </header>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {albums?.map((album) => {
            const coverPath = album.album_images?.[0]?.storage_path;
            const publicUrl = coverPath
              ? supabase.storage.from("albums").getPublicUrl(coverPath).data.publicUrl
              : null;

            return (
              <Card key={album.id} className="overflow-hidden">
                <div className="relative h-48 w-full overflow-hidden bg-slate-200">
                  {publicUrl && (
                    <Image
                      src={publicUrl}
                      alt={album.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-300 hover:scale-105"
                      priority={false}
                    />
                  )}
                </div>
                <CardHeader>
                  <CardTitle>{album.title}</CardTitle>
                  <CardDescription>{album.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/albums/${album.id}`}
                    className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
                  >
                    View album →
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </section>
      </section>
    </main>
  );
}
