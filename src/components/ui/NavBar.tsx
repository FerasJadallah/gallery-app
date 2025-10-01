"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function NavBar() {
  const { user } = useAuth();
  return (
    <nav className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={"/"} className="text-base font-semibold text-slate-900">
          Gallery
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/albums/create" className="text-slate-700 hover:text-slate-900">
                Create album
              </Link>
              <Link href="/dashboard" className="text-slate-700 hover:text-slate-900">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-700 hover:text-slate-900">
                Log in
              </Link>
              <Link href="/signup" className="text-slate-700 hover:text-slate-900">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
