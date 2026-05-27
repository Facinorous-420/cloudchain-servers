"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  quickOccupyPciSlot,
  quickVacatePciSlot,
  quickUninstallDrive,
} from "@/app/(app)/assets/actions";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { enumLabel } from "@/lib/enums";

type SpareComponent = {
  id: string;
  name: string;
  type: string;
  portCount: number | null;
  portSpeed: string | null;
  m2SlotCount: number | null;
};

type DriveInBay = {
  id: string;
  name: string;
  kind: string;
  capacityGB: number;
  bayNumber: number | null;
};

type BayZone = {
  id: string;
  name: string;
  driveSize: string;
  bayCount: number;
  drives: DriveInBay[];
};

type OccupiedComponent = {
  id: string;
  name: string;
  type: string;
  portCount: number | null;
  portSpeed: string | null;
  m2SlotCount: number | null;
  bayZones: BayZone[];
};

type PciSlot = {
  id: string;
  sortOrder: number;
  size: string;
  occupiedBy: OccupiedComponent | null;
};

const PCI_CARD_TYPES = ["PCIE_CARD", "NIC_CARD", "GPU", "NVME_RISER", "RAID_CONTROLLER"];

export function PciSection({
  assetId,
  slots,
  spareComponents,
}: {
  assetId: string;
  slots: PciSlot[];
  spareComponents: SpareComponent[];
}) {
  if (slots.length === 0) return null;

  const occupiedCount = slots.filter((s) => s.occupiedBy).length;

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <span className="text-[12px] font-bold">PCIe slots</span>
          <span className="ml-2 text-[11px] text-text-dim">
            {occupiedCount} of {slots.length} occupied
          </span>
        </div>
        <Link
          href={`/assets/${assetId}/edit`}
          className="text-[11px] text-text-dim hover:text-accent"
          title="Edit PCIe slot layout in the asset editor"
        >
          Edit layout
        </Link>
      </div>

      <div className="flex flex-col divide-y divide-border/20">
        {slots.map((slot) => (
          <SlotRow
            key={slot.id}
            slot={slot}
            assetId={assetId}
            spareComponents={spareComponents.filter((c) =>
              PCI_CARD_TYPES.includes(c.type),
            )}
          />
        ))}
      </div>
    </Panel>
  );
}

