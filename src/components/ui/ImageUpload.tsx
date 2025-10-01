"use client";

import { ChangeEvent, useState } from "react";

type Props = {
  onSelect: (files: File[]) => void;
  maxFiles?: number;
};

export default function ImageUpload({ onSelect, maxFiles = 5 }: Props) {
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    
    if (selected.length === 0) return;
    
    if (selected.length > maxFiles) {
      setError(`You can upload up to ${maxFiles} images.`);
      return;
    }

    // Validate file types
    const invalidFiles = selected.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setError('Please select only image files.');
      return;
    }

    // Validate file sizes (5MB limit)
    const oversizedFiles = selected.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('Each image must be smaller than 5MB.');
      return;
    }

    setError("");
    onSelect(selected);
    e.currentTarget.value = "";
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="block w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}