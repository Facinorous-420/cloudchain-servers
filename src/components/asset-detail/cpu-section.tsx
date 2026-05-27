"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  quickInstallComponent,
  quickUninstallComponent,
} from "@/app/(app)/assets/actions";
import { Panel } from "@/components/ui/panel";

type SpareCpu = {
  id: string;
  name: string;
  speedGHz: number | null;
  cores: number | null;
  threads: number | null;
  tdpWatts: number | null;
};

type InstalledCpu = {
  id: string;
  name: string;
  quantity: number;
  speedGHz: number | null;
  cores: number | null;
  threads: number | null;
  tdpWatts: number | null;
};

export function CpuSection({
  assetId,
  cpus,
  spareCpus,
}: {
  assetId: string;
  cpus: InstalledCpu[];
  spareCpus: SpareCpu[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const totalQuantity = cpus.reduce((s, c) => s + c.quantity, 0);
  const totalCores = cpus.reduce((s, c) => s + (c.cores ?? 0) * c.quantity, 0);
  const totalGHz = cpus.reduce((s, c) => s + (c.speedGHz ?? 0) * c.quantity, 0);
  const avgGHz = totalQuantity > 0 ? totalGHz / totalQuantity : 0;
  const rollup = [
    `${totalQuantity} installed`,
    totalCores > 0 ? `${totalCores} total cores` : null,
    avgGHz > 0 ? `${avgGHz.toFixed(1)} GHz avg` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function handleInstall() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await quickInstallComponent(assetId, selectedId);
      if (!result.ok) {
        setError(result.error ?? "Failed to install.");
      } else {
        setShowPicker(false);
        setSelectedId("");
      }
    });
  }

  function handleUninstall(componentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await quickUninstallComponent(componentId, assetId);
      if (!result.ok) setError(result.error ?? "Failed to uninstall.");
      setConfirmingId(null);
    });
  }

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <span className="text-[12px] font-bold">CPUs</span>
          {cpus.length > 0 && (
            <span className="ml-2 text-[11px] text-text-dim">{rollup}</span>
          )}
        </div>
        <button
          onClick={() => {
            setShowPicker((v) => !v);
            setError(null);
          }}
          className="flex h-6 w-6 items-center justify-center rounded border border-border/60 text-[13px] text-text-dim hover:border-accent/60 hover:text-accent"
          title="Install a spare CPU"
        >
          +
        </button>
      </div>

      {error && (
        <p className="px-4 py-2 text-[12px] text-red-400">{error}</p>
      )}

      {showPicker && (
        <div className="flex items-center gap-2 border-b border-border bg-panel-2/60 px-4 py-2.5">
          {spareCpus.length === 0 ? (
            <p className="text-[12px] text-faint">
              No spare CPUs in inventory —{" "}
              <Link
                href={`/components/new?fromAssetId=${assetId}&type=CPU`}
                className="text-accent hover:underline"
              >
                create one
              </Link>
            </p>
          ) : (
            <>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1 rounded border border-border bg-panel-2 px-2 py-1 text-[12px] text-text"
              >
                <option value="">— Pick a spare CPU —</option>
                {spareCpus.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.speedGHz ? ` · ${c.speedGHz} GHz` : ""}
                    {c.cores ? ` · ${c.cores}c` : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={handleInstall}
                disabled={!selectedId || isPending}
                className="rounded bg-accent px-3 py-1 text-[12px] font-bold text-black disabled:opacity-50"
              >
                Install
              </button>
              <button
                onClick={() => setShowPicker(false)}
                className="text-[12px] text-text-dim hover:text-text"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {cpus.length === 0 && !showPicker ? (
        <p className="px-4 py-3 text-[12.5px] text-faint">
          No CPUs recorded.{" "}
          <Link
            href={`/components/new?fromAssetId=${assetId}&type=CPU`}
            className="text-accent hover:underline"
          >
            Create one
          </Link>{" "}
          or install a spare with the + button.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/30">
          {cpus.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href={`/components/${c.id}`}
                  className="truncate font-bold text-accent hover:underline"
                >
                  {c.name}
                </Link>
                <span className="shrink-0 text-text-dim">×{c.quantity}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-text-dim text-[12px]">
                  {[
                    c.speedGHz ? `${c.speedGHz} GHz` : null,
                    c.cores ? `${c.cores}c` : null,
                    c.threads ? `${c.threads}t` : null,
                    c.tdpWatts ? `${c.tdpWatts}W TDP` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
                {confirmingId === c.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => handleUninstall(c.id)}
                      disabled={isPending}
                      className="rounded bg-red-500/20 px-2 py-0.5 text-[11px] text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="text-[11px] text-text-dim hover:text-text"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmingId(c.id)}
                    className="text-[12px] text-faint hover:text-red-400"
                    title="Uninstall (move to spare pool)"
                  >
                    ×
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
