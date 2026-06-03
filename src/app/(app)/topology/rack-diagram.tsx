"use client";

import Link from "next/link";
import { enumLabel, PORT_TYPE_LABELS, type PORT_TYPES } from "@/lib/enums";
import { useDiagramSettings } from "@/components/providers/diagram-settings-provider";
import { DEFAULT_PORT_TYPE_LABELS } from "@/lib/diagram-settings";

const PORT_EMPTY_CLASS = "border-[#3a424d] bg-[#2a313b] text-faint";

// Connected-port colour by type — uses customisable CSS vars (overridable in Admin › Settings).
function portTypeClass(portType: string): string {
  switch (portType) {
    case "ETHERNET":      return "border-port-ethernet/60 bg-port-ethernet/25 text-port-ethernet";
    case "FAST_ETHERNET": return "border-port-fast-ethernet/60 bg-port-fast-ethernet/20 text-port-fast-ethernet";
    case "IPMI":          return "border-port-ipmi/50 bg-port-ipmi/15 text-port-ipmi";
    case "SFP":
    case "SFP_PLUS":
    case "SFP28":         return "border-port-sfp/50 bg-port-sfp/15 text-port-sfp";
    case "QSFP":
    case "QSFP_PLUS":
    case "QSFP28":        return "border-port-qsfp/60 bg-port-qsfp/20 text-port-qsfp";
    case "CONSOLE":       return "border-port-console/50 bg-port-console/15 text-port-console";
    case "USB":           return "border-port-usb/50 bg-port-usb/15 text-port-usb";
    default:              return "border-port-ethernet/60 bg-port-ethernet/25 text-port-ethernet";
  }
}

// Category accent colours from CLAUDE.md §8. The diagram uses the same
// tokens defined in globals.css so the panels match the rest of the app.
const CATEGORY_TONE: Record<string, { border: string; bg: string; tag: string }> = {
  SERVER:       { border: "border-cat-server/60",   bg: "bg-cat-server/10",   tag: "bg-cat-server/20 text-cat-server" },
  SWITCH:       { border: "border-cat-switch/60",   bg: "bg-cat-switch/10",   tag: "bg-cat-switch/20 text-cat-switch" },
  PATCH_PANEL:  { border: "border-cat-switch/60",   bg: "bg-cat-switch/10",   tag: "bg-cat-switch/20 text-cat-switch" },
  GATEWAY:      { border: "border-cat-firewall/60", bg: "bg-cat-firewall/10", tag: "bg-cat-firewall/20 text-cat-firewall" },
  FIREWALL:     { border: "border-cat-firewall/60", bg: "bg-cat-firewall/10", tag: "bg-cat-firewall/20 text-cat-firewall" },
  UPS:          { border: "border-cat-ups/60",      bg: "bg-cat-ups/10",      tag: "bg-cat-ups/20 text-cat-ups" },
  PDU:          { border: "border-cat-pdu/60",      bg: "bg-cat-pdu/10",      tag: "bg-cat-pdu/20 text-cat-pdu" },
  KVM:          { border: "border-cat-kvm/60",      bg: "bg-cat-kvm/10",      tag: "bg-cat-kvm/20 text-cat-kvm" },
  ACCESS_POINT: { border: "border-accent/60",       bg: "bg-accent/10",       tag: "bg-accent/20 text-accent" },
  NUC:          { border: "border-cat-server/60",   bg: "bg-cat-server/10",   tag: "bg-cat-server/20 text-cat-server" },
  SBC:          { border: "border-cat-server/60",   bg: "bg-cat-server/10",   tag: "bg-cat-server/20 text-cat-server" },
  SHELF:        { border: "border-cat-pdu/60",      bg: "bg-cat-pdu/10",      tag: "bg-cat-pdu/20 text-cat-pdu" },
  DRAWER:       { border: "border-cat-pdu/60",      bg: "bg-cat-pdu/10",      tag: "bg-cat-pdu/20 text-cat-pdu" },
  BLANK_PANEL:  { border: "border-border",          bg: "bg-panel-2",         tag: "bg-panel-2 text-faint" },
  OTHER:        { border: "border-border",          bg: "bg-panel-2",         tag: "bg-panel-2 text-text-dim" },
};

