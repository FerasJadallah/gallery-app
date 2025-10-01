export default function LoadingAlbum() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-40 w-full animate-pulse rounded bg-slate-200" />
          <div className="space-y-3 sm:col-span-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square w-full animate-pulse rounded bg-slate-200" />
          ))}
        </div>
      </div>
    </main>
  );
}

