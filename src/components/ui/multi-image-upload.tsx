"use client";

import { useRef, useState } from "react";

export type ImageEntry = { path: string; isMain: boolean };

// Multi-image uploader for entity forms. Uploads files to /api/upload
// one at a time, manages sort order and "main" flag, and stores the full
// list as a JSON string in a hidden input so the surrounding form can submit
// it as a single field named `imageGallery`.
//
// For best appearance in this dark theme, upload transparent PNGs. JPEG
// images with white backgrounds will appear as a white photo inside the
// dark-bordered preview frame — still identifiable.
export function MultiImageUpload({
  defaultImages = [],
}: {
  defaultImages?: ImageEntry[];
}) {
  const [images, setImages] = useState<ImageEntry[]>(defaultImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);
    const added: ImageEntry[] = [];
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = (await res.json()) as { path?: string; error?: string };
        if (!res.ok) {
          setError(json.error ?? "Upload failed");
          break;
        } else if (json.path) {
          added.push({ path: json.path, isMain: false });
        }
      } catch {
        setError("Upload failed");
        break;
      }
    }
    setImages((prev) => {
      const next = [...prev, ...added];
      // If no main is set yet, promote the first image.
      const hasMain = next.some((i) => i.isMain);
      return hasMain ? next : next.map((i, idx) => ({ ...i, isMain: idx === 0 }));
    });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function setMain(idx: number) {
    setImages((prev) => prev.map((img, i) => ({ ...img, isMain: i === idx })));
  }

  function remove(idx: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Re-promote first if we removed the main.
      const hadMain = prev[idx]?.isMain;
      if (hadMain && next.length > 0) {
        return next.map((img, i) => ({ ...img, isMain: i === 0 }));
      }
      return next;
    });
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setImages((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx: number) {
    setImages((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden JSON payload consumed by the server action */}
      <input type="hidden" name="imageGallery" value={JSON.stringify(images)} />

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-text-dim">
          Images
        </span>
        <span className="text-[11px] text-faint">
          Transparent PNG recommended
        </span>
      </div>

      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          {images.map((img, idx) => (
            <div
              key={img.path}
              className="flex items-center gap-2 rounded-md border border-border bg-panel-2 p-1.5"
            >
              {/* Thumbnail */}
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded border border-border/50 bg-panel">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.path}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Controls */}
              <div className="flex flex-1 items-center gap-1.5">
                {/* Star = mark as main */}
                <button
                  type="button"
                  onClick={() => setMain(idx)}
                  title={img.isMain ? "Main image" : "Set as main image"}
                  className={`rounded px-1.5 py-1 text-sm transition-colors ${
                    img.isMain
                      ? "text-yellow-400"
                      : "text-text-dim hover:text-yellow-400"
                  }`}
                >
                  ★
                </button>
                <span className="flex-1 truncate text-[11px] text-text-dim">
                  {img.isMain && (
                    <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                      Main
                    </span>
                  )}
                  {img.path.split("/").pop()}
                </span>
                {/* Reorder */}
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="rounded px-1 py-0.5 text-[11px] text-text-dim transition-colors hover:text-text disabled:opacity-30"
                  title="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx === images.length - 1}
                  className="rounded px-1 py-0.5 text-[11px] text-text-dim transition-colors hover:text-text disabled:opacity-30"
                  title="Move down"
                >
                  ▼
                </button>
                {/* Remove */}
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="rounded border border-transparent px-1.5 py-0.5 text-[11px] text-text-dim transition-colors hover:border-red-500/50 hover:text-red-400"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="inline-flex w-fit cursor-pointer items-center rounded-md border border-border bg-panel px-3 py-2 text-sm text-text hover:border-accent hover:text-accent">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
            disabled={uploading}
          />
          {uploading ? "Uploading…" : images.length > 0 ? "Add more images" : "Choose images"}
        </label>
        {error && (
          <p className="text-[11.5px] text-red-400" role="alert">
            {error}
          </p>
        )}
        <p className="text-[11px] text-faint">PNG / JPG / GIF / WebP, max 5 MB each.</p>
      </div>
    </div>
  );
}