export type DiagramAsset = {
  id: string;
  codename: string;
  name: string;
  category: string;
  formFactor: string;
  startU: number | null;
  rackUnits: number | null;
  gridColumn: number | null;
  columnSpan: number | null;
  state: string;
  requiresSupport: boolean;
  depthInches: number | null;
  widthInches?: number | null;
  // Image-render mode (issue 4): per-face image sized to the asset's U-space.
  rackRenderFrontPath?: string | null;
  rackRenderRearPath?: string | null;
  // FRONT_FRONT = normal; FRONT_REAR = reversed mount (topology swaps faces).
  // Only relevant for full-depth items (rackFace = null).
  faceOrientation: string | null;
  // For thin items: which rack face this asset is mounted from.
  // null = full-depth (renders in both faces). "FRONT" / "REAR" = thin item.
  // KEYSTONE patch panels are full-depth (rackFace = null); COUPLER are thin.
  rackFace: string | null;
  // "KEYSTONE" = permanent punch-down rear (full-depth); "COUPLER" = ethernet both sides (thin).
  patchPanelType: string | null;
  kvmChannelCount: number | null;
  builtInEthernetCount: number | null;
  builtInSfpCount: number | null;
  psuCount: number | null;
  psus: {
    id: string;
    sortOrder: number;
    wattage: number | null;
    portCount: number;
    side: string;
    state: string;
    face?: string | null;
    gridRow?: number | null;
    gridCol?: number | null;
  }[];
  // sort orders (0-based) of PSUs that have an incoming POWER connection
  connectedPsuOrders: number[];
  // channel numbers (1-based) that have a KVM Connection on the A-end
  connectedKvmChannels: number[];
  // Faceplate designer: built-in NIC strip placement + custom annotations.
  builtInGridRow?: number | null;
  builtInGridCol?: number | null;
  builtInFace?: string | null;
  annotations?: {
    face: string;
    kind: string;
    text: string | null;
    gridRow: number | null;
    gridCol: number | null;
  }[];
  bayZones: {
    id: string;
    name: string;
    faceSide: string;
    driveSize: string;
    bayCount: number;
    gridRow?: number | null;
    gridCol?: number | null;
    rows?: number | null;
    columns?: number | null;
    vertical?: boolean | null;
    drives: {
      id: string;
      name: string;
      kind: string;
      capacityGB: number;
      bayNumber: number | null;
    }[];
  }[];
  portGroups: {
    id: string;
    name: string | null;
    portCount: number;
    portType: (typeof PORT_TYPES)[number];
    portSpeed: string | null;
    side: string;
    // faceplate-editor layout overrides (issue 5)
    face?: string | null;
    rows?: number | null;
    columns?: number | null;
    hiddenPorts?: number[] | null;
    gridRow?: number | null;
    gridCol?: number | null;
    // port numbers (1-based) that have a Connection on them (bEnd for patch panels = front)
    connectedPorts: number[];
    // patch panels only: aEnd connections = rear/permanent side
    connectedRearPorts?: number[];
  }[];
  outletGroups: {
    id: string;
    name: string | null;
    outletCount: number;
    outletType: string | null;
    batteryBacked: boolean;
    surgeProtected: boolean;
    side: string;
    face?: string | null;
    rows?: number | null;
    columns?: number | null;
    hiddenPorts?: number[] | null;
    gridRow?: number | null;
    gridCol?: number | null;
    // outlet numbers (1-based) that have a Connection on them
    connectedOutlets: number[];
  }[];
  shelfItems: {
    id: string;
    codename: string;
    name: string;
    category: string;
  }[];
  // PCIe NIC/RAID cards installed in slots — extra ports shown on rear face
  pciNics: {
    componentId: string;
    slotSortOrder: number;
    portCount: number;
    portType: string;
    portSpeed: string | null;
    componentName: string;
  }[];
};

export type DiagramRack = {
  id: string;
  name: string;
  totalU: number;
  columnCount: number;
  depthInches: number | null;
  isLocked: boolean;
  assets: DiagramAsset[];
};

// One U row = 40px tall on screen. Matches topology-view.tsx U_PX.
const U_PX = 40;

function tone(category: string) {
  return CATEGORY_TONE[category] ?? CATEGORY_TONE.OTHER;
}

// CSS-grid placement for an asset. Returns null for assets the renderer
// can't place (no startU yet — those belong in the storage strip until
// dragged in).
function gridPlacement(
  asset: DiagramAsset,
  totalU: number,
  columnCount: number,
): React.CSSProperties | null {
  if (asset.startU == null || asset.rackUnits == null) return null;
  // U1 is at the bottom; CSS grid rows count top-down.
  const rowStart = totalU - asset.startU - asset.rackUnits + 2;
  const span = asset.rackUnits;
  // Rack-form gear spans the full width; towers use grid column / span.
  const isRack = asset.formFactor === "RACK";
  const colStart = isRack ? 1 : (asset.gridColumn ?? 0) + 1;
  const colSpan = isRack ? columnCount : asset.columnSpan ?? 1;
  return {
    gridRowStart: rowStart,
    gridRowEnd: rowStart + span,
    gridColumnStart: colStart,
    gridColumnEnd: colStart + colSpan,
  };
}

