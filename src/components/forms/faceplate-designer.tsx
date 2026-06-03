"use client";

import { useState } from "react";
import type { BayZoneInput } from "@/lib/schemas/asset";
import type { PortGroupInput } from "@/lib/schemas/port-group";
import type { OutletGroupInput } from "@/lib/schemas/outlet-group";
import type {
  InlinePsuInput,
  FaceplateAnnotationInput,
} from "@/lib/schemas/inline-components";
import {
  FACE_COLS,
  type FaceId,
  blockSpan,
  rectsOverlap,
  clampCell,
  resolveColumns,
  columnBounds,
  type BlockSpec,
  ELEMENT_INCHES,
} from "@/lib/faceplate";
import { Button } from "@/components/ui/button";
import type { DiagramAsset } from "@/app/(app)/topology/rack-diagram";
import {
  AssetFaceContent,
  DriveBayGrid,
  PortGrid,
  OutletGrid,
  NicGrid,
} from "@/app/(app)/topology/topology-view";

export type BuiltInBlock = {
  ethernet: number;
  sfp: number;
  gridRow: number | null;
  gridCol: number | null;
  face: string | null;
};

export type FaceplateMeta = {
  category: string;
  codename: string;
  name: string;
  formFactor: string;
  rackUnits: number;
  widthInches: number;
  columnSpan: number | null;
  kvmChannelCount: number;
  psuCount: number;
  patchPanelType: string | null;
};

// Designer is shown at a comfortable zoom; elements still render at their real
// physical size (inches × PX_PER_INCH). The footprint maths is pixel-independent
// so the diagram (at its own scale) lays things out identically.
const PX_PER_INCH = 32;
const TRAY_PPI = 12; // smaller scale for compact tray chip thumbnails
const U_IN = 1.75;
const ROW_H = Math.round(U_IN * PX_PER_INCH); // designer px per U
const TRAY_ROW_H = Math.round(U_IN * TRAY_PPI); // tray chip px per U
// Tray cell dimensions — each chip is sized to its grid footprint (span.w × span.h).
const TRAY_CELL_W = 28; // px per grid-column in tray
const TRAY_CELL_H = 30; // px per U in tray
const RACK_WIDTH_INCHES = 19;
const PREVIEW_U = 40; // preview px per U (matches the topology diagram)
const PREVIEW_PPI = PREVIEW_U / U_IN;
const noop = () => {};

type Block = {
  id: string;
  source: "bay" | "port" | "outlet" | "psu" | "builtin" | "anno";
  index: number;
  face: FaceId;
  row: number | null;
  col: number | null;
  span: { w: number; h: number };
  label: string; // display name shown in the tray chip
  node: React.ReactNode; // full-scale for placed grid
  trayNode: React.ReactNode; // compact-scale for unplaced tray
  annotationKind?: "TEXT" | "SPACER" | "DIVIDER";
  text?: string | null;
  shape?: {
    count: number;
    columns: number | null;
    cols: number;
    min: number; // min columns (fewest cols that still fit height)
    max: number; // effMax = min(maxCols, count) — never more cols than elements
    maxRows: number;
    driveSize?: string;
    vertical?: boolean;
  };
  fits?: boolean;
  fitLabel?: string;
};