function SlotRow({
  slot,
  assetId,
  spareComponents,
}: {
  slot: PciSlot;
  assetId: string;
  spareComponents: SpareComponent[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleInstall() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await quickOccupyPciSlot(slot.id, selectedId, assetId);
      if (!result.ok) {
        setError(result.error ?? "Failed to install.");
      } else {
        setShowPicker(false);
        setSelectedId("");
      }
    });
  }

  function handleRemove() {
    if (!slot.occupiedBy) return;
    setError(null);
    startTransition(async () => {
      const result = await quickVacatePciSlot(
        slot.id,
        slot.occupiedBy!.id,
        assetId,
      );
      if (!result.ok) setError(result.error ?? "Failed to remove.");
      setConfirming(false);
    });
  }

  const comp = slot.occupiedBy;
  const isRiser = comp?.type === "NVME_RISER";
  const isNic = comp?.type === "NIC_CARD";

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Badge>{slot.size}</Badge>

        {comp ? (
          <>
            <Link
              href={`/components/${comp.id}`}
              className="truncate font-bold text-[13px] text-accent hover:underline"
            >
              {comp.name}
            </Link>
            <Badge>{enumLabel(comp.type)}</Badge>
            {isNic && comp.portCount && (
              <span className="text-[12px] text-text-dim">
                {comp.portCount} port{comp.portCount !== 1 ? "s" : ""}
                {comp.portSpeed ? ` · ${comp.portSpeed}` : ""}
              </span>
            )}
            {isRiser && comp.m2SlotCount && (
              <span className="text-[12px] text-text-dim">
                {comp.m2SlotCount} M.2 slot{comp.m2SlotCount !== 1 ? "s" : ""}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1.5">
              {confirming ? (
                <>
                  <button
                    onClick={handleRemove}
                    disabled={isPending}
                    className="rounded bg-red-500/20 px-2 py-0.5 text-[11px] text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                  >
                    Confirm remove
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="text-[11px] text-text-dim hover:text-text"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="text-[12px] text-faint hover:text-red-400"
                  title="Vacate slot (component goes to spare pool)"
                >
                  ×
                </button>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="text-[12.5px] text-faint">Empty</span>
            <span className="ml-auto flex items-center gap-1.5">
              {showPicker ? null : (
                <button
                  onClick={() => {
                    setShowPicker(true);
                    setError(null);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded border border-border/60 text-[13px] text-text-dim hover:border-accent/60 hover:text-accent"
                  title="Install a component"
                >
                  +
                </button>
              )}
            </span>
          </>
        )}
      </div>

      {error && (
        <p className="mt-1 text-[11.5px] text-red-400">{error}</p>
      )}

      {showPicker && !comp && (
        <div className="mt-2 flex items-center gap-2">
          {spareComponents.length === 0 ? (
            <p className="text-[12px] text-faint">
              No spare PCIe cards in inventory —{" "}
              <Link
                href={`/components/new?fromAssetId=${assetId}&type=PCIE_CARD`}
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
                <option value="">— Pick a component —</option>
                {spareComponents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({enumLabel(c.type)})
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

      {/* NVME_RISER: show its M.2 bays inline */}
      {isRiser && comp!.bayZones.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-border/40">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-text-dim">
            M.2 bays
          </p>
          {comp!.bayZones.map((zone) => (
            <RiserBayZone
              key={zone.id}
              zone={zone}
              assetId={assetId}
              componentId={comp!.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RiserBayZone({
  zone,
  assetId,
  componentId,
}: {
  zone: BayZone;
  assetId: string;
  componentId: string;
}) {
  const drivesByBay = new Map(
    zone.drives
      .filter((d) => d.bayNumber != null)
      .map((d) => [d.bayNumber as number, d]),
  );
  const bays = Array.from({ length: zone.bayCount }, (_, i) => i + 1);

  return (
    <div className="mb-2">
      <p className="mb-1 text-[11px] text-text-dim">{zone.name}</p>
      <div className="flex flex-wrap gap-1.5">
        {bays.map((n) => {
          const drive = drivesByBay.get(n);
          return drive ? (
            <OccupiedRiserBay
              key={n}
              bay={n}
              drive={drive}
              assetId={assetId}
            />
          ) : (
            <Link
              key={n}
              href={`/drives/new?installedInId=${assetId}&bayZoneId=${zone.id}&bayNumber=${n}&size=${zone.driveSize}`}
              className="flex min-w-[80px] flex-col gap-0.5 rounded border border-dashed border-border/60 bg-panel-2/40 px-2 py-1.5 text-[11px] text-faint hover:border-accent/50 hover:text-text"
            >
              <span className="text-[9px] font-bold uppercase">
                Slot {n}
              </span>
              <span className="text-accent text-[10.5px]">+ Add</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function OccupiedRiserBay({
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
    <div className="flex min-w-[80px] flex-col gap-0.5 rounded border border-status-green/50 bg-status-green/10 px-2 py-1.5 text-[11px] text-text">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase text-text-dim">
          Slot {bay}
        </span>
        {confirming ? (
          <span className="flex items-center gap-1">
            <button
              onClick={handleRemove}
              disabled={isPending}
              className="text-[9px] font-bold text-red-400 disabled:opacity-50"
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
          >
            ×
          </button>
        )}
      </div>
      <Link
        href={`/drives/${drive.id}`}
        className="truncate font-bold text-[10.5px] hover:underline hover:text-accent"
      >
        {drive.name}
      </Link>
      <span className="text-[10px] text-text-dim">
        {drive.kind} · {drive.capacityGB} GB
      </span>
    </div>
  );
}
