"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { quickUninstallDrive } from "@/app/(app)/assets/actions";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { enumLabel } from "@/lib/enums";

type DriveInBay = {
  id: string;
  name: string;
  kind: string;
  capacityGB: number;
  bayNumber: number | null;
};

type Zone = {
  id: string;
  name: string;
  faceSide: string;
  driveSize: string;
  bayCount: number;
  drives: DriveInBay[];
};

export function DriveBaySections({
  assetId,
  zones,
}: {
  assetId: string;
  zones: Zone[];
}) {
  const totalBays = zones.reduce((s, z) => s + z.bayCount, 0);
  const totalDrives = zones.reduce((s, z) => s + z.drives.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-text-dim">
          {totalDrives} of {totalBays} bays in use
        </span>
      </div>
      {zones.map((zone) => (
        <DriveZoneBlock
          key={zone.id}
          zone={zone}
          assetId={assetId}
        />
      ))}
    </div>
  );
}

function DriveZoneBlock({
  zone,
  assetId,
}: {
  zone: Zone;
  assetId: string;
}) {
  const drivesByBay = new Map(
    zone.drives
      .filter((d) => d.bayNumber != null)
      .map((d) => [d.bayNumber as number, d]),
  );
  const bays = Array.from({ length: zone.bayCount }, (_, i) => i + 1);

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold">{zone.name}</span>
          <Badge>{enumLabel(zone.faceSide)}</Badge>
          <Badge>{enumLabel(zone.driveSize)}</Badge>
        </div>
        <span className="text-[11.5px] text-text-dim">
          {zone.drives.length} of {zone.bayCount} bays
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 p-3">
        {bays.map((n) => {
          const drive = drivesByBay.get(n);
          return drive ? (
            <OccupiedBay key={n} bay={n} drive={drive} assetId={assetId} />
          ) : (
            <Link
              key={n}
              href={`/drives/new?installedInId=${assetId}&bayZoneId=${zone.id}&bayNumber=${n}&size=${zone.driveSize}`}
              className="flex min-w-[88px] flex-col gap-0.5 rounded border border-dashed border-border/60 bg-panel-2/40 px-2 py-1.5 text-[11px] text-faint hover:border-accent/50 hover:text-text"
              title={`Bay ${n}: empty — click to add a drive`}
            >
              <span className="text-[9.5px] font-bold uppercase">Bay {n}</span>
              <span className="text-accent">+ Add drive</span>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

function OccupiedBay({
  bay,
  drive,
  assetId,
}: {
  bay: number;
  drive: DriveInBay;
  assetId: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      await quickUninstallDrive(drive.id, assetId);
      setConfirming(false);
    });
  }

  return (
    <div className="flex min-w-[88px] flex-col gap-0.5 rounded border border-status-green/50 bg-status-green/10 px-2 py-1.5 text-[11px] text-text">
      <div className="flex items-center justify-between">
        <span className="text-[9.5px] font-bold uppercase text-text-dim">
          Bay {bay}
        </span>
        {confirming ? (
          <span className="flex items-center gap-1">
            <button
              onClick={handleRemove}
              disabled={isPending}
              className="text-[9px] font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              Remove
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-[9px] text-text-dim"
            >
              ✕
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-[11px] text-faint hover:text-red-400"
            title="Uninstall drive"
          >
            ×
          </button>
        )}
      </div>
      <Link
        href={`/drives/${drive.id}`}
        className="truncate font-bold hover:underline hover:text-accent"
      >
        {drive.name}
      </Link>
      <span className="text-[10px] text-text-dim">
        {drive.kind} · {drive.capacityGB} GB
      </span>
    </div>
  );
}