export function RackDiagram({
  rack,
  face,
  showLegend = false,
}: {
  rack: DiagramRack;
  face: "FRONT" | "REAR";
  showLegend?: boolean;
}) {
  const placed = rack.assets.filter(
    (a) => a.startU != null && a.rackUnits != null,
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-accent">
          {face} face
        </h3>
        <span className="text-[10px] text-text-dim">
          {rack.totalU}U · {rack.columnCount} cols
        </span>
      </div>
      <div className="flex">
        <UScale totalU={rack.totalU} />
        <div
          className="relative grid flex-1 rounded-md border border-border bg-panel"
          style={{
            gridTemplateRows: `repeat(${rack.totalU}, ${U_PX}px)`,
            gridTemplateColumns: `repeat(${rack.columnCount}, minmax(0, 1fr))`,
          }}
        >
          {/* U gridlines so empty slots stay visible. */}
          {Array.from({ length: rack.totalU }, (_, i) => (
            <div
              key={`row-${i}`}
              className="pointer-events-none border-t border-border/30"
              style={{
                gridRow: `${i + 1} / span 1`,
                gridColumn: `1 / span ${rack.columnCount}`,
              }}
            />
          ))}
          {placed.map((a) => {
            const style = gridPlacement(a, rack.totalU, rack.columnCount);
            if (!style) return null;
            return (
              <AssetCell key={a.id} asset={a} face={face} style={style} />
            );
          })}
        </div>
      </div>
      {showLegend && <DiagramLegend />}
    </div>
  );
}

// Left-side ruler so the U numbers are visible at a glance. U1 is at the
// bottom to match how racks are physically labelled.
function UScale({ totalU }: { totalU: number }) {
  return (
    <div
      className="grid w-7 shrink-0 text-[9px] text-faint"
      style={{ gridTemplateRows: `repeat(${totalU}, ${U_PX}px)` }}
    >
      {Array.from({ length: totalU }, (_, i) => {
        const u = totalU - i;
        return (
          <div
            key={u}
            className="flex items-start justify-end pr-1.5 pt-0.5 leading-none"
          >
            U{u}
          </div>
        );
      })}
    </div>
  );
}

