"use client";

import { useState } from "react";
import type { BayZoneInput } from "@/lib/schemas/asset";
import type { PortGroupInput } from "@/lib/schemas/port-group";
import type { OutletGroupInput } from "@/lib/schemas/outlet-group";
import type {
  InlinePsuInput,
  FaceplateAnnotationInput,
} from "@/lib/schemas/inline-components";
import { FACE_COLS, FACE_ROW_PX, type FaceId } from "@/lib/faceplate";
import { Button } from "@/components/ui/button";

export type BuiltInBlock = {
  ethernet: number;
  sfp: number;
  gridRow: number | null;
  gridCol: number | null;
  face: string | null;
};

type Block = {
  id: string;
  label: string;
  sub: string;
  tone: string; // accent class
  face: FaceId | "INTERIOR" | null;
  row: number | null;
  col: number | null;
  isAnnotation?: boolean;
  annotationKind?: "TEXT" | "SPACER";
  text?: string | null;
};

// Drag-and-drop faceplate designer. Positions every device element (drive-bay
// zones, port/outlet groups, PSUs, built-in NIC strip, custom text/spacers) on a
// coarse per-face grid; the diagram renders each at the cell it's dropped on.
export function FaceplateDesigner({
  bayZones,
  onBayZones,
  portGroups,
  onPortGroups,
  outletGroups,
  onOutletGroups,
  psus,
  onPsus,
  annotations,
  onAnnotations,
  builtIn,
  onBuiltIn,
}: {
  bayZones: BayZoneInput[];
  onBayZones: (v: BayZoneInput[]) => void;
  portGroups: PortGroupInput[];
  onPortGroups: (v: PortGroupInput[]) => void;
  outletGroups: OutletGroupInput[];
  onOutletGroups: (v: OutletGroupInput[]) => void;
  psus: InlinePsuInput[];
  onPsus: (v: InlinePsuInput[]) => void;
  annotations: FaceplateAnnotationInput[];
  onAnnotations: (v: FaceplateAnnotationInput[]) => void;
  builtIn: BuiltInBlock;
  onBuiltIn: (v: BuiltInBlock) => void;
}) {
  const blocks: Block[] = [
    ...bayZones.map((z, i) => ({
      id: `bay:${i}`,
      label: z.name || "Drive bays",
      sub: `${z.bayCount}× ${z.driveSize}`,
      tone: "border-cat-server/60 bg-cat-server/15 text-cat-server",
      face: (z.faceSide === "REAR" ? "REAR" : z.faceSide === "INTERIOR" ? "INTERIOR" : "FRONT") as Block["face"],
      row: z.gridRow ?? null,
      col: z.gridCol ?? null,
    })),
    ...portGroups.map((g, i) => ({
      id: `port:${i}`,
      label: g.name || g.portType,
      sub: `${g.portCount} ports`,
      tone: "border-accent/60 bg-accent/15 text-accent",
      face: ((g.face as FaceId) ?? "FRONT") as Block["face"],
      row: g.gridRow ?? null,
      col: g.gridCol ?? null,
    })),
    ...outletGroups.map((g, i) => ({
      id: `outlet:${i}`,
      label: g.name || g.outletType || "Outlets",
      sub: `${g.outletCount} outlets`,
      tone: "border-cat-ups/60 bg-cat-ups/15 text-cat-ups",
      face: ((g.face as FaceId) ?? "REAR") as Block["face"],
      row: g.gridRow ?? null,
      col: g.gridCol ?? null,
    })),
    ...psus.map((p, i) => ({
      id: `psu:${i}`,
      label: `PSU ${i + 1}`,
      sub: p.wattage ? `${p.wattage}W` : "PSU",
      tone: "border-status-green/60 bg-status-green/15 text-status-green",
      face: ((p.face as FaceId) ?? "REAR") as Block["face"],
      row: p.gridRow ?? null,
      col: p.gridCol ?? null,
    })),
    ...annotations.map((a, i) => ({
      id: `anno:${i}`,
      label: a.kind === "TEXT" ? a.text || "Text" : "Spacer",
      sub: a.kind === "TEXT" ? "label" : "blank",
      tone: "border-border bg-panel-2 text-text-dim",
      face: ((a.face as FaceId) ?? "FRONT") as Block["face"],
      row: a.gridRow ?? null,
      col: a.gridCol ?? null,
      isAnnotation: true,
      annotationKind: a.kind,
      text: a.text,
    })),
  ];
  if (builtIn.ethernet > 0 || builtIn.sfp > 0) {
    blocks.push({
      id: "builtin",
      label: "Built-in NICs",
      sub: `${builtIn.ethernet} GbE${builtIn.sfp ? ` + ${builtIn.sfp} SFP` : ""}`,
      tone: "border-accent/60 bg-accent/15 text-accent",
      face: ((builtIn.face as FaceId) ?? "REAR") as Block["face"],
      row: builtIn.gridRow,
      col: builtIn.gridCol,
    });
  }

  function place(id: string, face: FaceId | null, row: number | null, col: number | null) {
    const [kind, idxStr] = id.split(":");
    const idx = Number(idxStr);
    if (kind === "bay") {
      onBayZones(
        bayZones.map((z, i) =>
          i === idx
            ? { ...z, faceSide: (face ?? z.faceSide) as BayZoneInput["faceSide"], gridRow: row, gridCol: col }
            : z,
        ),
      );
    } else if (kind === "port") {
      onPortGroups(
        portGroups.map((g, i) =>
          i === idx ? { ...g, face: face ?? g.face ?? null, gridRow: row, gridCol: col } : g,
        ),
      );
    } else if (kind === "outlet") {
      onOutletGroups(
        outletGroups.map((g, i) =>
          i === idx ? { ...g, face: face ?? g.face ?? null, gridRow: row, gridCol: col } : g,
        ),
      );
    } else if (kind === "psu") {
      onPsus(
        psus.map((p, i) =>
          i === idx ? { ...p, face: face ?? p.face ?? null, gridRow: row, gridCol: col } : p,
        ),
      );
    } else if (kind === "anno") {
      onAnnotations(
        annotations.map((a, i) =>
          i === idx ? { ...a, face: (face ?? a.face ?? "FRONT") as FaceplateAnnotationInput["face"], gridRow: row, gridCol: col } : a,
        ),
      );
    } else if (kind === "builtin") {
      onBuiltIn({ ...builtIn, face: face ?? builtIn.face, gridRow: row, gridCol: col });
    }
  }

  function addAnnotation(kind: "TEXT" | "SPACER") {
    onAnnotations([
      ...annotations,
      {
        face: "FRONT",
        kind,
        text: kind === "TEXT" ? "Label" : null,
        gridRow: null,
        gridCol: null,
        rowSpan: 1,
        colSpan: kind === "SPACER" ? 2 : 3,
        sortOrder: annotations.length,
      },
    ]);
  }
  function updateAnnotationText(idx: number, text: string) {
    onAnnotations(annotations.map((a, i) => (i === idx ? { ...a, text } : a)));
  }
  function removeAnnotation(idx: number) {
    onAnnotations(annotations.filter((_, i) => i !== idx));
  }

  const unplaced = blocks.filter((b) => b.row == null || b.col == null);

  function onDropFace(e: React.DragEvent, face: FaceId) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.min(
      FACE_COLS,
      Math.max(1, Math.floor(((e.clientX - rect.left) / rect.width) * FACE_COLS) + 1),
    );
    const row = Math.max(1, Math.floor((e.clientY - rect.top) / FACE_ROW_PX) + 1);
    place(id, face, row, col);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11.5px] text-text-dim">
        Drag each element onto the Front or Rear grid to set exactly where it
        renders in the diagram. Drag back to the tray to clear its position
        (it then auto-lays-out). Port rows/columns and show/hide live in the
        port/outlet group editors above.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-text-dim">
          Add
        </span>
        <Button type="button" variant="secondary" onClick={() => addAnnotation("TEXT")}>
          + Text label
        </Button>
        <Button type="button" variant="secondary" onClick={() => addAnnotation("SPACER")}>
          + Spacer
        </Button>
      </div>

      {/* Unplaced tray */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain");
          if (id) place(id, null, null, null);
        }}
        className="rounded-md border border-dashed border-border bg-panel-2 p-2"
      >
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-text-dim">
          Unplaced (auto-layout) — drag onto a face
        </p>
        <div className="flex flex-wrap gap-1.5">
          {unplaced.length === 0 && (
            <span className="text-[11px] text-faint">Everything is placed.</span>
          )}
          {unplaced.map((b) => (
            <BlockChip
              key={b.id}
              block={b}
              onTextChange={updateAnnotationText}
              onRemove={removeAnnotation}
            />
          ))}
        </div>
      </div>

      {/* Front / Rear grids */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {(["FRONT", "REAR"] as FaceId[]).map((face) => {
          const placed = blocks.filter((b) => b.row != null && b.col != null && b.face === face);
          const maxRow = placed.reduce((m, b) => Math.max(m, b.row ?? 0), 0);
          const rows = Math.max(4, maxRow + 1);
          return (
            <div key={face}>
              <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-accent">
                {face} face
              </p>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropFace(e, face)}
                className="relative w-full rounded-md border border-[#04070b] bg-[#0a0d12]"
                style={{
                  height: rows * FACE_ROW_PX,
                  backgroundImage: `repeating-linear-gradient(to right, transparent, transparent calc(${100 / FACE_COLS}% - 1px), rgba(255,255,255,0.05) calc(${100 / FACE_COLS}% - 1px), rgba(255,255,255,0.05) ${100 / FACE_COLS}%), repeating-linear-gradient(to bottom, transparent, transparent ${FACE_ROW_PX - 1}px, rgba(255,255,255,0.05) ${FACE_ROW_PX - 1}px, rgba(255,255,255,0.05) ${FACE_ROW_PX}px)`,
                }}
              >
                {placed.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      position: "absolute",
                      left: `${(((b.col ?? 1) - 1) / FACE_COLS) * 100}%`,
                      top: ((b.row ?? 1) - 1) * FACE_ROW_PX,
                    }}
                  >
                    <BlockChip
                      block={b}
                      onTextChange={updateAnnotationText}
                      onRemove={removeAnnotation}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlockChip({
  block,
  onTextChange,
  onRemove,
}: {
  block: Block;
  onTextChange: (idx: number, text: string) => void;
  onRemove: (idx: number) => void;
}) {
  const annoIdx = block.isAnnotation ? Number(block.id.split(":")[1]) : -1;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", block.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`flex max-w-[160px] cursor-grab items-center gap-1 rounded border px-1.5 py-1 text-[10.5px] active:cursor-grabbing ${block.tone}`}
      title={`${block.label} — ${block.sub}`}
    >
      {block.isAnnotation && block.annotationKind === "TEXT" ? (
        <input
          value={block.text ?? ""}
          onChange={(e) => onTextChange(annoIdx, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          draggable={false}
          className="w-20 bg-transparent text-[10.5px] text-text outline-none placeholder:text-faint"
          placeholder="Label"
        />
      ) : (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-bold">{block.label}</span>
          <span className="truncate text-[8px] opacity-80">{block.sub}</span>
        </span>
      )}
      {block.isAnnotation && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(annoIdx)}
          className="shrink-0 px-0.5 text-faint hover:text-red-400"
          title="Delete"
        >
          ×
        </button>
      )}
    </div>
  );
}
