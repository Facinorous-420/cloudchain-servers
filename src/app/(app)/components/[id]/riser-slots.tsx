"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  mountDriveInBay,
  createDriveInBay,
  removeDriveFromBay,
} from "@/app/(app)/drives/actions";

export type RiserSlotDrive = { id: string; name: string; capacityGB: number };

// Per-slot mount manager for an NVMe riser's M.2 bay zone. Mirrors the topology
// bay inspector: mount an in-storage NVMe drive or create + mount a new one,
// without leaving the riser's page.
export function RiserSlots({
  bayZoneId,
  bayCount,
  occupants,
  available,
}: {
  bayZoneId: string;
  bayCount: number;
  occupants: Record<number, { id: string; name: string }>;
  available: RiserSlotDrive[];
}) {
  const slots = Array.from({ length: bayCount }, (_, i) => i + 1);
  return (
    <ul className="flex flex-col gap-2">
      {slots.map((n) => (
        <li
          key={n}
          className="rounded-md border border-border bg-panel-2 px-3 py-2"
        >
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[11px] font-bold uppercase tracking-wide text-text-dim">
              Slot {n}
            </span>
            {occupants[n] ? (
              <OccupiedSlot drive={occupants[n]} />
            ) : (
              <EmptySlot
                bayZoneId={bayZoneId}
                bayNumber={n}
                available={available}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function OccupiedSlot({ drive }: { drive: { id: string; name: string } }) {
  return (
    <div className="flex flex-1 items-center justify-between gap-2">
      <Link
        href={`/drives/${drive.id}`}
        className="text-[13px] font-medium text-text hover:text-accent hover:underline"
      >
        {drive.name}
      </Link>
      <form action={removeDriveFromBay.bind(null, drive.id)}>
        <button
          type="submit"
          className="rounded border border-border px-2 py-0.5 text-[11px] text-text-dim transition-colors hover:border-red-500/60 hover:text-red-400"
        >
          Unmount
        </button>
      </form>
    </div>
  );
}

function EmptySlot({
  bayZoneId,
  bayNumber,
  available,
}: {
  bayZoneId: string;
  bayNumber: number;
  available: RiserSlotDrive[];
}) {
  const [mode, setMode] = useState<"none" | "existing" | "new">("none");

  if (mode === "none") {
    return (
      <div className="flex flex-1 items-center justify-between gap-2">
        <span className="text-[12px] text-faint">Empty</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setMode("existing")}
            disabled={available.length === 0}
            className="rounded border border-border px-2 py-0.5 text-[11px] text-text-dim transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
            title={
              available.length === 0
                ? "No in-storage M.2 drives available"
                : undefined
            }
          >
            Mount existing
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className="rounded border border-border px-2 py-0.5 text-[11px] text-text-dim transition-colors hover:border-accent hover:text-accent"
          >
            Create new
          </button>
        </div>
      </div>
    );
  }

  if (mode === "existing") {
    return (
      <form
        action={mountDriveInBay}
        className="flex flex-1 items-end gap-2"
      >
        <input type="hidden" name="bayZoneId" value={bayZoneId} />
        <input type="hidden" name="bayNumber" value={bayNumber} />
        <div className="flex-1">
          <Field label="Drive" htmlFor={`drive-${bayNumber}`}>
            <Select id={`drive-${bayNumber}`} name="driveId" required>
              {available.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.capacityGB} GB)
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button type="submit" variant="primary" className="px-2.5 py-1 text-xs">
          Mount
        </Button>
        <button
          type="button"
          onClick={() => setMode("none")}
          className="px-2 py-1 text-[11px] text-text-dim hover:text-text"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <form action={createDriveInBay} className="flex flex-1 flex-wrap items-end gap-2">
      <input type="hidden" name="bayZoneId" value={bayZoneId} />
      <input type="hidden" name="bayNumber" value={bayNumber} />
      <input type="hidden" name="kind" value="NVME" />
      <div className="min-w-[140px] flex-1">
        <Field label="Name" htmlFor={`new-name-${bayNumber}`}>
          <TextInput id={`new-name-${bayNumber}`} name="name" required />
        </Field>
      </div>
      <div className="w-28">
        <Field label="Capacity (GB)" htmlFor={`new-cap-${bayNumber}`}>
          <TextInput
            id={`new-cap-${bayNumber}`}
            name="capacityGB"
            type="number"
            step="1"
            required
          />
        </Field>
      </div>
      <Button type="submit" variant="primary" className="px-2.5 py-1 text-xs">
        Create + mount
      </Button>
      <button
        type="button"
        onClick={() => setMode("none")}
        className="px-2 py-1 text-[11px] text-text-dim hover:text-text"
      >
        Cancel
      </button>
    </form>
  );
}
