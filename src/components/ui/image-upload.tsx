"use client";

import { useRef, useState } from "react";

// Inline image picker used in every entity form. Uploads to /api/upload as
// soon as a file is chosen, stores the returned path in a hidden field so
// the surrounding form submits it like any other text value. Shows a
// preview + remove button once an image is set.
export function ImageUpload({
  name,
  defaultValue,
  label = "Image",
  hint,
}: {
  name: string;
  defaultValue?: string | null;
  label?: string;
  hint?: string;
}) {
  const [path, setPath] = useState<string>(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { path?: string; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
      } else if (json.path) {
        setPath(json.path);
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function clear() {
    setPath("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-text-dim">
          {label}
        </span>
        {hint && (
          <span className="text-[11px] text-faint">{hint}</span>
        )}
      </div>
      <input type="hidden" name={name} value={path} />
      <div className="flex items-start gap-3">
        {path ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={path}
              alt=""
              className="h-32 w-32 rounded-md border border-border object-cover"
            />
            <button
              type="button"
              onClick={clear}
              className="absolute right-1 top-1 rounded-md border border-border bg-bg/80 px-1.5 py-0.5 text-[10px] font-bold text-text hover:border-red-400 hover:text-red-400"
              title="Remove image"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed border-border bg-panel-2 text-[11px] text-faint">
            No image
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="inline-flex w-fit cursor-pointer items-center rounded-md border border-border bg-panel px-3 py-2 text-sm text-text hover:border-accent hover:text-accent">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && handleFile(e.target.files[0])
              }
              disabled={uploading}
            />
            {uploading
              ? "Uploading…"
              : path
                ? "Replace image"
                : "Choose image"}
          </label>
          {error && (
            <p className="text-[11.5px] text-red-400" role="alert">
              {error}
            </p>
          )}
          <p className="text-[11px] text-faint">PNG / JPG / GIF / WebP, max 5MB.</p>
        </div>
      </div>
    </div>
  );
}
