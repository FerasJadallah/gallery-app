"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PRIMARY_BUTTON = "inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800";
const SECONDARY_BUTTON = "inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-white";

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params?.id as string;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">Album</p>
            <h1 className="text-3xl font-semibold text-slate-900">Album #{albumId}</h1>
            <p className="text-sm text-slate-600">
              This is a placeholder detail view. Replace with real album metadata and your media grid.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className={SECONDARY_BUTTON}>
              Back to dashboard
            </Link>
            <Link href={`/albums/${albumId}/edit`} className={PRIMARY_BUTTON}>
              Edit album
            </Link>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Album overview</CardTitle>
            <CardDescription>Coming soon: stats, cover, and collaborators.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Placeholder for cover image
            </div>
            <div className="col-span-2 space-y-2 text-sm text-slate-600">
              <p>
                Use this space to outline album details, descriptions, and any additional metadata you
                want to surface for users.
              </p>
              <p className="text-xs text-slate-500">
                Update this UI once the Supabase tables and storage buckets are in place.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
