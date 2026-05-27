"use client";

import { useState, useTransition } from "react";
import { saveAsPreset } from "@/app/(app)/assets/actions";
import { Button } from "@/components/ui/button";

export function SaveAsPresetButton({
  assetId,
  defaultName,
}: {
  assetId: string;
  defaultName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [tags, setTags] = useState("");
  const [result, setResult] = useState<{ ok: boolean; error?: string; slug?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await saveAsPreset(assetId, name, tags);
      setResult(res);
      if (res.ok) {
        setTimeout(() => {
          setOpen(false);
          setResult(null);
        }, 2000);
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Save as preset
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[#2d333b] bg-[#161b22] p-3 text-[12px]">
      <p className="font-bold text-text-dim">Save as custom preset</p>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-text-dim">Preset name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          className="rounded border border-[#2d333b] bg-[#0d1117] px-2 py-1 text-[12px] text-text focus:border-accent/60 focus:outline-none disabled:opacity-50"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-text-dim">Tags (comma-separated, optional)</span>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. server, 2u, dell"
          disabled={isPending}
          className="rounded border border-[#2d333b] bg-[#0d1117] px-2 py-1 text-[12px] text-text placeholder:text-text-dim focus:border-accent/60 focus:outline-none disabled:opacity-50"
        />
      </label>

      {result && (
        <p className={`text-[11px] font-bold ${result.ok ? "text-status-green" : "text-red-400"}`}>
          {result.ok ? `Saved to presets/custom/assets/${result.slug}/` : result.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="primary" onClick={handleSave} disabled={isPending || !name.trim()}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" onClick={() => { setOpen(false); setResult(null); }} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
