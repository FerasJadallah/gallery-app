import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 px-6 py-20 text-center md:flex-row md:text-left">
        <div className="flex-1 space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Gallery App
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Share your work with the world.
          </h1>
          <p className="text-base text-slate-600 sm:text-lg">
            Create an account to upload, organize, and showcase your best pieces with ease.
          </p>
          <div className="flex flex-col items-center justify-start gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
            >
              Create your account
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-white sm:w-auto"
            >
              Already registered? Log in
            </Link>
          </div>
        </div>
        <div className="flex-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-square rounded-lg bg-slate-100" />
            <div className="aspect-square rounded-lg bg-slate-200" />
            <div className="col-span-2 aspect-[3/2] rounded-lg bg-slate-300" />
          </div>
        </div>
      </div>
    </main>
  );
}