export function FaceplateDesigner({
  meta,
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
  meta: FaceplateMeta;
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
  const [error, setError] = useState<string | null>(null);
  const isTower = meta.formFactor === "TOWER";
  const rackUnits = Math.max(0, Math.floor(meta.rackUnits));
  const ready = rackUnits > 0 && (!isTower || meta.widthInches > 0);
  const faceWidthInches = isTower
    ? meta.widthInches || RACK_WIDTH_INCHES
    : meta.widthInches || RACK_WIDTH_INCHES;

  const asset = buildPreviewAsset(meta, {
    bayZones,
    portGroups,
    outletGroups,
    psus,
    annotations,
    builtIn,
    rackUnits: rackUnits || 1,
  });

  function place(id: string, face: FaceId | null, row: number | null, col: number | null) {
    const [kind, idxStr] = id.split(":");
    const idx = Number(idxStr);
    if (kind === "bay") onBayZones(bayZones.map((z, i) => (i === idx ? { ...z, faceSide: (face ?? z.faceSide) as BayZoneInput["faceSide"], gridRow: row, gridCol: col } : z)));
    else if (kind === "port") onPortGroups(portGroups.map((g, i) => (i === idx ? { ...g, face: face ?? g.face ?? null, gridRow: row, gridCol: col } : g)));
    else if (kind === "outlet") onOutletGroups(outletGroups.map((g, i) => (i === idx ? { ...g, face: face ?? g.face ?? null, gridRow: row, gridCol: col } : g)));
    else if (kind === "psu") onPsus(psus.map((p, i) => (i === idx ? { ...p, face: face ?? p.face ?? null, gridRow: row, gridCol: col } : p)));
    else if (kind === "anno") onAnnotations(annotations.map((a, i) => (i === idx ? { ...a, face: (face ?? a.face ?? "FRONT") as FaceplateAnnotationInput["face"], gridRow: row, gridCol: col } : a)));
    else if (kind === "builtin") onBuiltIn({ ...builtIn, face: face ?? builtIn.face, gridRow: row, gridCol: col });
  }

  function setColumns(source: string, idx: number, columns: number) {
    const c = Math.max(1, columns);
    if (source === "bay") onBayZones(bayZones.map((z, i) => (i === idx ? { ...z, columns: c } : z)));
    else if (source === "port") onPortGroups(portGroups.map((g, i) => (i === idx ? { ...g, columns: c } : g)));
    else if (source === "outlet") onOutletGroups(outletGroups.map((g, i) => (i === idx ? { ...g, columns: c } : g)));
    else if (source === "builtin") promoteBuiltIn(c);
  }

  function setVertical(idx: number, vertical: boolean) {
    onBayZones(bayZones.map((z, i) => (i === idx ? { ...z, vertical, columns: null } : z)));
  }

  // Promote the built-in GbE/SFP block to real PortGroups so it gets full
  // column/hide/position controls. Called the first time the user edits columns.
  function promoteBuiltIn(columns?: number) {
    const newGroups: PortGroupInput[] = [];
    if (builtIn.ethernet > 0) {
      newGroups.push({
        portType: "ETHERNET",
        portCount: builtIn.ethernet,
        name: "Onboard GbE",
        side: "LEFT",
        sortOrder: portGroups.length,
        face: (builtIn.face ?? "REAR") as PortGroupInput["face"],
        gridRow: builtIn.gridRow ?? null,
        gridCol: builtIn.gridCol ?? null,
        columns: columns ?? null,
      });
    }
    if (builtIn.sfp > 0) {
      newGroups.push({
        portType: "SFP",
        portCount: builtIn.sfp,
        name: "Onboard SFP",
        side: "LEFT",
        sortOrder: portGroups.length + newGroups.length,
        face: (builtIn.face ?? "REAR") as PortGroupInput["face"],
        gridRow: builtIn.gridRow ?? null,
        gridCol: builtIn.gridCol ?? null,
      });
    }
    onPortGroups([...portGroups, ...newGroups]);
    onBuiltIn({ ...builtIn, ethernet: 0, sfp: 0 });
  }

  function addAnnotation(kind: "TEXT" | "SPACER" | "DIVIDER") {
    onAnnotations([
      ...annotations,
      { face: "FRONT", kind, text: kind === "TEXT" ? "Label" : null, gridRow: null, gridCol: null, rowSpan: 1, colSpan: 1, sortOrder: annotations.length },
    ]);
  }
  const updateAnnotationText = (idx: number, text: string) =>
    onAnnotations(annotations.map((a, i) => (i === idx ? { ...a, text } : a)));
  const removeAnnotation = (idx: number) =>
    onAnnotations(annotations.filter((_, i) => i !== idx));

  // Build the renderable block list with footprints.
  const blocks: Block[] = [];
  asset.bayZones.forEach((z, i) => {
    const vertical = !!z.vertical && z.driveSize !== "LFF";
    const spec: BlockSpec = { kind: "bay", count: z.bayCount, columns: z.columns, driveSize: z.driveSize, vertical, rackUnits: rackUnits || 1 };
    const cols = resolveColumns(spec, faceWidthInches);
    const b = columnBounds(spec, faceWidthInches);
    blocks.push({
      id: `bay:${i}`, source: "bay", index: i,
      face: (z.faceSide === "REAR" ? "REAR" : "FRONT") as FaceId,
      row: z.gridRow ?? null, col: z.gridCol ?? null, span: blockSpan(spec, faceWidthInches),
      label: z.name,
      shape: { count: z.bayCount, columns: z.columns ?? null, cols, min: b.minCols, max: b.effMax, maxRows: b.maxRows, driveSize: z.driveSize, vertical },
      fits: b.fits, fitLabel: `${z.bayCount} ${z.driveSize}${vertical ? " (vertical)" : ""} bays don't fit a ${rackUnits}U face (max ${b.capacity})`,
      node: <DriveBayGrid zone={{ ...z, vertical }} heightU={rackUnits || 1} onInspect={noop} pxPerInch={PX_PER_INCH} cols={cols} />,
      trayNode: <DriveBayGrid zone={{ ...z, vertical }} heightU={rackUnits || 1} onInspect={noop} pxPerInch={TRAY_PPI} cols={cols} />,
    });
  });
  asset.portGroups.forEach((g, i) => {
    const spec: BlockSpec = { kind: "port", count: g.portCount, columns: g.columns, rows: g.rows, portType: g.portType, rackUnits: rackUnits || 1 };
    const cols = resolveColumns(spec, faceWidthInches);
    const b = columnBounds(spec, faceWidthInches);
    blocks.push({
      id: `port:${i}`, source: "port", index: i,
      face: ((g.face as FaceId) ?? "FRONT") as FaceId,
      row: g.gridRow ?? null, col: g.gridCol ?? null, span: blockSpan(spec, faceWidthInches),
      label: g.name ?? g.portType,
      shape: { count: g.portCount, columns: g.columns ?? null, cols, min: b.minCols, max: b.effMax, maxRows: b.maxRows },
      fits: b.fits, fitLabel: `${g.portCount} ${g.portType} ports don't fit a ${rackUnits}U face (max ${b.capacity})`,
      node: <PortGrid groupId={g.id} count={g.portCount} connectedPorts={[]} portType={g.portType} rows={g.rows} columns={cols} hidden={g.hiddenPorts} heightU={rackUnits || 1} onInspect={noop} pxPerInch={PX_PER_INCH} />,
      trayNode: <PortGrid groupId={g.id} count={g.portCount} connectedPorts={[]} portType={g.portType} rows={g.rows} columns={cols} hidden={g.hiddenPorts} heightU={rackUnits || 1} onInspect={noop} pxPerInch={TRAY_PPI} />,
    });
  });
  asset.outletGroups.forEach((g, i) => {
    const spec: BlockSpec = { kind: "outlet", count: g.outletCount, columns: g.columns, rows: g.rows, rackUnits: rackUnits || 1 };
    const cols = resolveColumns(spec, faceWidthInches);
    const b = columnBounds(spec, faceWidthInches);
    blocks.push({
      id: `outlet:${i}`, source: "outlet", index: i,
      face: ((g.face as FaceId) ?? "REAR") as FaceId,
      row: g.gridRow ?? null, col: g.gridCol ?? null, span: blockSpan(spec, faceWidthInches),
      label: g.name ?? g.outletType ?? "Outlets",
      shape: { count: g.outletCount, columns: g.columns ?? null, cols, min: b.minCols, max: b.effMax, maxRows: b.maxRows },
      fits: b.fits, fitLabel: `${g.outletCount} outlets don't fit a ${rackUnits}U face (max ${b.capacity})`,
      node: <OutletGrid groupId={g.id} count={g.outletCount} connectedOutlets={[]} heightU={rackUnits || 1} batteryBacked={g.batteryBacked} surgeProtected={g.surgeProtected} rows={g.rows} columns={cols} hidden={g.hiddenPorts} onInspect={noop} pxPerInch={PX_PER_INCH} />,
      trayNode: <OutletGrid groupId={g.id} count={g.outletCount} connectedOutlets={[]} heightU={rackUnits || 1} batteryBacked={g.batteryBacked} surgeProtected={g.surgeProtected} rows={g.rows} columns={cols} hidden={g.hiddenPorts} onInspect={noop} pxPerInch={TRAY_PPI} />,
    });
  });
  psus.forEach((p, i) => {
    const pw = Math.round(ELEMENT_INCHES.psu.w * PX_PER_INCH);
    const ph = Math.round(ELEMENT_INCHES.psu.h * PX_PER_INCH);
    const tpw = Math.round(ELEMENT_INCHES.psu.w * TRAY_PPI);
    const tph = Math.round(ELEMENT_INCHES.psu.h * TRAY_PPI);
    blocks.push({
      id: `psu:${i}`, source: "psu", index: i,
      face: ((p.face as FaceId) ?? "REAR") as FaceId,
      row: p.gridRow ?? null, col: p.gridCol ?? null,
      span: blockSpan({ kind: "psu", rackUnits: rackUnits || 1 }, faceWidthInches),
      label: psus.length > 1 ? `PSU ${i + 1}` : "PSU",
      node: (
        <span className="flex items-center justify-center rounded-xs border border-status-green/60 bg-status-green/15 text-[9px] font-bold text-status-green"
          style={{ width: pw, height: ph }}>
          ⚡ PSU
        </span>
      ),
      trayNode: (
        <span className="flex items-center justify-center rounded-xs border border-status-green/60 bg-status-green/15 text-[8px] font-bold text-status-green"
          style={{ width: tpw, height: tph }}>
          PSU
        </span>
      ),
    });
  });
  if (builtIn.ethernet > 0 || builtIn.sfp > 0) {
    const builtInCount = (builtIn.ethernet ?? 0) + (builtIn.sfp ?? 0);
    const builtInSpec: BlockSpec = { kind: "builtin", ethernet: builtIn.ethernet, sfp: builtIn.sfp, rackUnits: rackUnits || 1 };
    const builtInCols = resolveColumns(builtInSpec, faceWidthInches);
    const builtInBounds = columnBounds(builtInSpec, faceWidthInches);
    blocks.push({
      id: "builtin:0", source: "builtin", index: 0,
      face: ((builtIn.face as FaceId) ?? "REAR") as FaceId,
      row: builtIn.gridRow, col: builtIn.gridCol,
      span: blockSpan(builtInSpec, faceWidthInches),
      label: "Built-in NICs",
      shape: { count: builtInCount, columns: null, cols: builtInCols, min: builtInBounds.minCols, max: builtInBounds.effMax, maxRows: builtInBounds.maxRows },
      node: <NicGrid assetId="preview" ethernet={builtIn.ethernet} sfp={builtIn.sfp} heightU={rackUnits || 1} onInspect={noop} pxPerInch={PX_PER_INCH} />,
      trayNode: <NicGrid assetId="preview" ethernet={builtIn.ethernet} sfp={builtIn.sfp} heightU={rackUnits || 1} onInspect={noop} pxPerInch={TRAY_PPI} />,
    });
  }
  annotations.forEach((a, i) => {
    const annoSpan = blockSpan({ kind: "annotation", annotationKind: a.kind, rackUnits: rackUnits || 1 }, faceWidthInches);
    const annoLabel = a.kind === "TEXT" ? (a.text || "Text label") : a.kind === "SPACER" ? "Spacer" : "Divider";
    blocks.push({
      id: `anno:${i}`, source: "anno", index: i,
      face: ((a.face as FaceId) ?? "FRONT") as FaceId,
      row: a.gridRow ?? null, col: a.gridCol ?? null,
      span: annoSpan,
      label: annoLabel,
      annotationKind: a.kind, text: a.text,
      node: <AnnotationVisual kind={a.kind} text={a.text} heightPx={annoSpan.h * ROW_H} />,
      trayNode: <AnnotationVisual kind={a.kind} text={a.text} heightPx={annoSpan.h * TRAY_ROW_H} />,
    });
  });

  const unplaced = blocks.filter((b) => b.row == null || b.col == null);
  const fitIssues = blocks.filter((b) => b.fits === false);

  if (!ready) {
    return (
      <p className="text-[12px] text-cat-ups">
        {rackUnits <= 0
          ? "Set the rack height (U) under Physical first."
          : "Set the item width under Physical first so the face can be sized correctly."}
      </p>
    );
  }

  const cellW = Math.round((faceWidthInches * PX_PER_INCH) / FACE_COLS);
  const gridWidthPx = cellW * FACE_COLS;
  const gridHeightPx = rackUnits * ROW_H;

  function tryPlace(id: string, face: FaceId, clientX: number, clientY: number, rect: DOMRect) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    const rawCol = Math.floor(((clientX - rect.left) / rect.width) * FACE_COLS) + 1;
    const rawRow = Math.floor((clientY - rect.top) / ROW_H) + 1;
    const { w, h } = block.span;
    const { row, col } = clampCell(rawRow, rawCol, w, h, rackUnits);
    // Reject if it would overlap another placed block on this face.
    const others = blocks.filter(
      (b) => b.id !== id && b.face === face && b.row != null && b.col != null,
    );
    const target = { row, col, w, h };
    if (others.some((o) => rectsOverlap(target, { row: o.row!, col: o.col!, w: o.span.w, h: o.span.h }))) {
      setError("That spot overlaps another element — drop it on free cells.");
      return;
    }
    setError(null);
    place(id, face, row, col);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11.5px] text-text-dim">
        Drag each element onto the Front or Rear grid to set exactly where it
        renders. Grids are sized to this item ({rackUnits}U
        {isTower ? ` · ${meta.widthInches}" wide` : ""}). Use the cols control on
        a block to shape its ports/bays (1×n, 2×n…). The preview below shows it
        in a rack.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-text-dim">Add</span>
        <Button type="button" variant="secondary" onClick={() => addAnnotation("TEXT")}>+ Text label</Button>
        <Button type="button" variant="secondary" onClick={() => addAnnotation("SPACER")}>+ Spacer</Button>
        <Button type="button" variant="secondary" onClick={() => addAnnotation("DIVIDER")}>+ Divider</Button>
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      {fitIssues.length > 0 && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
          <span className="font-bold">Doesn&apos;t fit the face: </span>
          {fitIssues.map((b) => b.fitLabel).join("; ")}. Reduce the count or
          increase the item&apos;s U height / width.
        </div>
      )}

      {/* Unplaced tray */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain");
          if (id) { place(id, null, null, null); setError(null); }
        }}
        className="rounded-md border border-dashed border-border bg-panel-2 p-2"
      >
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-text-dim">
          Unplaced (auto-layout) — drag onto a face
        </p>
        <div className="flex flex-wrap items-start gap-1.5">
          {unplaced.length === 0 && <span className="text-[11px] text-faint">Everything is placed.</span>}
          {unplaced.map((b) => (
            <TrayChip key={b.id} block={b} onTextChange={updateAnnotationText} onRemove={removeAnnotation} onColumns={setColumns} onVertical={setVertical} />
          ))}
        </div>
      </div>

      {/* Front / Rear grids sized to the real item */}
      <div className="flex flex-wrap gap-4">
        {(["FRONT", "REAR"] as FaceId[]).map((face) => {
          const placed = blocks.filter((b) => b.row != null && b.col != null && b.face === face);
          return (
            <div key={face}>
              <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-accent">{face} face</p>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) tryPlace(id, face, e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
                }}
                className="relative rounded-md border border-[#04070b] bg-[#0a0d12]"
                style={{
                  width: gridWidthPx,
                  height: gridHeightPx,
                  backgroundImage: `repeating-linear-gradient(to right, transparent, transparent ${cellW - 1}px, rgba(255,255,255,0.06) ${cellW - 1}px, rgba(255,255,255,0.06) ${cellW}px), repeating-linear-gradient(to bottom, transparent, transparent ${ROW_H - 1}px, rgba(255,255,255,0.06) ${ROW_H - 1}px, rgba(255,255,255,0.06) ${ROW_H}px)`,
                }}
              >
                {placed.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      position: "absolute",
                      left: (b.col! - 1) * cellW,
                      top: (b.row! - 1) * ROW_H,
                      width: b.span.w * cellW,
                      height: b.span.h * ROW_H,
                    }}
                  >
                    <GridChip block={b} onTextChange={updateAnnotationText} onRemove={removeAnnotation} onColumns={setColumns} onVertical={setVertical} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live in-rack preview with a U scale */}
      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-accent">Preview in rack</p>
        <div className="flex flex-wrap gap-4">
          {(["FRONT", "REAR"] as FaceId[]).map((face) => (
            <PreviewRack key={face} asset={asset} face={face} rackUnits={rackUnits} faceWidthInches={faceWidthInches} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AnnotationVisual({
  kind,
  text,
  heightPx,
}: {
  kind: string;
  text: string | null | undefined;
  heightPx: number;
}) {
  if (kind === "DIVIDER")
    return <span className="block w-px bg-text-dim/70" style={{ height: heightPx }} />;
  if (kind === "SPACER")
    return <span className="block h-4 w-4 rounded-[2px] border border-dashed border-border/60" />;
  return (
    <span className="whitespace-nowrap text-[9px] font-bold uppercase leading-tight tracking-[0.4px] text-text-dim">
      {text || "Label"}
    </span>
  );
}

// Compact per-block toolbar: rows×cols stepper, bay rotate toggle, text input,
// delete (annotations). Shared by tray + grid chips.
function ChipControls({
  block,
  onTextChange,
  onRemove,
  onColumns,
  onVertical,
}: {
  block: Block;
  onTextChange: (idx: number, text: string) => void;
  onRemove: (idx: number) => void;
  onColumns: (source: string, idx: number, columns: number) => void;
  onVertical: (idx: number, vertical: boolean) => void;
}) {
  if (block.source === "anno") {
    if (block.annotationKind === "TEXT") {
      return (
        <input
          value={block.text ?? ""}
          onChange={(e) => onTextChange(block.index, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          draggable={false}
          className="w-16 rounded bg-panel px-1 py-0.5 text-[9px] text-text outline-none placeholder:text-faint"
          placeholder="Label"
        />
      );
    }
    return null;
  }
  if (block.shape) {
    const { count, cols: cur, min, max, driveSize, vertical } = block.shape;
    const rows = Math.ceil(count / Math.max(1, cur));
    const canDec = cur > min;
    const canInc = cur < max;
    const isBayVerticalable = block.source === "bay" && driveSize && driveSize !== "LFF";
    return (
      <span
        className="flex items-center gap-px rounded bg-[#1a2030] px-1.5 py-0.5 text-[9px] text-text-dim"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {isBayVerticalable && (
          <button
            type="button"
            className={`px-0.5 font-bold transition-colors ${vertical ? "text-accent" : "text-text-dim hover:text-accent"}`}
            onClick={() => onVertical(block.index, !vertical)}
            title={vertical ? "Switch to horizontal bays" : "Rotate drives vertical (portrait slot, e.g. R730xd-style)"}
          >
            ↻
          </button>
        )}
        {/* one-tap: single row */}
        <button
          type="button"
          disabled={cur >= max}
          className="px-0.5 text-text-dim hover:text-accent disabled:opacity-30"
          onClick={() => cur < max && onColumns(block.source, block.index, max)}
          title="Single row"
        >
          ▭
        </button>
        {/* one-tap: vertical stack */}
        <button
          type="button"
          disabled={cur <= min}
          className="px-0.5 text-text-dim hover:text-accent disabled:opacity-30"
          onClick={() => cur > min && onColumns(block.source, block.index, min)}
          title="Vertical stack"
        >
          ▯
        </button>
        <button
          type="button"
          disabled={!canDec}
          className="px-0.5 text-text hover:text-accent disabled:opacity-30"
          onClick={() => canDec && onColumns(block.source, block.index, cur - 1)}
          title="Fewer columns"
        >
          −
        </button>
        <span className="tabular-nums text-text" title={`${rows} rows × ${cur} cols (${min}–${max} col range)`}>{rows}×{cur}</span>
        <button
          type="button"
          disabled={!canInc}
          className="px-0.5 text-text hover:text-accent disabled:opacity-30"
          onClick={() => canInc && onColumns(block.source, block.index, cur + 1)}
          title="More columns"
        >
          +
        </button>
      </span>
    );
  }
  return null;
}

type ChipProps = {
  block: Block;
  onTextChange: (idx: number, text: string) => void;
  onRemove: (idx: number) => void;
  onColumns: (source: string, idx: number, columns: number) => void;
  onVertical: (idx: number, vertical: boolean) => void;
};

function TrayChip({ block, onTextChange, onRemove, onColumns, onVertical }: ChipProps) {
  const chipW = block.span.w * TRAY_CELL_W;
  const chipH = block.span.h * TRAY_CELL_H;
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", block.id); e.dataTransfer.effectAllowed = "move"; }}
      className="group/chip relative flex cursor-grab flex-col gap-0.5 rounded border border-accent/40 bg-bg/70 p-1 active:cursor-grabbing"
      title={`${block.label} — drag onto a face`}
    >
      {/* Label so you know what you're dragging */}
      <span className="truncate text-[8px] font-semibold leading-none text-text-dim" style={{ maxWidth: Math.max(chipW, 36) }} title={block.label}>
        {block.label}
      </span>
      {/* Thumbnail sized to the block's grid footprint */}
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden"
        style={{ width: chipW, height: chipH, minWidth: chipW, minHeight: chipH }}
      >
        {block.trayNode}
      </div>
      <div className="flex items-center justify-between gap-1">
        <ChipControls block={block} onTextChange={onTextChange} onRemove={onRemove} onColumns={onColumns} onVertical={onVertical} />
        {block.source === "anno" && (
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(block.index)} className="text-[10px] text-faint hover:text-red-400" title="Delete">×</button>
        )}
      </div>
    </div>
  );
}

function GridChip({ block, onTextChange, onRemove, onColumns, onVertical }: ChipProps) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", block.id); e.dataTransfer.effectAllowed = "move"; }}
      className="group/chip relative flex h-full w-full cursor-grab items-center justify-center overflow-hidden rounded-xs border border-accent/50 bg-bg/40 active:cursor-grabbing"
      title={`${block.label} — drag to reposition`}
    >
      <div className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden">{block.node}</div>
      {/* hover toolbar */}
      <div className="absolute left-0 top-0 hidden items-center gap-1 rounded-br bg-panel/90 px-1 py-0.5 group-hover/chip:flex">
        <ChipControls block={block} onTextChange={onTextChange} onRemove={onRemove} onColumns={onColumns} onVertical={onVertical} />
        {block.source === "anno" && (
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemove(block.index)} className="text-[10px] text-faint hover:text-red-400" title="Delete">×</button>
        )}
      </div>
    </div>
  );
}

