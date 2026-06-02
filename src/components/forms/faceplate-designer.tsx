"use client";

import type { BayZoneInput } from "@/lib/schemas/asset";
import type { PortGroupInput } from "@/lib/schemas/port-group";
import type { OutletGroupInput } from "@/lib/schemas/outlet-group";
import type {
  InlinePsuInput,
  FaceplateAnnotationInput,
} from "@/lib/schemas/inline-components";
import { FACE_COLS, type FaceId } from "@/lib/faceplate";
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
  widthInches: number; // 0 if unset
  columnSpan: number | null;
  kvmChannelCount: number;
  psuCount: number;
  patchPanelType: string | null;
};

// Pixels per real inch in the designer/preview. 19" rack ≈ 646px wide; 1U
// (1.75") ≈ 60px tall — so blocks keep their true proportions.
const PX_PER_INCH = 34;
const ROW_H = Math.round(1.75 * PX_PER_INCH); // px per U
const RACK_WIDTH_INCHES = 19;
const noop = () => {};

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
  const isTower = meta.formFactor === "TOWER";
  const rackUnits = Math.max(0, Math.floor(meta.rackUnits));
  // Gate: need a U height; towers also need a width before we can size the face.
  const ready = rackUnits > 0 && (!isTower || meta.widthInches > 0);

  // Build a DiagramAsset from the live form state so the chips + preview use the
  // exact same renderer as the topology diagram.
  const asset = buildPreviewAsset(meta, {
    bayZones,
    portGroups,
    outletGroups,
    psus,
    annotations,
    builtIn,
    rackUnits,
  });

  function place(id: string, face: FaceId | null, row: number | null, col: number | null) {
    const [kind, idxStr] = id.split(":");
    const idx = Number(idxStr);
    if (kind === "bay") {
      onBayZones(bayZones.map((z, i) => (i === idx ? { ...z, faceSide: (face ?? z.faceSide) as BayZoneInput["faceSide"], gridRow: row, gridCol: col } : z)));
    } else if (kind === "port") {
      onPortGroups(portGroups.map((g, i) => (i === idx ? { ...g, face: face ?? g.face ?? null, gridRow: row, gridCol: col } : g)));
    } else if (kind === "outlet") {
      onOutletGroups(outletGroups.map((g, i) => (i === idx ? { ...g, face: face ?? g.face ?? null, gridRow: row, gridCol: col } : g)));
    } else if (kind === "psu") {
      onPsus(psus.map((p, i) => (i === idx ? { ...p, face: face ?? p.face ?? null, gridRow: row, gridCol: col } : p)));
    } else if (kind === "anno") {
      onAnnotations(annotations.map((a, i) => (i === idx ? { ...a, face: (face ?? a.face ?? "FRONT") as FaceplateAnnotationInput["face"], gridRow: row, gridCol: col } : a)));
    } else if (kind === "builtin") {
      onBuiltIn({ ...builtIn, face: face ?? builtIn.face, gridRow: row, gridCol: col });
    }
  }

  function addAnnotation(kind: "TEXT" | "SPACER") {
    onAnnotations([
      ...annotations,
      { face: "FRONT", kind, text: kind === "TEXT" ? "Label" : null, gridRow: null, gridCol: null, rowSpan: 1, colSpan: kind === "SPACER" ? 2 : 3, sortOrder: annotations.length },
    ]);
  }
  function updateAnnotationText(idx: number, text: string) {
    onAnnotations(annotations.map((a, i) => (i === idx ? { ...a, text } : a)));
  }
  function removeAnnotation(idx: number) {
    onAnnotations(annotations.filter((_, i) => i !== idx));
  }

  // Normalised, renderable block list driven by the built DiagramAsset.
  const blocks: DesignerBlock[] = [];
  asset.bayZones.forEach((z, i) => {
    blocks.push({
      id: `bay:${i}`,
      face: (z.faceSide === "REAR" ? "REAR" : "FRONT") as FaceId,
      row: z.gridRow ?? null,
      col: z.gridCol ?? null,
      node: <DriveBayGrid zone={z} heightU={rackUnits || 1} onInspect={noop} />,
    });
  });
  asset.portGroups.forEach((g, i) => {
    blocks.push({
      id: `port:${i}`,
      face: ((g.face as FaceId) ?? "FRONT") as FaceId,
      row: g.gridRow ?? null,
      col: g.gridCol ?? null,
      node: (
        <PortGrid groupId={g.id} count={g.portCount} connectedPorts={[]} portType={g.portType} rows={g.rows} columns={g.columns} hidden={g.hiddenPorts} heightU={rackUnits || 1} onInspect={noop} />
      ),
    });
  });
  asset.outletGroups.forEach((g, i) => {
    blocks.push({
      id: `outlet:${i}`,
      face: ((g.face as FaceId) ?? "REAR") as FaceId,
      row: g.gridRow ?? null,
      col: g.gridCol ?? null,
      node: (
        <OutletGrid groupId={g.id} count={g.outletCount} connectedOutlets={[]} heightU={rackUnits || 1} batteryBacked={g.batteryBacked} surgeProtected={g.surgeProtected} rows={g.rows} columns={g.columns} hidden={g.hiddenPorts} onInspect={noop} />
      ),
    });
  });
  psus.forEach((p, i) => {
    blocks.push({
      id: `psu:${i}`,
      face: ((p.face as FaceId) ?? "REAR") as FaceId,
      row: p.gridRow ?? null,
      col: p.gridCol ?? null,
      node: (
        <span className="inline-flex h-5 items-center rounded-[2px] border border-status-green/60 bg-status-green/15 px-1.5 text-[9px] font-bold text-status-green">
          ⚡ PSU {i + 1}
        </span>
      ),
    });
  });
  if (builtIn.ethernet > 0 || builtIn.sfp > 0) {
    blocks.push({
      id: "builtin",
      face: ((builtIn.face as FaceId) ?? "REAR") as FaceId,
      row: builtIn.gridRow,
      col: builtIn.gridCol,
      node: <NicGrid assetId="preview" ethernet={builtIn.ethernet} sfp={builtIn.sfp} heightU={rackUnits || 1} onInspect={noop} />,
    });
  }
  annotations.forEach((a, i) => {
    blocks.push({
      id: `anno:${i}`,
      face: ((a.face as FaceId) ?? "FRONT") as FaceId,
      row: a.gridRow ?? null,
      col: a.gridCol ?? null,
      isAnnotation: true,
      annotationKind: a.kind,
      text: a.text,
      node:
        a.kind === "TEXT" ? (
          <span className="text-[9px] font-bold uppercase tracking-[0.5px] text-text-dim">{a.text || "Label"}</span>
        ) : (
          <span className="inline-block h-4 w-8 rounded-[2px] border border-dashed border-border" />
        ),
    });
  });

  const unplaced = blocks.filter((b) => b.row == null || b.col == null);

  if (!ready) {
    return (
      <p className="text-[12px] text-cat-ups">
        {rackUnits <= 0
          ? "Set the rack height (U) under Physical first."
          : "Set the item width under Physical first so the face can be sized correctly."}
      </p>
    );
  }

  const gridWidthInches = isTower ? meta.widthInches : meta.widthInches || RACK_WIDTH_INCHES;
  const gridWidthPx = Math.round(gridWidthInches * PX_PER_INCH);
  const gridHeightPx = rackUnits * ROW_H;

  function onDropFace(e: React.DragEvent, face: FaceId) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.min(FACE_COLS, Math.max(1, Math.floor(((e.clientX - rect.left) / rect.width) * FACE_COLS) + 1));
    const row = Math.min(rackUnits, Math.max(1, Math.floor((e.clientY - rect.top) / ROW_H) + 1));
    place(id, face, row, col);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11.5px] text-text-dim">
        Drag each element onto the Front or Rear grid to set where it renders.
        The grids are sized to this item ({rackUnits}U
        {isTower ? ` · ${meta.widthInches}" wide` : ""}). Drag back to the tray to
        clear a position. Port rows/columns and show/hide live in the group
        editors above; the preview below shows the device in a rack.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-text-dim">Add</span>
        <Button type="button" variant="secondary" onClick={() => addAnnotation("TEXT")}>+ Text label</Button>
        <Button type="button" variant="secondary" onClick={() => addAnnotation("SPACER")}>+ Spacer</Button>
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
        <div className="flex flex-wrap items-start gap-1.5">
          {unplaced.length === 0 && <span className="text-[11px] text-faint">Everything is placed.</span>}
          {unplaced.map((b) => (
            <BlockChip key={b.id} block={b} onTextChange={updateAnnotationText} onRemove={removeAnnotation} />
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
                onDrop={(e) => onDropFace(e, face)}
                className="relative rounded-md border border-[#04070b] bg-[#0a0d12]"
                style={{
                  width: gridWidthPx,
                  height: gridHeightPx,
                  backgroundImage: `repeating-linear-gradient(to right, transparent, transparent calc(${100 / FACE_COLS}% - 1px), rgba(255,255,255,0.05) calc(${100 / FACE_COLS}% - 1px), rgba(255,255,255,0.05) ${100 / FACE_COLS}%), repeating-linear-gradient(to bottom, transparent, transparent ${ROW_H - 1}px, rgba(255,255,255,0.05) ${ROW_H - 1}px, rgba(255,255,255,0.05) ${ROW_H}px)`,
                }}
              >
                {placed.map((b) => (
                  <div
                    key={b.id}
                    style={{ position: "absolute", left: `${(((b.col ?? 1) - 1) / FACE_COLS) * 100}%`, top: ((b.row ?? 1) - 1) * ROW_H }}
                  >
                    <BlockChip block={b} onTextChange={updateAnnotationText} onRemove={removeAnnotation} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live in-rack preview */}
      <div>
        <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-accent">
          Preview in rack
        </p>
        <div className="flex flex-wrap gap-4">
          {(["FRONT", "REAR"] as FaceId[]).map((face) => (
            <PreviewRack key={face} asset={asset} face={face} rackUnits={rackUnits} widthPx={gridWidthPx} />
          ))}
        </div>
      </div>
    </div>
  );
}

const PREVIEW_U = 40; // matches the topology diagram's 1U pixel height

// A tiny fake rack one U taller than the item, with the device card at the
// bottom rendered by the real diagram faceplate renderer.
function PreviewRack({
  asset,
  face,
  rackUnits,
  widthPx,
}: {
  asset: DiagramAsset;
  face: FaceId;
  rackUnits: number;
  widthPx: number;
}) {
  const totalU = rackUnits + 1;
  return (
    <div>
      <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-text-dim">{face}</p>
      <div
        className="relative rounded-[3px] border border-[#04070b] bg-[#0a0d12] p-1"
        style={{
          width: Math.min(widthPx + 8, 700),
          height: totalU * PREVIEW_U + 8,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${PREVIEW_U - 1}px, rgba(255,255,255,0.04) ${PREVIEW_U - 1}px, rgba(255,255,255,0.04) ${PREVIEW_U}px)`,
        }}
      >
        <div
          className="absolute inset-x-1 bottom-1 flex overflow-hidden rounded border border-border/80 bg-gradient-to-b from-[#272e37] to-[#1d232b]"
          style={{ height: rackUnits * PREVIEW_U }}
        >
          <div className="flex items-stretch gap-0 overflow-hidden px-1.5 py-0.5">
            <AssetFaceContent asset={asset} face={face} onInspect={noop} />
          </div>
        </div>
      </div>
    </div>
  );
}

type DesignerBlock = {
  id: string;
  face: FaceId;
  row: number | null;
  col: number | null;
  node: React.ReactNode;
  isAnnotation?: boolean;
  annotationKind?: "TEXT" | "SPACER";
  text?: string | null;
};

function BlockChip({
  block,
  onTextChange,
  onRemove,
}: {
  block: DesignerBlock;
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
      className="group/chip relative cursor-grab rounded border border-accent/40 bg-bg/70 p-1 active:cursor-grabbing"
      title="Drag to position"
    >
      {block.isAnnotation && block.annotationKind === "TEXT" ? (
        <input
          value={block.text ?? ""}
          onChange={(e) => onTextChange(annoIdx, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          draggable={false}
          className="w-20 bg-transparent text-[10px] text-text outline-none placeholder:text-faint"
          placeholder="Label"
        />
      ) : (
        // Real diagram content at true size; not interactive inside the chip.
        <div className="pointer-events-none">{block.node}</div>
      )}
      {block.isAnnotation && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(annoIdx)}
          className="absolute -right-1.5 -top-1.5 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-panel text-[9px] text-faint hover:text-red-400 group-hover/chip:flex"
          title="Delete"
        >
          ×
        </button>
      )}
    </div>
  );
}

// Map the live form state to a DiagramAsset for the chips + preview render.
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
