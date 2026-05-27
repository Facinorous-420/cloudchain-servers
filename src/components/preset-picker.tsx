"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { PresetMeta } from "@/lib/presets";
import { ASSET_CATEGORIES } from "@/lib/enums";

const CATEGORY_COLORS: Record<string, string> = {
  SERVER: "#3fb950",
  SWITCH: "#3b82f6",
  PATCH_PANEL: "#3b82f6",
  GATEWAY: "#c678dd",
  FIREWALL: "#c678dd",
  UPS: "#d9a441",
  PDU: "#7c8794",
  KVM: "#e0823d",
  ACCESS_POINT: "#00a8c6",
  NUC: "#3fb950",
  SBC: "#3fb950",
  SHELF: "#7c8794",
  DRAWER: "#7c8794",
  BLANK_PANEL: "#7c8794",
  OTHER: "#7c8794",
};

function categoryLabel(cat: string): string {
  return cat.replace(/_/g, " ");
}

function FallbackIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 opacity-40">
      <rect x="4" y="8" width="32" height="6" rx="1" fill={color} />
      <rect x="4" y="17" width="32" height="6" rx="1" fill={color} />
      <rect x="4" y="26" width="32" height="6" rx="1" fill={color} />
      <circle cx="32" cy="11" r="1.5" fill="#0d1117" />
      <circle cx="32" cy="20" r="1.5" fill="#0d1117" />
      <circle cx="32" cy="29" r="1.5" fill="#0d1117" />
    </svg>
  );
}

function PresetCard({ preset, onSelect }: { preset: PresetMeta; onSelect: (id: string) => void }) {
  const color = CATEGORY_COLORS[preset.category ?? "OTHER"] ?? "#7c8794";
  return (
    <button
      type="button"
      onClick={() => onSelect(preset.id)}
      className="group relative flex flex-col overflow-hidden rounded-[9px] border border-border bg-panel text-left transition-all hover:border-accent/60 hover:bg-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative flex h-24 w-full items-center justify-center bg-base">
        {preset.thumbnailUrl ? (
          <Image src={preset.thumbnailUrl} alt={preset.name} fill className="object-contain p-2" unoptimized />
        ) : (
          <FallbackIcon color={color} />
        )}
        {preset.source === "custom" && (
          <span className="absolute right-1.5 top-1.5 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-accent/20 text-accent">
            Custom
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <p className="text-[11.5px] font-bold leading-tight text-text group-hover:text-white">
          {preset.name}
        </p>
        {preset.manufacturer && (
          <p className="text-[10px] text-text-dim">{preset.manufacturer}</p>
        )}
      </div>
    </button>
  );
}

// ── Step 1: category selection ────────────────────────────────────────────────

function CategoryStep({
  presets,
  onSelect,
}: {
  presets: PresetMeta[];
  onSelect: (category: string) => void;
}) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of presets) {
      if (p.category) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return map;
  }, [presets]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-black text-text">What kind of asset?</h2>
        <p className="mt-0.5 text-[11px] text-text-dim">
          Pick a category, then choose a preset model or start from scratch.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
        {ASSET_CATEGORIES.map((cat) => {
          const color = CATEGORY_COLORS[cat] ?? "#7c8794";
          const count = counts.get(cat) ?? 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelect(cat)}
              className="group flex flex-col items-center gap-2 rounded-[9px] border border-border bg-panel px-3 py-4 text-center transition-all hover:bg-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              style={{ borderColor: undefined }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${color}66`)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
            >
              <span
                className="h-3 w-3 rounded-full transition-transform group-hover:scale-110"
                style={{ background: color }}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider leading-tight" style={{ color }}>
                {categoryLabel(cat)}
              </span>
              <span className="text-[9px] text-text-dim">
                {count > 0 ? `${count} preset${count === 1 ? "" : "s"}` : "No presets"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: preset picker for a given category ────────────────────────────────

function PresetStep({
  presets,
  category,
  onBack,
}: {
  presets: PresetMeta[];
  category: string;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const color = CATEGORY_COLORS[category] ?? "#7c8794";

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return presets.filter((p) => {
      if (p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.manufacturer?.toLowerCase().includes(q) ?? false) ||
        (p.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
      );
    });
  }, [presets, category, query]);

  function handleSelect(id: string) {
    window.location.href = `/assets/new?preset=${encodeURIComponent(id)}`;
  }

  const scratchUrl = `/assets/new?skip=1&category=${encodeURIComponent(category)}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Header: back + category label + search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-text-dim hover:bg-panel-2 hover:text-text transition-colors"
          >
            ← Back
          </button>
          <span className="text-base font-black" style={{ color }}>
            {categoryLabel(category)}
          </span>
        </div>

        <input
          type="search"
          placeholder="Search presets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-52 rounded-lg border border-border bg-base px-3 py-1.5 text-[12px] text-text placeholder:text-text-dim focus:border-accent/60 focus:outline-none"
        />
      </div>

      {/* Prominent "Start from scratch" card — always shown first */}
      <a
        href={scratchUrl}
        className="group flex items-center justify-between rounded-[9px] border-2 border-dashed border-border bg-panel px-4 py-3.5 transition-all hover:border-accent/50 hover:bg-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div>
          <p className="font-bold text-text group-hover:text-white">Start from scratch</p>
          <p className="mt-0.5 text-[11px] text-text-dim">Blank form — fill in all fields manually</p>
        </div>
        <span className="text-xl text-text-dim group-hover:text-accent transition-colors">→</span>
      </a>

      {/* Preset grid */}
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-text-dim">
          No presets available for this category yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((p) => (
            <PresetCard key={p.id} preset={p} onSelect={handleSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export function PresetPicker({ presets }: { presets: PresetMeta[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!selectedCategory) {
    return <CategoryStep presets={presets} onSelect={setSelectedCategory} />;
  }

  return (
    <PresetStep
      presets={presets}
      category={selectedCategory}
      onBack={() => setSelectedCategory(null)}
    />
  );
}
