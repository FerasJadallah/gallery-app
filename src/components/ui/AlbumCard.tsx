"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  id: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  href?: string;
  creator?: {
    username: string | null;
    full_name: string | null;
  } | null;
};

export default function AlbumCard({ id, title, description, coverUrl, href, creator }: Props) {
  const link = href ?? `/albums/${id}`;
  return (
<div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
<div className="relative h-48 w-full bg-slate-100">
{coverUrl ? (
<Image src={coverUrl} alt={title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" priority={false} />
) : (
<div className="flex h-full w-full items-center justify-center text-slate-400">
No cover
</div>
)}
</div>
<div className="space-y-1 p-4">
  <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{title}</h3>
  {description && (
    <p className="line-clamp-2 text-sm text-slate-600">{description}</p>
  )}
  <div className="flex justify-between items-center">
    <Link href={link} className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline">
      View album →
    </Link>
    {creator?.username && (
      <p className="text-sm text-slate-500">Created by @{creator.username}</p>
    )}
  </div>
</div>
</div>
);
}