// Compact two-row port indicator for 1U patch panels — fits in ~10px height.
// Each port is a 4×4px dot: green=connected, amber=connected(rear), dark=empty.
function PPCompactRow({
  label,
  count,
  connected,
  isRear,
}: {
  label: string;
  count: number;
  connected: number[];
  isRear: boolean;
}) {
  const connSet = new Set(connected);
  const activeClass = isRear
    ? "bg-[#d9a441]/70 border-[#d9a441]/50"
    : "bg-status-green/70 border-status-green/50";
  const emptyClass = "bg-[#2a313b] border-[#3a424d]";
  return (
    <div className="flex items-center gap-0.5 overflow-hidden">
      <span className="w-[7px] shrink-0 text-[5px] font-bold leading-none text-faint">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap gap-px overflow-hidden">
        {Array.from({ length: count }, (_, i) => {
          const n = i + 1;
          return (
            <div
              key={n}
              className={`h-[4px] w-[4px] shrink-0 rounded-[0.5px] border ${connSet.has(n) ? activeClass : emptyClass}`}
              title={`Port ${n}${connSet.has(n) ? " — connected" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function AssetCell({
  asset,
  face,
  style,
}: {
  asset: DiagramAsset;
  face: "FRONT" | "REAR";
  style: React.CSSProperties;
}) {
  const t = tone(asset.category);
  const isOneU = (asset.rackUnits ?? 1) <= 1;
  const isPatchPanel = asset.category === "PATCH_PANEL";

  return (
    <Link
      href={`/assets/${asset.id}`}
      style={style}
      className={`group relative m-0.5 flex min-w-0 flex-col overflow-hidden rounded border-2 ${t.border} ${t.bg} px-1.5 py-1 text-[10px] text-text transition-colors hover:brightness-125`}
      title={`${asset.codename} — ${asset.name}`}
    >
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 rounded-full ${asset.state === "IN_USE" ? "bg-status-green" : "bg-faint"}`}
        />
        <span className="truncate font-black uppercase tracking-wide">
          {asset.codename}
        </span>
        <span
          className={`shrink-0 rounded-sm px-1 py-px text-[8px] font-bold uppercase tracking-wider ${t.tag}`}
        >
          {enumLabel(asset.category)}
        </span>
      </div>
      {!isOneU && (
        <div className="truncate text-[9.5px] text-text-dim">{asset.name}</div>
      )}
      {/* Sub-content (drive bays / port grid / outlets etc.) only renders
          when there is room — i.e. on 2U+ assets. The 1U case shows the
          plate only, per CLAUDE.md §7. Exception: patch panels always show
          compact port rows regardless of U height. */}
      {!isOneU && (
        <div className="mt-1 min-h-0 flex-1">
          <AssetFaceContent asset={asset} face={face} />
        </div>
      )}
      {isOneU && isPatchPanel && asset.portGroups.length > 0 && (
        <div className="mt-0.5 flex flex-col gap-px">
          {asset.portGroups.map((pg) => {
            if (asset.patchPanelType === "KEYSTONE") {
              // Full-depth: front face shows front (bEnd) ports; rear face shows rear (aEnd) ports.
              if (face === "FRONT") {
                return (
                  <PPCompactRow
                    key={pg.id}
                    label="F"
                    count={pg.portCount}
                    connected={pg.connectedPorts}
                    isRear={false}
                  />
                );
              } else {
                return (
                  <PPCompactRow
                    key={pg.id}
                    label="P"
                    count={pg.portCount}
                    connected={pg.connectedRearPorts ?? []}
                    isRear={true}
                  />
                );
              }
            }
            // COUPLER: show both front and rear rows on the same face.
            return (
              <div key={pg.id} className="flex flex-col gap-px">
                <PPCompactRow
                  label="F"
                  count={pg.portCount}
                  connected={pg.connectedPorts}
                  isRear={false}
                />
                <PPCompactRow
                  label="R"
                  count={pg.portCount}
                  connected={pg.connectedRearPorts ?? []}
                  isRear={true}
                />
              </div>
            );
          })}
        </div>
      )}
    </Link>
  );
}

function AssetFaceContent({
  asset,
  face,
}: {
  asset: DiagramAsset;
  face: "FRONT" | "REAR";
}) {
  const cat = asset.category;
  // Apply face-orientation swap: a FRONT_REAR device shows its physical rear
  // content on the rack-front and vice versa.
  const effectiveFace =
    asset.faceOrientation === "FRONT_REAR"
      ? face === "FRONT"
        ? "REAR"
        : "FRONT"
      : face;

  const driveBaysOnFace = asset.bayZones.filter((z) =>
    effectiveFace === "FRONT" ? z.faceSide !== "REAR" : z.faceSide === "REAR",
  );

  if (effectiveFace === "FRONT") {
    if (cat === "SERVER" || cat === "NUC" || cat === "SBC") {
      return <DriveBays zones={driveBaysOnFace} />;
    }
    if (cat === "SWITCH" || cat === "GATEWAY" || cat === "FIREWALL" || cat === "ACCESS_POINT") {
      return <PortStrip groups={asset.portGroups} />;
    }
    if (cat === "PATCH_PANEL") {
      if (asset.patchPanelType === "COUPLER") {
        // Both front and rear sections shown on the same face.
        return (
          <div className="flex flex-col gap-1">
            {asset.portGroups.map((g) => (
              <div key={g.id}>
                <div className="mb-0.5 flex items-baseline justify-between">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-dim">
                    {g.name ?? PORT_TYPE_LABELS[g.portType]} · Front
                  </span>
                </div>
                <PortStripRow group={g} connected={g.connectedPorts} />
                <div className="mb-0.5 mt-1 flex items-baseline justify-between">
                  <span className="text-[8.5px] font-bold uppercase tracking-wider text-cat-ups">
                    {g.name ?? PORT_TYPE_LABELS[g.portType]} · Rear
                  </span>
                </div>
                <PortStripRow group={g} connected={g.connectedRearPorts ?? []} isRear />
              </div>
            ))}
          </div>
        );
      }
      // KEYSTONE front face: show front (bEnd) ports.
      return <PortStrip groups={asset.portGroups} />;
    }
    if (cat === "KVM") {
      return <KvmChannels count={asset.kvmChannelCount ?? 0} connectedKvmChannels={asset.connectedKvmChannels} />;
    }
    if (cat === "UPS") {
      return <UpsFront />;
    }
    if (cat === "PDU") {
      return <PduFront />;
    }
    if (cat === "SHELF") {
      return <ShelfItems items={asset.shelfItems} />;
    }
    if (cat === "DRAWER") {
      return <DrawerFace />;
    }
    return null;
  }

  // REAR face
  if (cat === "PATCH_PANEL") {
    // Only KEYSTONE panels reach the rear face (COUPLER panels are thin + shown on one face only).
    if (asset.portGroups.length === 0) {
      return (
        <p className="text-[9px] uppercase tracking-wide text-faint">
          Punch-down side
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-1">
        {asset.portGroups.map((g) => (
          <div key={g.id}>
            <div className="mb-0.5 flex items-baseline justify-between">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-cat-ups">
                {g.name ?? PORT_TYPE_LABELS[g.portType]} · Permanent
              </span>
            </div>
            <PortStripRow group={g} connected={g.connectedRearPorts ?? []} isRear />
          </div>
        ))}
      </div>
    );
  }
  if (cat === "SERVER" || cat === "NUC" || cat === "SBC") {
    return (
      <div className="flex flex-col gap-1">
        {driveBaysOnFace.length > 0 && (
          <DriveBays zones={driveBaysOnFace} />
        )}
        <ServerRear asset={asset} />
      </div>
    );
  }
  if (cat === "UPS" || cat === "PDU") {
    return <OutletStrip groups={asset.outletGroups} isUps={cat === "UPS"} />;
  }
  if (cat === "SWITCH" || cat === "GATEWAY" || cat === "FIREWALL") {
    return (
      <p className="text-[9px] uppercase tracking-wide text-faint">
        Rear
      </p>
    );
  }
  return null;
}

function DriveBays({
  zones,
}: {
  zones: DiagramAsset["bayZones"];
}) {
  if (zones.length === 0) {
    return (
      <p className="text-[9px] uppercase tracking-wide text-faint">
        No drive bays
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {zones.map((z) => {
        const drivesByBay = new Map(
          z.drives
            .filter((d) => d.bayNumber != null)
            .map((d) => [d.bayNumber as number, d]),
        );
        const colsPerRow = z.driveSize === "LFF" ? 6 : z.driveSize === "M2" ? 4 : 12;
        const bays = Array.from({ length: z.bayCount }, (_, i) => i + 1);
        return (
          <div key={z.id}>
            <div className="flex items-baseline justify-between">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-dim">
                {z.name}
              </span>
              <span className="text-[8.5px] text-faint">
                {z.drives.length}/{z.bayCount} {z.driveSize}
              </span>
            </div>
            <div
              className="grid gap-px"
              style={{
                gridTemplateColumns: `repeat(${colsPerRow}, minmax(0, 1fr))`,
              }}
            >
              {bays.map((n) => {
                const drive = drivesByBay.get(n);
                return (
                  <div
                    key={n}
                    className={`h-3.5 truncate rounded-sm border px-0.5 text-center text-[8px] leading-none ${
                      drive
                        ? "border-status-green/60 bg-status-green/30 text-text"
                        : "border-border/50 bg-panel-2/60 text-faint"
                    }`}
                    title={
                      drive
                        ? `Bay ${n}: ${drive.name} · ${drive.kind} · ${drive.capacityGB} GB`
                        : `Bay ${n}: empty`
                    }
                  >
                    {drive ? drive.kind.slice(0, 3) : ""}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Single port-group row (used by PortStrip and patch panel sections).
function PortStripRow({
  group: g,
  connected: connectedArr,
  isRear = false,
}: {
  group: DiagramAsset["portGroups"][number];
  connected: number[];
  isRear?: boolean;
}) {
  const { portLabels } = useDiagramSettings();
  const cols = Math.min(g.portCount, 48);
  const ports = Array.from({ length: g.portCount }, (_, i) => i + 1);
  const connectedSet = new Set(connectedArr);
  const shortLabel = portLabels[g.portType] ?? DEFAULT_PORT_TYPE_LABELS[g.portType] ?? g.portType.slice(0, 3);
  const connectedClass = isRear
    ? "border-[#d9a441]/60 bg-[#3d2a08]/50 text-cat-ups"
    : portTypeClass(g.portType);
  return (
    <div
      className="grid gap-px"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {ports.map((n) => {
        const connected = connectedSet.has(n);
        return (
          <div
            key={n}
            className={`h-3.5 truncate rounded-sm border px-0.5 text-center text-[7px] font-bold leading-3.5 ${
              connected ? connectedClass : PORT_EMPTY_CLASS
            }`}
            title={`${PORT_TYPE_LABELS[g.portType]} port ${n}${connected ? " — connected" : " — empty"}`}
          >
            {shortLabel}
          </div>
        );
      })}
    </div>
  );
}

function PortStrip({
  groups,
}: {
  groups: DiagramAsset["portGroups"];
}) {
  if (groups.length === 0) {
    return (
      <p className="text-[9px] uppercase tracking-wide text-faint">No ports</p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {groups.map((g) => (
        <div key={g.id}>
          <div className="flex items-baseline justify-between">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-dim">
              {g.name ?? PORT_TYPE_LABELS[g.portType]}
            </span>
            <span className="text-[8.5px] text-faint">
              {g.portCount} × {PORT_TYPE_LABELS[g.portType]}
              {g.portSpeed ? ` · ${g.portSpeed}` : ""}
            </span>
          </div>
          <PortStripRow group={g} connected={g.connectedPorts} />
        </div>
      ))}
    </div>
  );
}

function OutletStrip({
  groups,
  isUps,
}: {
  groups: DiagramAsset["outletGroups"];
  isUps: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-dim">
          Power out
        </span>
        {isUps && (
          <span className="text-[8.5px] uppercase text-cat-ups">
            ▌ Battery
          </span>
        )}
      </div>
      {groups.length === 0 ? (
        <p className="text-[9px] uppercase tracking-wide text-faint">
          No outlets
        </p>
      ) : (
        groups.map((g) => {
          const outlets = Array.from({ length: g.outletCount }, (_, i) => i + 1);
          const connectedSet = new Set(g.connectedOutlets);
          return (
            <div key={g.id}>
              <div className="flex items-baseline justify-between">
                <span className="text-[8.5px] text-text-dim">
                  {g.name ?? g.outletType ?? "Outlets"}
                </span>
                <span className="text-[8.5px] text-faint">
                  {g.outletCount}
                  {g.batteryBacked ? " · battery" : g.surgeProtected ? " · surge" : ""}
                </span>
              </div>
              <div
                className="grid gap-0.5"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(g.outletCount, 12)}, minmax(0, 1fr))`,
                }}
              >
                {outlets.map((n) => {
                  const connected = connectedSet.has(n);
                  const icon = g.batteryBacked ? "B" : g.surgeProtected ? "~" : null;
                  return (
                    <div
                      key={n}
                      className={`flex h-3 items-center justify-center rounded-full border text-[5px] font-bold leading-none ${
                        connected
                          ? "border-status-green/60 bg-status-green/25 text-status-green"
                          : "border-[#3a424d] bg-[#2a313b] text-faint"
                      }`}
                      title={`Outlet ${n}${connected ? " (connected)" : g.batteryBacked ? " (battery-backed)" : g.surgeProtected ? " (surge-protected)" : ""}`}
                    >
                      {icon && <span className={connected ? "text-[#0d1117]" : ""}>{icon}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function KvmChannels({ count, connectedKvmChannels }: { count: number; connectedKvmChannels: number[] }) {
  const channels = Array.from({ length: count }, (_, i) => i + 1);
  const connectedSet = new Set(connectedKvmChannels);
  return (
    <div>
      <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-dim">
        Channels
      </span>
      <div
        className="mt-0.5 grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${Math.min(count, 8) || 1}, minmax(0, 1fr))`,
        }}
      >
        {channels.map((n) => {
          const connected = connectedSet.has(n);
          return (
            <div
              key={n}
              className={`rounded border text-center text-[8.5px] font-bold ${
                connected
                  ? "border-cat-kvm bg-cat-kvm text-[#0d1117]"
                  : "border-cat-kvm/40 bg-cat-kvm/15 text-cat-kvm"
              }`}
              title={`Channel ${n}${connected ? " — connected" : ""}`}
            >
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpsFront() {
  return (
    <div className="flex h-full items-center justify-between rounded-sm bg-panel-2/60 px-2 py-1">
      <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-dim">
        UPS
      </span>
      <span className="text-[10px] font-black text-cat-ups">▌▌▌▌▌</span>
    </div>
  );
}

function PduFront() {
  return (
    <div className="flex h-full items-center justify-between rounded-sm bg-panel-2/60 px-2 py-1">
      <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-dim">
        PDU
      </span>
    </div>
  );
}

function DrawerFace() {
  return (
    <div className="flex h-full items-center justify-center rounded-sm bg-panel-2/60">
      <span className="text-[8.5px] font-bold uppercase tracking-wider text-faint">
        ▬▬▬ Drawer ▬▬▬
      </span>
    </div>
  );
}

function ServerRear({ asset }: { asset: DiagramAsset }) {
  // All portGroups show on the rear face for servers — server I/O is always
  // on the rear panel regardless of which chassis side a group is mounted on.
  // Fall back to raw builtIn counts when no port groups exist.
  const { portLabels } = useDiagramSettings();
  const rearPortGroups = asset.portGroups;
  const nics = asset.builtInEthernetCount ?? 0;
  const sfps = asset.builtInSfpCount ?? 0;
  const hasBuiltInPorts = nics > 0 || sfps > 0;

  // PSUs — structured rows preferred; fall back to count.
  const psuRows = asset.psus.length > 0 ? asset.psus : null;
  const psuCount = psuRows ? psuRows.length : (asset.psuCount ?? 0);
  const connectedPsuSet = new Set(asset.connectedPsuOrders);

  // Separate LAN groups from IPMI so we can fall back to builtIn NIC counts
  // when ONLY IPMI groups exist (not enough to suppress the NicGrid fallback).
  const lanGroups = rearPortGroups.filter((g) => g.portType !== "IPMI");
  const ipmiGroups = rearPortGroups.filter((g) => g.portType === "IPMI");

  if (lanGroups.length === 0 && !hasBuiltInPorts && ipmiGroups.length === 0 && psuCount === 0)
    return null;

  return (
    <div className="flex flex-col gap-1">
      {/* Structured LAN port groups (connection-status-aware) */}
      {lanGroups.length > 0 && <PortStrip groups={lanGroups} />}
      {/* IPMI always gets its own strip below LAN */}
      {ipmiGroups.length > 0 && <PortStrip groups={ipmiGroups} />}

      {/* Fallback: built-in port counts when no structured LAN groups exist */}
      {lanGroups.length === 0 && hasBuiltInPorts && (
        <div>
          <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-dim">
            NICs
          </span>
          <div className="flex gap-px">
            {Array.from({ length: nics }, (_, i) => (
              <div
                key={`nic-${i}`}
                className={`h-3.5 w-5 truncate rounded-sm border px-0.5 text-center text-[7px] font-bold leading-3.5 ${PORT_EMPTY_CLASS}`}
                title={`Built-in Ethernet ${i + 1} — no connection data`}
              >
                GbE
              </div>
            ))}
            {Array.from({ length: sfps }, (_, i) => (
              <div
                key={`sfp-${i}`}
                className={`h-3.5 w-5 truncate rounded-sm border px-0.5 text-center text-[7px] font-bold leading-3.5 ${PORT_EMPTY_CLASS}`}
                title={`Built-in SFP ${i + 1} — no connection data`}
              >
                S+
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PCIe NIC/RAID card ports — shown after built-in NICs */}
      {asset.pciNics.length > 0 && (
        <div>
          <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-dim">
            PCIe
          </span>
          <div className="mt-0.5 flex flex-col gap-0.5">
            {asset.pciNics.map((nic) => {
              const shortLabel = portLabels[nic.portType] ?? DEFAULT_PORT_TYPE_LABELS[nic.portType] ?? nic.portType.slice(0, 3).toUpperCase();
              const slotLabel = `Slot ${nic.slotSortOrder + 1}`;
              // If too many ports to render inline, show a compact summary badge
              if (nic.portCount > 8) {
                return (
                  <div key={nic.componentId} className="text-[7.5px] text-faint">
                    {slotLabel}: {nic.portCount}× {shortLabel}
                    {nic.portSpeed ? ` ${nic.portSpeed}` : ""}
                  </div>
                );
              }
              return (
                <div key={nic.componentId} className="flex items-center gap-1">
                  <span
                    className="w-[28px] shrink-0 text-[7px] text-faint"
                    title={nic.componentName}
                  >
                    {slotLabel}
                  </span>
                  <div className="flex gap-px">
                    {Array.from({ length: nic.portCount }, (_, i) => (
                      <div
                        key={i}
                        className={`h-3.5 w-5 truncate rounded-sm border px-0.5 text-center text-[7px] font-bold leading-3.5 ${PORT_EMPTY_CLASS}`}
                        title={`${slotLabel} (${nic.componentName}) Port ${i + 1}${nic.portSpeed ? ` · ${nic.portSpeed}` : ""}`}
                      >
                        {shortLabel}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PSUs — green when connected, amber when not */}
      {psuCount > 0 && (
        <div>
          <span className="text-[8.5px] font-bold uppercase tracking-wider text-text-dim">
            PSU
          </span>
          <div className="flex gap-px">
            {psuRows
              ? psuRows.map((p, i) => {
                  const connected = connectedPsuSet.has(p.sortOrder);
                  return (
                    <div
                      key={p.id}
                      className={`flex h-3.5 min-w-[18px] items-center justify-center gap-px rounded-sm border px-0.5 text-[7px] font-bold ${
                        connected
                          ? "border-status-green/60 bg-status-green/25 text-status-green"
                          : "border-[#3a424d] bg-panel-2/60 text-faint"
                      }`}
                      title={`PSU ${i + 1}${p.wattage ? ` — ${p.wattage}W` : ""}${connected ? " — connected" : " — not connected"}`}
                    >
                      <span>⚡</span>
                    </div>
                  );
                })
              : Array.from({ length: psuCount }, (_, i) => (
                  <div
                    key={`psu-${i}`}
                    className="flex h-3.5 min-w-[18px] items-center justify-center rounded-sm border border-[#3a424d] bg-panel-2/60 px-0.5 text-[7px] text-faint"
                    title={`PSU ${i + 1}`}
                  >
                    ⚡
                  </div>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiagramLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 rounded-md border border-border/40 bg-panel-2/60 px-3 py-2 text-[9.5px] text-text-dim">
      {/* Port colors */}
      <div className="flex items-center gap-2">
        <span className="font-bold uppercase tracking-wider text-faint">Port color</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-5 rounded-sm border border-[#3a424d] bg-[#2a313b] text-center text-[7px] font-bold leading-3.5 text-faint">GbE</span>
          Not connected
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-5 rounded-sm border border-status-green/60 bg-status-green/25 text-center text-[7px] font-bold leading-3.5 text-status-green">GbE</span>
          Ethernet
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-5 rounded-sm border border-cat-firewall/50 bg-cat-firewall/15 text-center text-[7px] font-bold leading-3.5 text-cat-firewall/70">BMC</span>
          IPMI
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-5 rounded-sm border border-cat-switch/50 bg-cat-switch/15 text-center text-[7px] font-bold leading-3.5 text-cat-switch/70">S+</span>
          SFP / fiber
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-5 rounded-sm border border-cat-kvm/50 bg-cat-kvm/15 text-center text-[7px] font-bold leading-3.5 text-cat-kvm/70">CON</span>
          Console
        </span>
        <span className="text-faint">—</span>
        <span className="font-bold uppercase tracking-wider text-faint">Port symbols</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-5 rounded-sm border border-[#3a424d] bg-[#2a313b] text-center text-[7px] font-bold leading-3.5 text-faint">GbE</span>
          Gigabit
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-5 rounded-sm border border-[#3a424d] bg-[#2a313b] text-center text-[7px] font-bold leading-3.5 text-faint">FE</span>
          Fast Ethernet
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-5 rounded-sm border border-[#3a424d] bg-[#2a313b] text-center text-[7px] font-bold leading-3.5 text-faint">S/S+</span>
          SFP/SFP+
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-5 rounded-sm border border-[#3a424d] bg-[#2a313b] text-center text-[7px] font-bold leading-3.5 text-faint">Q/Q+</span>
          QSFP
        </span>
      </div>

      {/* Outlets */}
      <div className="flex items-center gap-2">
        <span className="font-bold uppercase tracking-wider text-faint">Outlet color</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded-full border border-status-green/60 bg-status-green/25" />
          Plugged in
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded-full border border-[#3a424d] bg-[#2a313b]" />
          Not connected
        </span>
        <span className="text-faint">—</span>
        <span className="font-bold uppercase tracking-wider text-faint">Outlet symbols</span>
        <span className="flex items-center gap-1">
          <span className="inline-flex h-3 w-4 items-center justify-center rounded-full border border-[#3a424d] bg-[#2a313b] text-[5px] font-bold text-faint">B</span>
          Battery-backed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-flex h-3 w-4 items-center justify-center rounded-full border border-[#3a424d] bg-[#2a313b] text-[5px] font-bold text-faint">~</span>
          Surge-protected
        </span>
      </div>

      {/* PSU */}
      <div className="flex items-center gap-2">
        <span className="font-bold uppercase tracking-wider text-faint">PSU</span>
        <span className="flex items-center gap-1">
          <span className="inline-flex h-3.5 w-4 items-center justify-center rounded-sm border border-status-green/60 bg-status-green/25 text-[8px] text-status-green">⚡</span>
          Powered
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-flex h-3.5 w-4 items-center justify-center rounded-sm border border-[#3a424d] bg-[#2a313b] text-[8px] text-faint">⚡</span>
          No cable
        </span>
      </div>

      {/* Drives */}
      <div className="flex items-center gap-2">
        <span className="font-bold uppercase tracking-wider text-faint">Drives</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-6 rounded-sm border border-status-green/60 bg-status-green/30 text-center text-[7px] font-bold leading-3.5 text-text">SSD</span>
          Installed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3.5 w-6 rounded-sm border border-border/50 bg-panel-2/60 leading-3.5" />
          Empty bay
        </span>
      </div>
    </div>
  );
}

function ShelfItems({ items }: { items: DiagramAsset["shelfItems"] }) {
  if (items.length === 0) {
    return (
      <p className="text-[9px] uppercase tracking-wide text-faint">
        Empty shelf
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it) => {
        const t = tone(it.category);
        return (
          <Link
            key={it.id}
            href={`/assets/${it.id}`}
            className={`rounded-sm border px-1 py-px text-[8.5px] font-bold uppercase tracking-wide ${t.border} ${t.tag}`}
            title={`${it.codename} — ${it.name}`}
          >
            {it.codename}
          </Link>
        );
      })}
    </div>
  );
}