const PREVIEW_STRIPE: Record<string, string> = {
  SERVER: "var(--color-cat-server)", NUC: "var(--color-cat-server)", SBC: "var(--color-cat-server)",
  SWITCH: "var(--color-cat-switch)", PATCH_PANEL: "var(--color-cat-switch)",
  GATEWAY: "var(--color-cat-firewall)", FIREWALL: "var(--color-cat-firewall)",
  UPS: "var(--color-cat-ups)",
  PDU: "var(--color-cat-pdu)", SHELF: "var(--color-cat-pdu)", DRAWER: "var(--color-cat-pdu)",
  KVM: "var(--color-cat-kvm)",
  ACCESS_POINT: "var(--color-accent)",
};

// Fake rack one U taller than the item, with a U scale, rendering the device
// via the real diagram faceplate renderer so the preview matches topology.
function PreviewRack({
  asset,
  face,
  rackUnits,
  faceWidthInches,
}: {
  asset: DiagramAsset;
  face: FaceId;
  rackUnits: number;
  faceWidthInches: number;
}) {
  const totalU = rackUnits + 1;
  const innerWidth = Math.round(faceWidthInches * PREVIEW_PPI);
  const isOneU = rackUnits <= 1;
  const stripe = PREVIEW_STRIPE[asset.category] ?? "var(--color-faint)";
  return (
    <div>
      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-text-dim">{face}</p>
      <div className="flex">
        {/* U scale */}
        <div className="grid w-6 shrink-0 text-[8px] text-faint" style={{ gridTemplateRows: `repeat(${totalU}, ${PREVIEW_U}px)` }}>
          {Array.from({ length: totalU }, (_, i) => {
            const u = totalU - i;
            return (
              <div key={u} className="flex items-start justify-end pr-1 pt-0.5 leading-none">U{u}</div>
            );
          })}
        </div>
        <div
          className="relative rounded-[3px] border border-[#04070b] bg-[#0a0d12]"
          style={{
            width: innerWidth,
            height: totalU * PREVIEW_U,
            backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${PREVIEW_U - 1}px, rgba(255,255,255,0.05) ${PREVIEW_U - 1}px, rgba(255,255,255,0.05) ${PREVIEW_U}px)`,
          }}
        >
          <div
            className="absolute inset-x-0 bottom-0 flex overflow-hidden rounded border border-border/80 bg-linear-to-b from-[#272e37] to-[#1d232b]"
            style={{ height: rackUnits * PREVIEW_U }}
          >
            {/* Left category stripe */}
            <span aria-hidden className="absolute inset-y-0 left-0 z-10 w-0.75" style={{ background: stripe }} />
            {/* Nameplate column — exact match to DraggableAssetCell w-31 for rack items */}
            <div className={`flex w-31 min-w-12.5 shrink-0 flex-col justify-center border-r border-border/80 bg-bg/30 pl-2.5 pr-2 ${isOneU ? "" : "py-1"}`}>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-status-green shadow-[0_0_5px_var(--color-status-green)]" />
                <span className="truncate text-[11px] font-black leading-tight">{asset.codename}</span>
              </span>
              {!isOneU && (
                <span className="mt-0.5 truncate text-[9px] font-normal leading-tight text-text-dim">{asset.name}</span>
              )}
            </div>
            {/* Faceplate content */}
            <div className="flex flex-1 items-stretch gap-0 overflow-hidden px-1 py-0.5">
              <AssetFaceContent asset={asset} face={face} onInspect={noop} pxPerInch={PREVIEW_PPI} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildPreviewAsset(
  meta: FaceplateMeta,
  s: {
    bayZones: BayZoneInput[];
    portGroups: PortGroupInput[];
    outletGroups: OutletGroupInput[];
    psus: InlinePsuInput[];
    annotations: FaceplateAnnotationInput[];
    builtIn: BuiltInBlock;
    rackUnits: number;
  },
): DiagramAsset {
  return {
    id: "preview",
    codename: meta.codename || "PREVIEW",
    name: meta.name,
    category: meta.category,
    formFactor: meta.formFactor,
    startU: 1,
    rackUnits: s.rackUnits || 1,
    gridColumn: 0,
    columnSpan: meta.columnSpan,
    state: "IN_USE",
    requiresSupport: false,
    depthInches: null,
    rackRenderFrontPath: null,
    rackRenderRearPath: null,
    builtInGridRow: s.builtIn.gridRow,
    builtInGridCol: s.builtIn.gridCol,
    builtInFace: s.builtIn.face,
    annotations: s.annotations.map((a) => ({
      face: a.face ?? "FRONT",
      kind: a.kind,
      text: a.text ?? null,
      gridRow: a.gridRow ?? null,
      gridCol: a.gridCol ?? null,
    })),
    faceOrientation: "FRONT_FRONT",
    rackFace: null,
    patchPanelType: meta.patchPanelType,
    kvmChannelCount: meta.kvmChannelCount || null,
    builtInEthernetCount: s.builtIn.ethernet || null,
    builtInSfpCount: s.builtIn.sfp || null,
    psuCount: meta.psuCount || null,
    psus: s.psus.map((p, i) => ({
      id: p.id ?? `psu-${i}`,
      sortOrder: p.sortOrder ?? i,
      wattage: p.wattage ?? null,
      portCount: p.portCount ?? 1,
      side: p.side,
      state: p.state,
      face: p.face ?? null,
      gridRow: p.gridRow ?? null,
      gridCol: p.gridCol ?? null,
    })),
    connectedPsuOrders: [],
    connectedKvmChannels: [],
    bayZones: s.bayZones.map((z, i) => ({
      id: z.id ?? `bay-${i}`,
      name: z.name,
      faceSide: z.faceSide,
      driveSize: z.driveSize,
      bayCount: z.bayCount,
      gridRow: z.gridRow ?? null,
      gridCol: z.gridCol ?? null,
      rows: z.rows ?? null,
      columns: z.columns ?? null,
      vertical: z.vertical ?? false,
      drives: [],
    })),
    portGroups: s.portGroups.map((g, i) => ({
      id: g.id ?? `port-${i}`,
      name: g.name ?? null,
      portCount: g.portCount,
      portType: g.portType,
      portSpeed: g.portSpeed ?? null,
      side: g.side,
      face: g.face ?? null,
      rows: g.rows ?? null,
      columns: g.columns ?? null,
      hiddenPorts: g.hiddenPorts ?? null,
      gridRow: g.gridRow ?? null,
      gridCol: g.gridCol ?? null,
      connectedPorts: [],
      connectedRearPorts: [],
    })),
    outletGroups: s.outletGroups.map((g, i) => ({
      id: g.id ?? `outlet-${i}`,
      name: g.name ?? null,
      outletCount: g.outletCount,
      outletType: g.outletType ?? null,
      batteryBacked: g.batteryBacked,
      surgeProtected: g.surgeProtected,
      side: g.side,
      face: g.face ?? null,
      rows: g.rows ?? null,
      columns: g.columns ?? null,
      hiddenPorts: g.hiddenPorts ?? null,
      gridRow: g.gridRow ?? null,
      gridCol: g.gridCol ?? null,
      connectedOutlets: [],
    })),
    shelfItems: [],
    pciNics: [],
  };
}
