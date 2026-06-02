"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { Button, LinkButton } from "@/components/ui/button";
import { enumLabel, PORT_TYPE_LABELS, type PORT_TYPES } from "@/lib/enums";
import { validatePlacement, type PlacedAsset } from "@/lib/placement";
import {
  updateAssetPlacement,
  forceMoveWithCascade,
  saveDiagramPrefs,
  type PlacementTarget,
} from "./actions";
import { toggleRackLock } from "../racks/actions";
import type { DiagramAsset, DiagramRack } from "./rack-diagram";
import {
  type DiagramPrefs,
  DEFAULT_DIAGRAM_PREFS,
} from "@/lib/diagram-prefs";
import {
  FACE_COLS,
  U_INCHES,
  RACK_FACE_INCHES,
  resolveColumns,
  bayElementInches,
  portElementInches,
  ELEMENT_INCHES,
  ELEMENT_GAP_INCHES,
} from "@/lib/faceplate";

// View-pref context so the deep render tree (cards, port/bay grids) can read the
// active filters without threading props through every level.
const DiagramPrefsContext = createContext<DiagramPrefs>(DEFAULT_DIAGRAM_PREFS);
function useDiagramPrefs(): DiagramPrefs {
  return useContext(DiagramPrefsContext);
}

// 1U = 40px — tall enough that 48-port 1U switches fit 2 port rows without clipping.
const U_PX = 40;

// Category accent for the 3px left stripe on each device card.
const CATEGORY_STRIPE: Record<string, string> = {
  SERVER: "bg-cat-server",
  SWITCH: "bg-cat-switch",
  PATCH_PANEL: "bg-cat-switch",
  GATEWAY: "bg-cat-firewall",
  FIREWALL: "bg-cat-firewall",
  UPS: "bg-cat-ups",
  PDU: "bg-cat-pdu",
  KVM: "bg-cat-kvm",
  ACCESS_POINT: "bg-accent",
  NUC: "bg-cat-server",
  SBC: "bg-cat-server",
  SHELF: "bg-cat-pdu",
  DRAWER: "bg-cat-pdu",
  BLANK_PANEL: "bg-faint",
  OTHER: "bg-faint",
};

function stripe(category: string) {
  return CATEGORY_STRIPE[category] ?? CATEGORY_STRIPE.OTHER;
}

import { useDiagramSettings } from "@/components/providers/diagram-settings-provider";
import { DEFAULT_PORT_TYPE_LABELS } from "@/lib/diagram-settings";

const PORT_EMPTY_CLASS = "border-[#3a424d] bg-[#2a313b] text-faint";

// Connected-port colour by port type — uses customisable CSS vars (overridable in Admin › Settings).
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

type StorageBox = {
  id: string;
  name: string;
  assets: StorageItem[];
};

type StorageItem = {
  id: string;
  codename: string;
  name: string;
  category: string;
  formFactor: string;
  rackUnits: number | null;
  columnSpan: number | null;
  state: string;
};

type RackChip = {
  id: string;
  name: string;
  totalU: number;
  columnCount: number;
  isDefault: boolean;
  isLocked: boolean;
  inUse: boolean;
  placedCount: number;
};

// When the server returns confirmRequired, the client shows a dialog asking
// the user to confirm that dependent items will be sent to storage.
type PendingMove = {
  assetId: string;
  target: PlacementTarget;
  dependents: { id: string; codename: string }[];
};

export function TopologyView({
  diagramRack,
  racks,
  storages,
  unboxed,
  selectedInspect,
  prefs,
  inspector,
}: {
  diagramRack: DiagramRack | null;
  racks: RackChip[];
  storages: StorageBox[];
  unboxed: StorageItem[];
  selectedInspect: string | null;
  prefs: DiagramPrefs;
  inspector: React.ReactNode;
}) {
  const selectedAssetId =
    selectedInspect?.startsWith("asset:") === true
      ? selectedInspect.slice("asset:".length)
      : null;
  const router = useRouter();
  const searchParams = useSearchParams();
  // View filters — seeded from the saved per-user prefs and persisted on change.
  const [viewPrefs, setViewPrefs] = useState<DiagramPrefs>(prefs);
  const togglePref = useCallback((key: keyof DiagramPrefs) => {
    setViewPrefs((cur) => {
      const next = { ...cur, [key]: !cur[key] };
      void saveDiagramPrefs(next);
      return next;
    });
  }, []);

  const [draggingAsset, setDraggingAsset] = useState<DiagramAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mobileFace, setMobileFace] = useState<"FRONT" | "REAR">("FRONT");
  const [rackWidth, setRackWidth] = useState(0);
  const rackGridRef = useRef<HTMLDivElement>(null);
  // Touch devices can't drag precisely, so on a coarse pointer we switch to a
  // tap-to-place flow: tap an asset to select it, then tap a destination slot
  // or storage box. Drag is kept for fine (mouse) pointers.
  const [isTouch, setIsTouch] = useState(false);
  const [placing, setPlacing] = useState<{ id: string; codename: string } | null>(
    null,
  );

  useEffect(() => {
    const el = rackGridRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setRackWidth(entry.contentRect.width);
    });
    obs.observe(el);
    setRackWidth(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setIsTouch(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const asset = (event.active.data.current as { asset?: DiagramAsset })
      ?.asset;
    setDraggingAsset(asset ?? null);
    setError(null);
  }, []);

  // Shared move path used by both drag-drop and mobile tap-to-place.
  const performMove = useCallback(
    (assetId: string, target: PlacementTarget) => {
      setError(null);
      startTransition(async () => {
        const result = await updateAssetPlacement(assetId, target);
        if (!result.ok) {
          if ("confirmRequired" in result && result.confirmRequired) {
            setPendingMove({ assetId, target, dependents: result.dependents });
            return;
          }
          setError(result.reason);
          return;
        }
        router.refresh();
      });
    },
    [router],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingAsset(null);
      const data = event.active.data.current as
        | { assetId?: string; asset?: DiagramAsset }
        | undefined;
      const assetId = data?.assetId ?? data?.asset?.id;
      if (!assetId) return;
      const target = event.over?.data.current as PlacementTarget | undefined;
      if (!target) return;
      performMove(assetId, target);
    },
    [performMove],
  );

  // Tap-to-place: tapping a destination while an asset is selected moves it.
  const handleTapPlace = useCallback(
    (target: PlacementTarget) => {
      if (!placing) return;
      const assetId = placing.id;
      setPlacing(null);
      performMove(assetId, target);
    },
    [placing, performMove],
  );

  const selectForPlace = useCallback(
    (asset: { id: string; codename: string }) =>
      setPlacing((cur) => (cur?.id === asset.id ? null : asset)),
    [],
  );

  const handleConfirmMove = useCallback(() => {
    if (!pendingMove) return;
    const { assetId, target } = pendingMove;
    setPendingMove(null);
    startTransition(async () => {
      const result = await forceMoveWithCascade(assetId, target);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      router.refresh();
    });
  }, [pendingMove, router]);

  const selectInspect = useCallback(
    (target: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("inspect", target);
      router.push(`/topology?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const selectAsset = useCallback(
    (assetId: string) => selectInspect(`asset:${assetId}`),
    [selectInspect],
  );

  const closeInspector = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("inspect");
    const qs = params.toString();
    router.push(qs ? `/topology?${qs}` : "/topology", { scroll: false });
  }, [router, searchParams]);

  return (
    <DiagramPrefsContext.Provider value={viewPrefs}>
    <DndContext
      id="topology-dnd"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black">Topology</h1>
            <p className="mt-0.5 text-[11.5px] text-text-dim">
              {diagramRack?.isLocked
                ? "This rack is locked — unlock it to move devices. Sub-elements stay interactive."
                : isTouch
                  ? "Tap a device to pick it up, then tap a rack slot or a Storage box to place it. Tap a name plate for details."
                  : "Drag a device to move it. Drag into a Storage box to take it off the rack. Click a name plate to open the inspector."}
            </p>
          </div>
          <div className="flex gap-2">
            {diagramRack && (
              <form action={toggleRackLock.bind(null, diagramRack.id)}>
                <Button
                  type="submit"
                  variant={diagramRack.isLocked ? "accent" : "secondary"}
                  title={
                    diagramRack.isLocked
                      ? "Unlock this rack so its layout can be edited"
                      : "Lock this rack to prevent accidental drags"
                  }
                >
                  {diagramRack.isLocked ? "🔒 Unlock rack" : "Lock rack"}
                </Button>
              </form>
            )}
            <LinkButton href="/racks/new" variant="secondary">
              New rack
            </LinkButton>
            <LinkButton href="/assets/new" variant="primary">
              New asset
            </LinkButton>
          </div>
        </div>

        {error && (
          <div
            className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400"
            role="alert"
          >
            <span className="font-bold">Drop rejected: </span>
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 text-xs text-text-dim hover:text-text"
            >
              dismiss
            </button>
          </div>
        )}

        {racks.length === 0 ? (
          <Panel className="px-5 py-10 text-center">
            <p className="text-[13px] text-text-dim">
              No racks yet. Create one to see it on the topology view.
            </p>
            <div className="mt-3">
              <LinkButton href="/racks/new" variant="primary">
                Create a rack
              </LinkButton>
            </div>
          </Panel>
        ) : (
          <>
            <RackSwitcher racks={racks} currentRackId={diagramRack?.id} />
            <DiagramFilterBar prefs={viewPrefs} onToggle={togglePref} />
            {diagramRack ? (
              <Panel className="px-4 py-4">
                {/* Mobile tab toggle — hidden on lg+ where both faces show side by side */}
                <div className="flex lg:hidden mb-3 w-fit overflow-hidden rounded-lg border border-border bg-panel-2">
                  {(["FRONT", "REAR"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setMobileFace(f)}
                      className={`px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${
                        mobileFace === f ? "bg-border/60 text-accent" : "text-text-dim hover:text-accent"
                      }`}
                    >
                      {f} face
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className={mobileFace === "FRONT" ? "block" : "hidden lg:block"}>
                    <InteractiveRack
                      rack={diagramRack}
                      face="FRONT"
                      isPending={isPending}
                      onInspect={selectInspect}
                      selectedAssetId={selectedAssetId}
                      gridRef={rackGridRef}
                      isTouch={isTouch}
                      placingId={placing?.id ?? null}
                      onSelectForPlace={selectForPlace}
                      onTapPlace={handleTapPlace}
                    />
                  </div>
                  <div className={mobileFace === "REAR" ? "block" : "hidden lg:block"}>
                    <InteractiveRack
                      rack={diagramRack}
                      face="REAR"
                      isPending={isPending}
                      onInspect={selectInspect}
                      selectedAssetId={selectedAssetId}
                      isTouch={isTouch}
                      placingId={placing?.id ?? null}
                      onSelectForPlace={selectForPlace}
                      onTapPlace={handleTapPlace}
                    />
                  </div>
                </div>
                <CollapsibleLegend />
              </Panel>
            ) : (
              <Panel className="px-5 py-8 text-center">
                <p className="text-[12px] text-faint">Rack not found.</p>
              </Panel>
            )}
          </>
        )}

        <StorageStrip
          storages={storages}
          unboxed={unboxed}
          onAssetClick={selectAsset}
          isTouch={isTouch}
          placingId={placing?.id ?? null}
          onSelectForPlace={selectForPlace}
          onTapPlace={handleTapPlace}
        />
      </div>

      {/* Mobile tap-to-place banner — only while an asset is selected for moving */}
      {placing && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-accent/40 bg-panel px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,.5)] lg:hidden">
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1 text-[12.5px] text-text">
              Moving <span className="font-black text-accent">{placing.codename}</span>
              <span className="block text-[11px] text-text-dim">
                Tap a rack slot or a storage box to place it.
              </span>
            </span>
            <button
              type="button"
              onClick={() => handleTapPlace({ kind: "storage", storageId: null })}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-[12px] text-text-dim hover:border-accent hover:text-accent"
            >
              To storage
            </button>
            <button
              type="button"
              onClick={() => setPlacing(null)}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-[12px] text-text-dim hover:border-accent hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Drag overlay: sized to the asset's actual footprint so the ghost
          preview matches what it will occupy when dropped. RACK items span
          the full rack width; TOWER items span their column fraction. */}
      <DragOverlay dropAnimation={null}>
        {draggingAsset ? (() => {
          const isRack = draggingAsset.formFactor === "RACK";
          const isTower = draggingAsset.formFactor === "TOWER";
          const columnCount = diagramRack?.columnCount ?? 6;
          const overlayWidth =
            rackWidth > 0
              ? isRack
                ? rackWidth
                : isTower
                  ? ((draggingAsset.columnSpan ?? 1) / columnCount) * rackWidth
                  : undefined
              : undefined;
          return (
            <div
              className="pointer-events-none flex flex-col justify-center overflow-hidden rounded-md border-2 border-accent bg-panel-2/92 px-2 py-1 text-[11px] text-text opacity-85 shadow-lg"
              style={{
                width: overlayWidth,
                minWidth: overlayWidth == null ? 160 : undefined,
                height:
                  draggingAsset.rackUnits != null
                    ? draggingAsset.rackUnits * U_PX
                    : undefined,
              }}
            >
              <div className="font-black uppercase">{draggingAsset.codename}</div>
              <div className="truncate text-[10px] text-text-dim">
                {draggingAsset.name}
              </div>
              {draggingAsset.rackUnits != null && (
                <div className="mt-0.5 text-[9px] text-accent">
                  {draggingAsset.rackUnits}U
                </div>
              )}
            </div>
          );
        })() : null}
      </DragOverlay>

      {/* Support-required move confirmation dialog */}
      {pendingMove && (
        <SupportRequiredDialog
          dependents={pendingMove.dependents}
          onConfirm={handleConfirmMove}
          onCancel={() => setPendingMove(null)}
        />
      )}

      {selectedInspect && (
        <InspectorDrawer onClose={closeInspector}>{inspector}</InspectorDrawer>
      )}
    </DndContext>
    </DiagramPrefsContext.Provider>
  );
}

// Toggle chips for the rack-view filters (issue 4). Persisted per-user.
function DiagramFilterBar({
  prefs,
  onToggle,
}: {
  prefs: DiagramPrefs;
  onToggle: (key: keyof DiagramPrefs) => void;
}) {
  const items: { key: keyof DiagramPrefs; label: string }[] = [
    { key: "hideNames", label: "Hide names" },
    { key: "hidePorts", label: "Hide ports" },
    { key: "hideBays", label: "Hide drive bays" },
    { key: "imageMode", label: "Image mode" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
        View
      </span>
      {items.map((it) => {
        const on = prefs[it.key];
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onToggle(it.key)}
            aria-pressed={on}
            className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
              on
                ? "border-accent bg-accent/15 text-accent"
                : "border-border bg-panel-2 text-text-dim hover:border-accent/40 hover:text-text"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function SupportRequiredDialog({
  dependents,
  onConfirm,
  onCancel,
}: {
  dependents: { id: string; codename: string }[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const names = dependents.map((d) => d.codename).join(", ");
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-5 shadow-2xl">
          <h3 className="text-sm font-black">Unsupported items detected</h3>
          <p className="mt-2 text-[12.5px] text-text-dim">
            Moving this device will leave{" "}
            <span className="font-bold text-text">{names}</span> without
            support. Continue and send{" "}
            {dependents.length === 1 ? "it" : "them"} to storage?
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-md border border-border px-3 py-1.5 text-[12px] text-text-dim hover:border-accent/40 hover:text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-md bg-accent/20 px-3 py-1.5 text-[12px] font-bold text-accent hover:bg-accent/30"
            >
              Move + send to storage
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function CollapsibleLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] text-text-dim hover:text-text transition-colors"
      >
        {open ? "▲ Hide legend" : "▼ Show legend"}
      </button>
      {open && <RackLegend />}
    </div>
  );
}

function RackLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-x-10 gap-y-3 text-[10px] text-text-dim">
      {/* Device types */}
      <div>
        <p className="font-black uppercase tracking-[1px]">Device type</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {[
            { color: "bg-cat-server",   label: "Server / NUC / SBC" },
            { color: "bg-cat-switch",   label: "Switch" },
            { color: "bg-cat-firewall", label: "Gateway / Firewall" },
            { color: "bg-cat-ups",      label: "UPS" },
            { color: "bg-cat-pdu",      label: "PDU / Shelf / Drawer" },
            { color: "bg-cat-kvm",      label: "KVM" },
            { color: "bg-faint",        label: "Blank panel" },
          ].map((it) => (
            <span key={it.label} className="flex items-center gap-1.5">
              <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-sm ${it.color}`} />
              {it.label}
            </span>
          ))}
        </div>
      </div>

      {/* Port colors */}
      <div>
        <p className="font-black uppercase tracking-[1px]">Port colors</p>
        <p className="mt-0.5 text-[9px] text-faint">Color only appears when a cable is connected</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3.5 w-5 rounded-[1.5px] border border-[#3a424d] bg-[#2a313b] text-center text-[6px] font-bold leading-[14px] text-faint">GbE</span>
            Not connected
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3.5 w-5 rounded-[1.5px] border border-[#7bc47f]/60 bg-[#7bc47f]/20 text-center text-[6px] font-bold leading-[14px] text-[#7bc47f]">FE</span>
            Fast Ethernet connected
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3.5 w-5 rounded-[1.5px] border border-status-green/60 bg-status-green/25 text-center text-[6px] font-bold leading-[14px] text-status-green">GbE</span>
            GbE connected
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3.5 w-5 rounded-[1.5px] border border-cat-firewall/50 bg-cat-firewall/15 text-center text-[6px] font-bold leading-[14px] text-cat-firewall/70">BMC</span>
            IPMI connected
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3.5 w-5 rounded-[1.5px] border border-cat-switch/50 bg-cat-switch/15 text-center text-[6px] font-bold leading-[14px] text-cat-switch/70">S+</span>
            SFP / fiber connected
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3.5 w-5 rounded-[1.5px] border border-cat-kvm/50 bg-cat-kvm/15 text-center text-[6px] font-bold leading-[14px] text-cat-kvm/70">CON</span>
            Console connected
          </span>
        </div>
      </div>

      {/* Port symbols */}
      <div>
        <p className="font-black uppercase tracking-[1px]">Port symbols</p>
        <p className="mt-0.5 text-[9px] text-faint">Label inside the port square — always visible</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {[
            { label: "FE",  desc: "Fast Ethernet (100M)" },
            { label: "GbE", desc: "Gigabit Ethernet" },
            { label: "BMC", desc: "IPMI / BMC" },
            { label: "S",   desc: "SFP (1G)" },
            { label: "S+",  desc: "SFP+ (10G)" },
            { label: "S++", desc: "SFP28 (25G)" },
            { label: "Q",   desc: "QSFP (40G)" },
            { label: "Q+",  desc: "QSFP+ (40G)" },
            { label: "Q++", desc: "QSFP28 (100G)" },
            { label: "CON", desc: "Console" },
            { label: "USB", desc: "USB" },
          ].map((it) => (
            <span key={it.label} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-3.5 w-5 rounded-[1.5px] border border-[#3a424d] bg-[#2a313b] text-center text-[6px] font-bold leading-[14px] text-faint">{it.label}</span>
              {it.desc}
            </span>
          ))}
        </div>
      </div>

      {/* Outlets */}
      <div>
        <p className="font-black uppercase tracking-[1px]">Outlet colors</p>
        <p className="mt-0.5 text-[9px] text-faint">Green = plugged in, gray = not connected</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-4 rounded-full border border-status-green/60 bg-status-green/25" />
            Plugged in
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-4 rounded-full border border-[#3a424d] bg-[#2a313b]" />
            Not connected
          </span>
        </div>
        <p className="mt-2 font-black uppercase tracking-[1px]">Outlet symbols</p>
        <p className="mt-0.5 text-[9px] text-faint">Icon shows outlet type — always visible</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-flex h-3 w-4 items-center justify-center rounded-full border border-[#3a424d] bg-[#2a313b] text-[6px] font-bold text-faint">B</span>
            Battery-backed
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-flex h-3 w-4 items-center justify-center rounded-full border border-[#3a424d] bg-[#2a313b] text-[6px] font-bold text-faint">~</span>
            Surge-protected
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-4 rounded-full border border-[#3a424d] bg-[#2a313b]" />
            Standard outlet
          </span>
        </div>
      </div>

      {/* PSU */}
      <div>
        <p className="font-black uppercase tracking-[1px]">PSU</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-flex h-3.5 w-5 items-center justify-center rounded-[2px] border border-status-green/60 bg-status-green/20 text-[7px] text-status-green">⚡</span>
            Powered
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-flex h-3.5 w-5 items-center justify-center rounded-[2px] border border-[#3a424d] bg-[#2a313b] text-[7px] text-faint">⚡</span>
            No power cable
          </span>
        </div>
      </div>

      {/* Drives */}
      <div>
        <p className="font-black uppercase tracking-[1px]">Drive bays</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3.5 w-7 rounded-sm border border-[#52d062] bg-cat-server text-center text-[6px] font-black leading-[14px] text-bg">SSD</span>
            Installed
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3.5 w-7 rounded-sm border border-[#3a424d] bg-[#2a313b]" />
            Empty bay
          </span>
        </div>
      </div>
    </div>
  );
}

function RackSwitcher({
  racks,
  currentRackId,
}: {
  racks: RackChip[];
  currentRackId: string | undefined;
}) {
  return (
    <Panel className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
          Rack
        </span>
        {racks.map((r) => {
          const active = r.id === currentRackId;
          return (
            <Link
              key={r.id}
              href={`/topology?rack=${r.id}`}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] transition-colors ${
                active
                  ? "border-accent bg-accent/15 text-text"
                  : "border-border bg-panel-2 text-text-dim hover:border-accent/40 hover:text-text"
              }`}
            >
              <span className="font-bold">{r.name}</span>
              <span className="text-[10px] text-text-dim">{r.totalU}U</span>
              {r.isDefault && <Badge tone="success">Default</Badge>}
              {r.isLocked && <Badge>🔒 Locked</Badge>}
              {!r.inUse && <Badge>Retired</Badge>}
              <span className="text-[10px] text-faint">
                · {r.placedCount} placed
              </span>
            </Link>
          );
        })}
        <span className="ml-auto text-[10.5px] text-faint">
          Set the default on a rack&apos;s detail page.
        </span>
      </div>
    </Panel>
  );
}

function InteractiveRack({
  rack,
  face,
  isPending,
  onInspect,
  selectedAssetId,
  gridRef,
  isTouch,
  placingId,
  onSelectForPlace,
  onTapPlace,
}: {
  rack: DiagramRack;
  face: "FRONT" | "REAR";
  isPending: boolean;
  onInspect: (target: string) => void;
  selectedAssetId: string | null;
  gridRef?: React.RefObject<HTMLDivElement | null>;
  isTouch: boolean;
  placingId: string | null;
  onSelectForPlace: (asset: { id: string; codename: string }) => void;
  onTapPlace: (target: PlacementTarget) => void;
}) {
  // Full-depth items (rackFace=null) render on both faces.
  // Thin items (rackFace="FRONT"/"REAR") only render on their own face.
  const placed = rack.assets.filter(
    (a) =>
      a.startU != null &&
      a.rackUnits != null &&
      (a.rackFace == null || a.rackFace === face),
  );

  // Full-footprint drop preview: read active drag + hovered cell from dnd context
  // and render a single grid-spanning highlight instead of per-cell highlights.
  // The highlight is blue (valid) or red (invalid) based on a client-side
  // placement check so the user sees feedback before releasing the mouse.
  const { active, over } = useDndContext();
  let ghostStyle: React.CSSProperties | null = null;
  let isPlacementValid = true;
  if (active && over) {
    const overId = String(over.id);
    const parts = overId.split(":");
    if (parts[0] === "cell" && parts[1] === face && parts[2] === rack.id) {
      const overU = parseInt(parts[3], 10);
      const overCol = parseInt(parts[4], 10);
      const dragAsset = active.data.current?.asset as DiagramAsset | undefined;
      const rackUnits = dragAsset?.rackUnits ?? 1;
      const isRackForm = dragAsset?.formFactor === "RACK";
      const colSpan = isRackForm ? rack.columnCount : (dragAsset?.columnSpan ?? 1);
      const colStart = isRackForm ? 1 : overCol + 1;
      // Clamp to ≥1: negative CSS grid lines count backwards and produce a
      // full-rack-height ghost when overU is near the top.
      const rowStart = Math.max(1, rack.totalU - overU - rackUnits + 2);
      ghostStyle = {
        gridRowStart: rowStart,
        gridRowEnd: rowStart + rackUnits,
        gridColumnStart: colStart,
        gridColumnEnd: colStart + colSpan,
        pointerEvents: "none",
        zIndex: 10,
      };

      if (dragAsset) {
        const gridColumn = isRackForm ? 0 : overCol;
        const others: PlacedAsset[] = rack.assets
          .filter((a) => a.id !== dragAsset.id && a.startU != null && a.rackUnits != null)
          .map((a) => ({
            id: a.id,
            category: a.category,
            startU: a.startU!,
            rackUnits: a.rackUnits!,
            gridColumn: a.formFactor === "RACK" ? 0 : (a.gridColumn ?? 0),
            columnSpan: a.formFactor === "RACK" ? rack.columnCount : (a.columnSpan ?? 1),
            requiresSupport: a.requiresSupport,
            rackFace: a.rackFace ?? null,
            depthInches: a.depthInches ?? null,
          }));
        const result = validatePlacement(
          {
            startU: overU,
            rackUnits,
            gridColumn,
            columnSpan: colSpan,
            requiresSupport: dragAsset.requiresSupport,
            rackFace: dragAsset.rackFace ?? null,
            depthInches: dragAsset.depthInches ?? null,
            category: dragAsset.category,
          },
          others,
          rack.totalU,
          rack.columnCount,
          rack.depthInches ?? 24.0,
        );
        isPlacementValid = result.ok;
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-accent">
          {face} face
        </h3>
        <span className="text-[10px] text-text-dim">
          {rack.totalU}U · {rack.columnCount} cols
          {isPending && (
            <span className="ml-2 text-accent">Saving…</span>
          )}
        </span>
      </div>
      <div className="flex rounded-md bg-[#30363d] p-2 shadow-[inset_0_0_0_1px_#1c2128,0_12px_30px_rgba(0,0,0,.5)]">
        <UScale totalU={rack.totalU} />
        <div
          ref={gridRef}
          className="relative grid flex-1 rounded-[3px] border border-[#04070b] bg-[#0a0d12]"
          style={{
            gridTemplateRows: `repeat(${rack.totalU}, ${U_PX}px)`,
            gridTemplateColumns: `repeat(${rack.columnCount}, minmax(0, 1fr))`,
            backgroundImage:
              `repeating-linear-gradient(to bottom, transparent, transparent calc(${U_PX}px - 1px), rgba(255,255,255,0.03) calc(${U_PX}px - 1px), rgba(255,255,255,0.03) ${U_PX}px)`,
          }}
        >
          {Array.from({ length: rack.totalU }, (_, ui) =>
            Array.from({ length: rack.columnCount }, (_, ci) => (
              <DroppableUSlot
                key={`u${ui}-c${ci}`}
                face={face}
                rackId={rack.id}
                u={rack.totalU - ui}
                col={ci}
                row={ui + 1}
                disabled={rack.isLocked}
                placing={placingId != null}
                onTapPlace={onTapPlace}
              />
            )),
          )}
          {ghostStyle && (
            <div
              aria-hidden
              style={ghostStyle}
              className={`rounded border-2 ${isPlacementValid ? "border-accent bg-accent/20" : "border-red-500/70 bg-red-500/20"}`}
            />
          )}
          {placed.map((a) => {
            const style = gridPlacement(a, rack.totalU, rack.columnCount);
            if (!style) return null;
            return (
              <DraggableAssetCell
                key={`${a.id}-${face}`}
                asset={a}
                face={face}
                style={style}
                onInspect={onInspect}
                isSelected={selectedAssetId === a.id}
                dragDisabled={rack.isLocked}
                isTouch={isTouch}
                isPlacing={placingId === a.id}
                onSelectForPlace={onSelectForPlace}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

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

function DroppableUSlot({
  face,
  rackId,
  u,
  col,
  row,
  disabled,
  placing,
  onTapPlace,
}: {
  face: "FRONT" | "REAR";
  rackId: string;
  u: number;
  col: number;
  row: number;
  disabled?: boolean;
  placing: boolean;
  onTapPlace: (target: PlacementTarget) => void;
}) {
  const target: PlacementTarget = {
    kind: "rack",
    rackId,
    startU: u,
    gridColumn: col,
  };
  const { setNodeRef } = useDroppable({
    id: `cell:${face}:${rackId}:${u}:${col}`,
    data: target,
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        gridRow: `${row} / span 1`,
        gridColumn: `${col + 1} / span 1`,
      }}
      onClick={placing && !disabled ? () => onTapPlace(target) : undefined}
      className={`pointer-events-auto ${
        placing && !disabled
          ? "cursor-pointer bg-accent/5 ring-1 ring-inset ring-accent/20 hover:bg-accent/15"
          : ""
      }`}
    />
  );
}

function gridPlacement(
  asset: DiagramAsset,
  totalU: number,
  columnCount: number,
): React.CSSProperties | null {
  if (asset.startU == null || asset.rackUnits == null) return null;
  const rowStart = totalU - asset.startU - asset.rackUnits + 2;
  const span = asset.rackUnits;
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


function DraggableAssetCell({
  asset,
  face,
  style,
  onInspect,
  isSelected,
  dragDisabled,
  isTouch,
  isPlacing,
  onSelectForPlace,
}: {
  asset: DiagramAsset;
  face: "FRONT" | "REAR";
  style: React.CSSProperties;
  onInspect: (target: string) => void;
  isSelected: boolean;
  dragDisabled?: boolean;
  isTouch: boolean;
  isPlacing: boolean;
  onSelectForPlace: (asset: { id: string; codename: string }) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `asset:${face}:${asset.id}`,
    data: { asset, assetId: asset.id },
    disabled: dragDisabled,
  });
  // On touch, a tap on the device body selects it for tap-to-place (drag is
  // unreliable). Sub-elements (name plate, ports, bays) stopPropagation, so a
  // body tap is unambiguous.
  const bodyTap =
    isTouch && !dragDisabled
      ? () => onSelectForPlace({ id: asset.id, codename: asset.codename })
      : undefined;
  const prefs = useDiagramPrefs();
  const isOneU = (asset.rackUnits ?? 1) <= 1;
  const isReversed = asset.faceOrientation === "FRONT_REAR" && asset.rackFace == null;
  // Narrow items (single-column towers) have no room for a codename — it
  // truncates to ~1 letter. Show just the status dot; the full name stays on
  // the cell tooltip and in the inspector. The "Hide names" filter forces this
  // treatment on every item.
  const isNarrow =
    prefs.hideNames || (asset.formFactor !== "RACK" && (asset.columnSpan ?? 1) <= 1);

  // Image-render mode: show the asset's per-face render image (or a placeholder)
  // instead of the generated faceplate, with corner drag/inspect handles.
  if (prefs.imageMode) {
    return (
      <ImageModeCell
        asset={asset}
        face={face}
        style={style}
        setNodeRef={setNodeRef}
        dragProps={dragDisabled ? {} : { ...attributes, ...listeners }}
        isDragging={isDragging}
        isSelected={isSelected}
        isPlacing={isPlacing}
        isTouch={isTouch}
        onInspect={onInspect}
        onSelectForPlace={onSelectForPlace}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.35 : 1,
      }}
      {...(dragDisabled ? {} : attributes)}
      {...(dragDisabled ? {} : listeners)}
      onClick={bodyTap}
      className={`group relative m-px flex min-w-0 overflow-hidden rounded border bg-gradient-to-b from-[#272e37] to-[#1d232b] text-[10px] text-text ${
        dragDisabled ? "" : "cursor-grab active:cursor-grabbing"
      } ${isPlacing ? "border-accent ring-2 ring-accent ring-offset-1 ring-offset-bg" : "border-border/80"} ${isSelected && !isPlacing ? "ring-2 ring-accent" : ""}`}
      title={`${asset.codename} — ${asset.name}`}
    >
      {/* Left accent stripe — category colour, runs the full height. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${stripe(asset.category)}`}
      />
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onInspect(`asset:${asset.id}`);
        }}
        title="Click for asset details"
        className={`flex shrink cursor-pointer flex-col justify-center border-r border-border/80 bg-bg/30 text-left hover:bg-accent/10 ${
          isNarrow
            ? "w-[22px] min-w-[18px] items-center px-0"
            : `${asset.formFactor === "TOWER" ? "w-[80px] min-w-[32px]" : "w-[124px] min-w-[50px]"} pl-2.5 pr-2`
        } ${isOneU || isNarrow ? "" : "py-1"}`}
      >
        {isNarrow ? (
          <span
            aria-hidden
            className={`inline-block h-2 w-2 rounded-full ${asset.state === "IN_USE" ? "bg-status-green shadow-[0_0_5px_var(--color-status-green)]" : "bg-faint"}`}
          />
        ) : (
          <>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${asset.state === "IN_USE" ? "bg-status-green" : "bg-faint"} ${asset.state === "IN_USE" ? "shadow-[0_0_5px_var(--color-status-green)]" : ""}`}
          />
          <span className="truncate text-[11px] font-black leading-tight">
            {asset.codename}
          </span>
          <span
            aria-hidden
            className="ml-auto shrink-0 text-[10px] leading-none text-accent/80"
          >
            ⓘ
          </span>
        </span>
        {!isOneU && (
          <span className="mt-0.5 truncate text-[9px] font-normal leading-tight text-text-dim">
            {asset.name}
          </span>
        )}
        {/* Reversed-mount badge — visible cue that this device shows its
            physical rear on this face. */}
        {isReversed && !isOneU && (
          <span className="mt-0.5 text-[8px] text-cat-ups/80">
            ↔ Reversed
          </span>
        )}
        {asset.rackFace === "REAR" && !isOneU && (
          <span className="mt-0.5 text-[8px] text-faint">
            ⟵ Rear-mounted
          </span>
        )}
          </>
        )}
      </button>
      <div className="flex min-w-[48px] flex-1 items-stretch gap-0 overflow-hidden px-1.5 py-0.5">
        <AssetFaceContent asset={asset} face={face} onInspect={onInspect} />
      </div>
    </div>
  );
}

// Image-render presentation of an asset: a per-face image filling its U-space
// (or a placeholder block), with a top-left drag handle and top-right inspect
// button so move and inspect stay available without the full-cell handle.
function ImageModeCell({
  asset,
  face,
  style,
  setNodeRef,
  dragProps,
  isDragging,
  isSelected,
  isPlacing,
  isTouch,
  onInspect,
  onSelectForPlace,
}: {
  asset: DiagramAsset;
  face: "FRONT" | "REAR";
  style: React.CSSProperties;
  setNodeRef: (el: HTMLElement | null) => void;
  dragProps: Record<string, unknown>;
  isDragging: boolean;
  isSelected: boolean;
  isPlacing: boolean;
  isTouch: boolean;
  onInspect: (target: string) => void;
  onSelectForPlace: (asset: { id: string; codename: string }) => void;
}) {
  const imgPath =
    face === "REAR"
      ? asset.rackRenderRearPath ?? asset.rackRenderFrontPath
      : asset.rackRenderFrontPath ?? asset.rackRenderRearPath;
  return (
    <div
      ref={setNodeRef}
      style={{ ...style, opacity: isDragging ? 0.35 : 1 }}
      title={`${asset.codename} — ${asset.name}`}
      className={`group relative m-px overflow-hidden rounded border bg-[#11151b] ${
        isPlacing || isSelected
          ? "border-accent ring-2 ring-accent"
          : "border-border/80"
      }`}
    >
      {imgPath ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgPath}
          alt={asset.codename}
          draggable={false}
          className="h-full w-full object-fill"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-gradient-to-b from-[#272e37] to-[#1d232b] px-1 text-center">
          <span
            aria-hidden
            className={`mb-0.5 inline-block h-1.5 w-1.5 rounded-full ${asset.state === "IN_USE" ? "bg-status-green" : "bg-faint"}`}
          />
          <span className="truncate text-[11px] font-black leading-tight">
            {asset.codename}
          </span>
          <span className="text-[8px] text-faint">add a render image</span>
        </div>
      )}

      {/* Top-left: drag handle (desktop) / tap-to-select (touch) */}
      <button
        type="button"
        {...dragProps}
        onClick={
          isTouch
            ? (e) => {
                e.stopPropagation();
                onSelectForPlace({ id: asset.id, codename: asset.codename });
              }
            : undefined
        }
        title="Move"
        className="absolute left-0.5 top-0.5 z-10 flex h-5 w-5 cursor-grab items-center justify-center rounded bg-bg/70 text-[11px] text-text-dim hover:text-accent active:cursor-grabbing"
      >
        ⠿
      </button>
      {/* Top-right: open inspector */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onInspect(`asset:${asset.id}`);
        }}
        title="Details"
        className="absolute right-0.5 top-0.5 z-10 flex h-5 w-5 items-center justify-center rounded bg-bg/70 text-[11px] text-accent/80 hover:text-accent"
      >
        ⓘ
      </button>
    </div>
  );
}

function Zone({
  title,
  titleClassName,
  children,
}: {
  title?: string;
  titleClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-center border-l border-dashed border-border/70 px-2 py-px first:border-l-0 first:pl-0">
      {title && (
        <div
          className={`mb-0.5 truncate text-left text-[7px] font-black uppercase tracking-[0.7px] ${
            titleClassName ?? "text-faint"
          }`}
        >
          {title}
        </div>
      )}
      <div className="min-h-0">{children}</div>
    </div>
  );
}

// Does the faceplate designer place any block on this face?
function hasCustomFaceplate(asset: DiagramAsset, face: "FRONT" | "REAR"): boolean {
  const onFace = (f: string | null | undefined, def: "FRONT" | "REAR") =>
    (f ?? def) === face;
  const placed = (gr?: number | null, gc?: number | null) => gr != null && gc != null;
  if (asset.bayZones.some((z) => (z.faceSide === "REAR" ? "REAR" : "FRONT") === face && placed(z.gridRow, z.gridCol))) return true;
  if (asset.portGroups.some((g) => onFace(g.face, "FRONT") && placed(g.gridRow, g.gridCol))) return true;
  if (asset.outletGroups.some((g) => onFace(g.face, "REAR") && placed(g.gridRow, g.gridCol))) return true;
  if (asset.psus.some((p) => onFace(p.face, "REAR") && placed(p.gridRow, p.gridCol))) return true;
  if (onFace(asset.builtInFace, "REAR") && placed(asset.builtInGridRow, asset.builtInGridCol) && ((asset.builtInEthernetCount ?? 0) > 0 || (asset.builtInSfpCount ?? 0) > 0)) return true;
  if ((asset.annotations ?? []).some((a) => onFace(a.face, "FRONT") && placed(a.gridRow, a.gridCol))) return true;
  return false;
}

// Renders an asset face using the hand-designed grid layout: blocks sorted by
// (gridRow, gridCol) and grouped into rows. Reuses the same grid sub-components
// as the auto-layout, so filters and connection colouring still apply.
function CustomFaceplate({
  asset,
  face,
  onInspect,
  pxPerInch,
}: {
  asset: DiagramAsset;
  face: "FRONT" | "REAR";
  onInspect: (target: string) => void;
  pxPerInch?: number;
}) {
  const heightU = asset.rackUnits ?? 1;
  const ppi = pxPerInch ?? U_PX / U_INCHES;
  const faceWidthInches = asset.widthInches && asset.widthInches > 0 ? asset.widthInches : RACK_FACE_INCHES;
  const dividerHeightPx = U_INCHES * heightU * ppi; // full device height
  type Placed = {
    key: string;
    row: number;
    col: number;
    title?: string;
    node: React.ReactNode;
  };
  const items: Placed[] = [];

  asset.bayZones.forEach((z) => {
    if ((z.faceSide === "REAR" ? "REAR" : "FRONT") !== face) return;
    if (z.gridRow == null || z.gridCol == null) return;
    const cols = resolveColumns({ kind: "bay", count: z.bayCount, columns: z.columns, driveSize: z.driveSize, rackUnits: heightU }, faceWidthInches);
    items.push({
      key: `bay-${z.id}`, row: z.gridRow, col: z.gridCol, title: z.name,
      node: <DriveBayGrid zone={z} heightU={heightU} onInspect={onInspect} pxPerInch={ppi} cols={cols} />,
    });
  });
  asset.portGroups.forEach((g) => {
    if ((g.face ?? "FRONT") !== face) return;
    if (g.gridRow == null || g.gridCol == null) return;
    const cols = resolveColumns({ kind: "port", count: g.portCount, columns: g.columns, rows: g.rows, portType: g.portType, rackUnits: heightU }, faceWidthInches);
    items.push({
      key: `port-${g.id}`, row: g.gridRow, col: g.gridCol,
      title: g.name ?? PORT_TYPE_LABELS[g.portType as (typeof PORT_TYPES)[number]],
      node: <PortGrid groupId={g.id} count={g.portCount} connectedPorts={g.connectedPorts} portType={g.portType} rows={g.rows} columns={cols} hidden={g.hiddenPorts} heightU={heightU} onInspect={onInspect} pxPerInch={ppi} />,
    });
  });
  asset.outletGroups.forEach((g) => {
    if ((g.face ?? "REAR") !== face) return;
    if (g.gridRow == null || g.gridCol == null) return;
    const cols = resolveColumns({ kind: "outlet", count: g.outletCount, columns: g.columns, rows: g.rows, rackUnits: heightU }, faceWidthInches);
    items.push({
      key: `outlet-${g.id}`, row: g.gridRow, col: g.gridCol,
      title: g.name ?? g.outletType ?? "POWER OUT",
      node: <OutletGrid groupId={g.id} count={g.outletCount} connectedOutlets={g.connectedOutlets} heightU={heightU} batteryBacked={g.batteryBacked} surgeProtected={g.surgeProtected} rows={g.rows} columns={cols} hidden={g.hiddenPorts} onInspect={onInspect} pxPerInch={ppi} />,
    });
  });
  asset.psus.forEach((p) => {
    if ((p.face ?? "REAR") !== face) return;
    if (p.gridRow == null || p.gridCol == null) return;
    items.push({
      key: `psu-${p.id}`, row: p.gridRow, col: p.gridCol,
      node: <PsuGrid assetId={asset.id} psus={[p]} psuCount={1} connectedPsuOrders={asset.connectedPsuOrders} heightU={heightU} onInspect={onInspect} />,
    });
  });
  if (
    (asset.builtInFace ?? "REAR") === face &&
    asset.builtInGridRow != null &&
    asset.builtInGridCol != null &&
    ((asset.builtInEthernetCount ?? 0) > 0 || (asset.builtInSfpCount ?? 0) > 0)
  ) {
    items.push({
      key: "builtin", row: asset.builtInGridRow, col: asset.builtInGridCol, title: "NICS",
      node: <NicGrid assetId={asset.id} ethernet={asset.builtInEthernetCount ?? 0} sfp={asset.builtInSfpCount ?? 0} heightU={heightU} onInspect={onInspect} pxPerInch={ppi} />,
    });
  }
  (asset.annotations ?? []).forEach((a, i) => {
    if ((a.face ?? "FRONT") !== face) return;
    if (a.gridRow == null || a.gridCol == null) return;
    items.push({
      key: `anno-${i}`, row: a.gridRow, col: a.gridCol,
      node:
        a.kind === "DIVIDER" ? (
          <span className="block w-px bg-text-dim/70" style={{ height: dividerHeightPx }} />
        ) : a.kind === "SPACER" ? (
          <span className="block h-3 w-3" />
        ) : (
          <span className="whitespace-nowrap text-[8px] font-bold uppercase leading-tight tracking-[0.3px] text-text-dim">{a.text}</span>
        ),
    });
  });

  if (items.length === 0) return <PlainLabel>{face}</PlainLabel>;

  // Position each block at its grid-cell origin (fraction of the face) and let
  // it render at its real physical size.
  return (
    <div className="relative h-full w-full">
      {items.map((it) => (
        <div
          key={it.key}
          className="absolute"
          style={{
            left: `${((it.col - 1) / FACE_COLS) * 100}%`,
            top: `${((it.row - 1) / Math.max(1, heightU)) * 100}%`,
          }}
        >
          {it.title && (
            <div className="pointer-events-none absolute -top-[8px] left-0 truncate text-left text-[7px] font-black uppercase tracking-[0.5px] text-faint">
              {it.title}
            </div>
          )}
          {it.node}
        </div>
      ))}
    </div>
  );
}

export function AssetFaceContent({
  asset,
  face,
  onInspect,
  pxPerInch,
}: {
  asset: DiagramAsset;
  face: "FRONT" | "REAR";
  onInspect: (target: string) => void;
  pxPerInch?: number;
}) {
  const cat = asset.category;
  const isOneU = (asset.rackUnits ?? 1) <= 1;

  // Thin items mounted from the rear (rackFace="REAR") have their physical
  // front accessible from the rack's rear — show FRONT content in REAR view.
  // Full-depth items use faceOrientation to control which content shows on each face.
  const isRearMounted = asset.rackFace === "REAR";
  const effectiveFace =
    isRearMounted || asset.faceOrientation === "FRONT_REAR"
      ? face === "FRONT"
        ? "REAR"
        : "FRONT"
      : face;

  const driveBaysOnFace = asset.bayZones.filter((z) =>
    effectiveFace === "FRONT" ? z.faceSide !== "REAR" : z.faceSide === "REAR",
  );

  // If the faceplate designer placed any block on this face, render the custom
  // layout instead of the category auto-layout.
  if (hasCustomFaceplate(asset, effectiveFace)) {
    return <CustomFaceplate asset={asset} face={effectiveFace} onInspect={onInspect} pxPerInch={pxPerInch} />;
  }

  if (effectiveFace === "FRONT") {
    if (cat === "SERVER" || cat === "NUC" || cat === "SBC") {
      if (driveBaysOnFace.length === 0) {
        return <PlainLabel>{isOneU ? "FRONT" : "NO DRIVE BAYS"}</PlainLabel>;
      }
      return (
        <>
          {driveBaysOnFace.map((z) => (
            <Zone key={z.id} title={z.name}>
              <DriveBayGrid
                zone={z}
                heightU={asset.rackUnits ?? 1}
                onInspect={onInspect}
              />
            </Zone>
          ))}
        </>
      );
    }
    if (cat === "PATCH_PANEL") {
      if (asset.portGroups.length === 0)
        return <PlainLabel>NO PORTS DEFINED</PlainLabel>;
      if (asset.patchPanelType === "COUPLER") {
        // Coupler: both front and rear sections shown on the same face.
        return (
          <>
            {asset.portGroups.map((g) => (
              <div key={g.id} className="flex flex-col gap-1">
                <Zone title={`${g.name ?? PORT_TYPE_LABELS[g.portType as (typeof PORT_TYPES)[number]]} — Front`}>
                  <PortGrid
                    groupId={g.id}
                    count={g.portCount}
                    connectedPorts={g.connectedPorts}
                    portType={g.portType}
                    rows={g.rows}
                    columns={g.columns}
                    hidden={g.hiddenPorts}
                    heightU={asset.rackUnits ?? 1}
                    onInspect={onInspect}
                  />
                </Zone>
                <Zone title={`${g.name ?? PORT_TYPE_LABELS[g.portType as (typeof PORT_TYPES)[number]]} — Rear`} titleClassName="text-cat-ups">
                  <PortGrid
                    groupId={g.id}
                    count={g.portCount}
                    connectedPorts={g.connectedRearPorts ?? []}
                    portType={g.portType}
                    rows={g.rows}
                    columns={g.columns}
                    hidden={g.hiddenPorts}
                    heightU={asset.rackUnits ?? 1}
                    onInspect={onInspect}
                  />
                </Zone>
              </div>
            ))}
          </>
        );
      }
      // Keystone: show only front (bEnd) ports on the front face.
      return (
        <>
          {asset.portGroups.map((g) => (
            <Zone
              key={g.id}
              title={g.name ?? PORT_TYPE_LABELS[g.portType as (typeof PORT_TYPES)[number]]}
            >
              <PortGrid
                groupId={g.id}
                count={g.portCount}
                connectedPorts={g.connectedPorts}
                portType={g.portType}
                rows={g.rows}
                columns={g.columns}
                hidden={g.hiddenPorts}
                heightU={asset.rackUnits ?? 1}
                onInspect={onInspect}
              />
            </Zone>
          ))}
        </>
      );
    }
    if (
      cat === "SWITCH" ||
      cat === "GATEWAY" ||
      cat === "FIREWALL" ||
      cat === "ACCESS_POINT"
    ) {
      if (asset.portGroups.length === 0)
        return <PlainLabel>NO PORTS DEFINED</PlainLabel>;
      // Honor the faceplate editor's per-group face: only front-face (or
      // unassigned) groups render here; REAR groups render on the rear face.
      const frontGroups  = asset.portGroups.filter((g) => (g.face ?? "FRONT") === "FRONT");
      const leftGroups   = frontGroups.filter((g) => g.side === "LEFT" || !g.side);
      const centerGroups = frontGroups.filter((g) => g.side === "CENTER");
      const rightGroups  = frontGroups.filter((g) => g.side === "RIGHT");
      const renderGroup = (g: typeof asset.portGroups[number]) => (
        <Zone
          key={g.id}
          title={g.name ?? PORT_TYPE_LABELS[g.portType as (typeof PORT_TYPES)[number]]}
        >
          <PortGrid
            groupId={g.id}
            count={g.portCount}
            connectedPorts={g.connectedPorts}
            portType={g.portType}
            rows={g.rows}
            columns={g.columns}
            hidden={g.hiddenPorts}
            heightU={asset.rackUnits ?? 1}
            onInspect={onInspect}
          />
        </Zone>
      );
      return (
        <>
          {leftGroups.map(renderGroup)}
          {centerGroups.map(renderGroup)}
          {rightGroups.map(renderGroup)}
        </>
      );
    }
    if (cat === "KVM")
      return (
        <Zone title="KVM CHANNELS">
          <KvmGrid
            assetId={asset.id}
            count={asset.kvmChannelCount ?? 0}
            connectedKvmChannels={asset.connectedKvmChannels}
            onInspect={onInspect}
          />
        </Zone>
      );
    if (cat === "UPS")
      return (
        <PlainLabel>
          {asset.formFactor !== "TOWER" && <span className="text-base">🔋</span>}
          <span>UPS</span>
        </PlainLabel>
      );
    if (cat === "PDU")
      return <PlainLabel>{asset.formFactor === "TOWER" ? "PDU" : "POWER DISTRIBUTION"}</PlainLabel>;
    if (cat === "SHELF")
      return (
        <Zone title="ON SHELF">
          <ShelfItems items={asset.shelfItems} onInspect={onInspect} />
        </Zone>
      );
    if (cat === "DRAWER")
      return <PlainLabel>PULL-OUT KEYBOARD / MOUSE DRAWER</PlainLabel>;
    if (cat === "BLANK_PANEL")
      return <PlainLabel>— BLANKING PANEL —</PlainLabel>;
    return <PlainLabel>{enumLabel(cat)}</PlainLabel>;
  }

  // REAR face (after orientation swap)
  if (cat === "SERVER" || cat === "NUC" || cat === "SBC") {
    return (
      <>
        {driveBaysOnFace.map((z) => (
          <Zone key={z.id} title={z.name}>
            <DriveBayGrid
              zone={z}
              heightU={asset.rackUnits ?? 1}
              onInspect={onInspect}
            />
          </Zone>
        ))}
        {/* Port groups — if structured LAN groups exist use them; otherwise fall back to
            NicGrid (builtIn counts). PCIe NIC/RAID cards always get separate zones.
            IPMI groups always render as their own Zone. */}
        {(() => {
          const lanGroups = asset.portGroups.filter((g) => g.portType !== "IPMI");
          const ipmiGroups = asset.portGroups.filter((g) => g.portType === "IPMI");
          return (
            <>
              {lanGroups.length > 0 ? (
                lanGroups.map((g) => (
                  <Zone
                    key={g.id}
                    title={g.name ?? PORT_TYPE_LABELS[g.portType as (typeof PORT_TYPES)[number]]}
                  >
                    <PortGrid
                      groupId={g.id}
                      count={g.portCount}
                      connectedPorts={g.connectedPorts}
                      portType={g.portType}
                    rows={g.rows}
                    columns={g.columns}
                    hidden={g.hiddenPorts}
                      heightU={asset.rackUnits ?? 1}
                      onInspect={onInspect}
                    />
                  </Zone>
                ))
              ) : (
                <Zone title="NICS">
                  <NicGrid
                    assetId={asset.id}
                    ethernet={asset.builtInEthernetCount ?? 4}
                    sfp={asset.builtInSfpCount ?? 0}
                    heightU={asset.rackUnits ?? 1}
                    onInspect={onInspect}
                  />
                </Zone>
              )}
              {/* PCIe NIC/RAID card ports — always separate zones after built-in NICs */}
              {asset.pciNics.map((nic) => (
                <Zone key={nic.componentId} title={`PCIe SLOT ${nic.slotSortOrder + 1}`}>
                  <PciNicGrid
                    componentId={nic.componentId}
                    slotSortOrder={nic.slotSortOrder}
                    portCount={nic.portCount}
                    portType={nic.portType}
                    portSpeed={nic.portSpeed}
                    heightU={asset.rackUnits ?? 1}
                    onInspect={onInspect}
                  />
                </Zone>
              ))}
              {ipmiGroups.map((g) => (
                <Zone key={g.id} title={g.name ?? "IPMI"}>
                  <PortGrid
                    groupId={g.id}
                    count={g.portCount}
                    connectedPorts={g.connectedPorts}
                    portType={g.portType}
                    rows={g.rows}
                    columns={g.columns}
                    hidden={g.hiddenPorts}
                    heightU={asset.rackUnits ?? 1}
                    onInspect={onInspect}
                  />
                </Zone>
              ))}
            </>
          );
        })()}
        <Zone title="PSU">
          <PsuGrid
            assetId={asset.id}
            psus={asset.psus}
            psuCount={asset.psuCount}
            connectedPsuOrders={asset.connectedPsuOrders}
            heightU={asset.rackUnits ?? 1}
            onInspect={onInspect}
          />
        </Zone>
      </>
    );
  }
  if (cat === "UPS" || cat === "PDU") {
    if (asset.formFactor === "TOWER") return <TowerConnSummary asset={asset} />;
    // Rack UPS/PDU units have a physical power inlet (the cord feeding them),
    // just like switches/firewalls. Render it as a clickable inlet before the
    // POWER OUT outlets so its supply connection can be documented.
    const inletZone = (
      <Zone
        title="PWR INLET"
        titleClassName={cat === "UPS" ? "text-cat-ups" : "text-cat-pdu"}
      >
        <PsuGrid
          assetId={asset.id}
          psus={asset.psus}
          psuCount={Math.max(1, asset.psuCount ?? 1)}
          connectedPsuOrders={asset.connectedPsuOrders}
          heightU={asset.rackUnits ?? 1}
          onInspect={onInspect}
        />
      </Zone>
    );
    if (asset.outletGroups.length === 0)
      return (
        <>
          {inletZone}
          <Zone
            title="POWER OUT"
            titleClassName={
              cat === "UPS" ? "text-cat-ups" : "text-cat-pdu"
            }
          >
            <p className="text-[8px] text-faint">No outlets</p>
          </Zone>
        </>
      );
    return (
      <>
        {inletZone}
        {asset.outletGroups.map((g) => (
          <Zone
            key={g.id}
            title={g.name ?? g.outletType ?? "POWER OUT"}
            titleClassName={
              g.batteryBacked
                ? "text-cat-ups"
                : cat === "UPS"
                  ? "text-cat-ups"
                  : "text-cat-pdu"
            }
          >
            <OutletGrid
              groupId={g.id}
              count={g.outletCount}
              connectedOutlets={g.connectedOutlets}
              heightU={asset.rackUnits ?? 1}
              batteryBacked={g.batteryBacked}
              surgeProtected={g.surgeProtected}
              rows={g.rows}
              columns={g.columns}
              hidden={g.hiddenPorts}
              onInspect={onInspect}
            />
          </Zone>
        ))}
      </>
    );
  }
  if (cat === "BLANK_PANEL") return <PlainLabel>— BLANKING PANEL —</PlainLabel>;
  if (cat === "DRAWER") return <PlainLabel>DRAWER</PlainLabel>;
  if (cat === "SHELF") return <PlainLabel>SHELF</PlainLabel>;
  if (cat === "KVM") return <PlainLabel>KVM CABLES + CONSOLE</PlainLabel>;
  // Patch panel rear face — only KEYSTONE panels reach here (COUPLER panels are thin,
  // filtered to show on one face only, and render both sections in the front-face branch).
  if (cat === "PATCH_PANEL") {
    if (asset.portGroups.length === 0) return <PlainLabel>PUNCH-DOWN SIDE</PlainLabel>;
    return (
      <>
        {asset.portGroups.map((g) => (
          <Zone
            key={g.id}
            title={`${g.name ?? PORT_TYPE_LABELS[g.portType as (typeof PORT_TYPES)[number]]} — Permanent`}
            titleClassName="text-cat-ups"
          >
            <PortGrid
              groupId={g.id}
              count={g.portCount}
              connectedPorts={g.connectedRearPorts ?? []}
              portType={g.portType}
              rows={g.rows}
              columns={g.columns}
              hidden={g.hiddenPorts}
              heightU={asset.rackUnits ?? 1}
              onInspect={onInspect}
            />
          </Zone>
        ))}
      </>
    );
  }
  // For SWITCH, GATEWAY, FIREWALL, ACCESS_POINT rear — show any port groups the
  // faceplate editor pinned to the rear, then a clickable PWR INLET. Fall back
  // to 1 PSU if none recorded so there's always something to click.
  const rearGroups = asset.portGroups.filter((g) => g.face === "REAR");
  return (
    <>
      {rearGroups.map((g) => (
        <Zone
          key={g.id}
          title={g.name ?? PORT_TYPE_LABELS[g.portType as (typeof PORT_TYPES)[number]]}
        >
          <PortGrid
            groupId={g.id}
            count={g.portCount}
            connectedPorts={g.connectedPorts}
            portType={g.portType}
            rows={g.rows}
            columns={g.columns}
            hidden={g.hiddenPorts}
            heightU={asset.rackUnits ?? 1}
            onInspect={onInspect}
          />
        </Zone>
      ))}
      <Zone title="PWR INLET">
        <PsuGrid
          assetId={asset.id}
          psus={asset.psus}
          psuCount={Math.max(1, asset.psuCount ?? 1)}
          connectedPsuOrders={asset.connectedPsuOrders}
          heightU={asset.rackUnits ?? 1}
          onInspect={onInspect}
        />
      </Zone>
    </>
  );
}

function TowerConnSummary({ asset }: { asset: DiagramAsset }) {
  const totalOutlets = asset.outletGroups.reduce((s, g) => s + g.outletCount, 0);
  const connectedOutlets = asset.outletGroups.reduce(
    (s, g) => s + g.connectedOutlets.length,
    0,
  );
  const totalPsus = asset.psuCount ?? asset.psus.length;
  const connectedPsus = asset.connectedPsuOrders.length;
  const totalPorts = asset.portGroups.reduce((s, g) => s + g.portCount, 0);
  const connectedPorts = asset.portGroups.reduce(
    (s, g) => s + g.connectedPorts.length,
    0,
  );
  const totalKvm = asset.kvmChannelCount ?? 0;
  const connectedKvm = asset.connectedKvmChannels.length;

  const rows = (
    [
      totalOutlets > 0 && { label: "outlets", connected: connectedOutlets, total: totalOutlets },
      totalPsus > 0   && { label: "PSU",     connected: connectedPsus,    total: totalPsus    },
      totalPorts > 0  && { label: "ports",   connected: connectedPorts,   total: totalPorts   },
      totalKvm > 0    && { label: "KVM",     connected: connectedKvm,     total: totalKvm     },
    ] as const
  ).filter((r): r is { label: string; connected: number; total: number } => Boolean(r));

  if (rows.length === 0) return <PlainLabel>—</PlainLabel>;

  return (
    <div className="flex flex-col justify-center gap-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-1">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              r.connected > 0 ? "bg-status-green" : "bg-border"
            }`}
          />
          <span
            className={`text-[9px] font-bold tabular-nums ${
              r.connected > 0 ? "text-status-green" : "text-faint"
            }`}
          >
            {r.connected}/{r.total}
          </span>
        </div>
      ))}
    </div>
  );
}

function PlainLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-2 text-[9px] font-bold uppercase leading-tight tracking-[0.7px] text-faint">
      {children}
    </div>
  );
}

// Fixed bay size per drive size (CLAUDE.md §7) — never shrinks to fit a
// small device. The zone wraps to as many rows as it needs.
const BAY_SIZE: Record<string, { w: number; h: number }> = {
  LFF: { w: 30, h: 14 },
  SFF: { w: 15, h: 15 },
  M2:  { w: 24, h: 10 },
};

export function DriveBayGrid({
  zone,
  heightU,
  onInspect,
  pxPerInch,
  cols,
}: {
  zone: DiagramAsset["bayZones"][number];
  heightU: number;
  onInspect: (target: string) => void;
  pxPerInch?: number;
  cols?: number; // resolved/clamped columns from the faceplate layout
}) {
  const prefs = useDiagramPrefs();
  if (prefs.hideBays) return null;
  const size = BAY_SIZE[zone.driveSize] ?? BAY_SIZE.SFF;
  const drivesByBay = new Map(
    zone.drives
      .filter((d) => d.bayNumber != null)
      .map((d) => [d.bayNumber as number, d]),
  );
  const bays = Array.from({ length: zone.bayCount }, (_, i) => i + 1);
  // Resolved columns (clamped to fit the face) win; then explicit shape; then
  // fit rows to the device height as before.
  const perRow =
    cols && cols > 0
      ? cols
      : zone.columns && zone.columns > 0
      ? zone.columns
      : zone.rows && zone.rows > 0
        ? Math.ceil(zone.bayCount / zone.rows)
        : Math.ceil(
            zone.bayCount /
              Math.max(1, Math.floor((heightU * U_PX - 22) / (size.h + 3))),
          );
  // Physical mode (faceplate designer / custom layout): each bay is drawn at its
  // real size (LFF ≈ 4"×1") scaled by pxPerInch.
  if (pxPerInch) {
    const el = bayElementInches(zone.driveSize);
    const ew = Math.max(8, Math.round(el.w * pxPerInch));
    const eh = Math.max(6, Math.round(el.h * pxPerInch));
    const gap = Math.max(1, Math.round(ELEMENT_GAP_INCHES * pxPerInch));
    return (
      <div className="grid" style={{ gridTemplateColumns: `repeat(${perRow}, ${ew}px)`, gap }}>
        {bays.map((n) => {
          const drive = drivesByBay.get(n);
          return (
            <button
              key={n}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onInspect(`bay:${zone.id}:${n}`); }}
              style={{ width: ew, height: eh, fontSize: Math.max(5, Math.min(eh - 4, 9)) }}
              className={`flex cursor-pointer items-center justify-center rounded-[2px] border font-black leading-none ${
                drive ? "border-[#52d062] bg-cat-server text-bg" : "border-[#3a424d] bg-[#2a313b] text-faint"
              }`}
              title={
                drive
                  ? `Bay ${n}: ${drive.name} · ${drive.kind} · ${drive.capacityGB} GB`
                  : `Bay ${n}: empty — click to add a drive`
              }
            >
              {eh >= 12 ? (drive ? drive.kind : "") : ""}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div
      className="flex flex-wrap content-center gap-[3px]"
      style={{ maxWidth: perRow * (size.w + 3) }}
    >
      {bays.map((n) => {
        const drive = drivesByBay.get(n);
        return (
          <button
            key={n}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onInspect(`bay:${zone.id}:${n}`);
            }}
            style={{ width: size.w, height: size.h }}
            className={`flex shrink-0 cursor-pointer items-center justify-center rounded-[2px] border text-[6px] font-black leading-none transition-transform hover:scale-110 hover:shadow-[0_0_8px_rgba(0,168,198,0.7)] ${
              drive
                ? "border-[#52d062] bg-cat-server text-bg"
                : "border-[#3a424d] bg-[#2a313b] text-faint"
            }`}
            title={
              drive
                ? `Bay ${n}: ${drive.name} · ${drive.kind} · ${drive.capacityGB} GB`
                : `Bay ${n}: empty — click to add a drive`
            }
          >
            {drive ? drive.kind : ""}
          </button>
        );
      })}
    </div>
  );
}

// Port square size scales with device height so 1U fits 2 rows without
// clipping. 48-port 1U is the supported ceiling per CLAUDE.md §7.
function portSize(heightU: number): number {
  return Math.max(7, Math.min(Math.floor((heightU * U_PX - 22 - 3) / 2), 15));
}

export function PortGrid({
  groupId,
  count,
  connectedPorts,
  portType,
  heightU,
  onInspect,
  rows: rowsProp,
  columns: colsProp,
  hidden,
  pxPerInch,
}: {
  groupId: string;
  count: number;
  connectedPorts: number[];
  portType?: string;
  heightU: number;
  onInspect: (target: string) => void;
  rows?: number | null;
  columns?: number | null;
  hidden?: number[] | null;
  pxPerInch?: number;
}) {
  // Hooks first (before any early return) so toggling filters can't change the
  // hook order between renders.
  const { portLabels } = useDiagramSettings();
  const prefs = useDiagramPrefs();
  if (prefs.hidePorts) return null;
  if (count <= 0) return null;
  const sz = portSize(heightU);
  // Hidden ports are omitted from the render but keep their port numbers so
  // connections still address them correctly.
  const hiddenSet = new Set(hidden ?? []);
  const slots = Array.from({ length: count }, (_, i) => i + 1).filter(
    (n) => !hiddenSet.has(n),
  );
  if (slots.length === 0) return null;
  // Columns-per-row: explicit columns wins; else derive from an explicit row
  // count; else the default two-row strip.
  const per =
    colsProp && colsProp > 0
      ? colsProp
      : rowsProp && rowsProp > 0
        ? Math.ceil(slots.length / rowsProp)
        : Math.ceil(slots.length / 2);
  const rows: number[][] = [];
  for (let i = 0; i < slots.length; i += per) {
    rows.push(slots.slice(i, i + per));
  }
  const connectedSet = new Set(connectedPorts);
  const shortLabel = portType ? (portLabels[portType] ?? DEFAULT_PORT_TYPE_LABELS[portType] ?? portType.slice(0, 3)) : "";
  if (pxPerInch) {
    const el = portElementInches(portType);
    const ew = Math.max(5, Math.round(el.w * pxPerInch));
    const eh = Math.max(5, Math.round(el.h * pxPerInch));
    const gap = Math.max(1, Math.round(ELEMENT_GAP_INCHES * pxPerInch));
    return (
      <div className="grid" style={{ gridTemplateColumns: `repeat(${per}, ${ew}px)`, gap }}>
        {slots.map((n) => {
          const connected = connectedSet.has(n);
          return (
            <button
              key={n}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onInspect(`port:${groupId}:${n}`); }}
              style={{ width: ew, height: eh, fontSize: Math.max(5, Math.min(eh - 4, 8)) }}
              className={`flex cursor-pointer items-center justify-center overflow-hidden rounded-[1.5px] border font-bold leading-none ${
                connected ? portTypeClass(portType ?? "ETHERNET") : PORT_EMPTY_CLASS
              }`}
              title={`${portType ?? "Port"} ${n}${connected ? " (connected)" : ""}`}
            >
              {eh >= 11 ? shortLabel : ""}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[3px]">
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-[3px]">
          {row.map((n) => {
            const connected = connectedSet.has(n);
            return (
              <button
                key={n}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onInspect(`port:${groupId}:${n}`);
                }}
                style={{ width: sz, height: sz, fontSize: Math.max(5, sz - 6), lineHeight: `${sz}px` }}
                className={`shrink-0 cursor-pointer overflow-hidden rounded-[1.5px] border font-bold text-center transition-transform hover:scale-125 hover:shadow-[0_0_7px_rgba(0,168,198,0.7)] ${
                  connected ? portTypeClass(portType ?? "ETHERNET") : PORT_EMPTY_CLASS
                }`}
                title={`${portType ?? "Port"} ${n}${connected ? " (connected)" : ""}`}
              >
                {sz >= 10 && shortLabel}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function OutletGrid({
  groupId,
  count,
  connectedOutlets,
  heightU,
  batteryBacked,
  surgeProtected,
  onInspect,
  rows: rowsProp,
  columns: colsProp,
  hidden,
  pxPerInch,
}: {
  groupId: string;
  count: number;
  connectedOutlets: number[];
  heightU: number;
  batteryBacked: boolean;
  surgeProtected: boolean;
  onInspect: (target: string) => void;
  rows?: number | null;
  columns?: number | null;
  hidden?: number[] | null;
  pxPerInch?: number;
}) {
  const prefs = useDiagramPrefs();
  if (prefs.hidePorts) return null;
  if (count <= 0) return null;
  // Overhead: ~24px (margins+borders+zone-title+padding). sz=8 for 1U fits 2 rows (8+3+8=19px ≤ ~19px available).
  const sz = Math.max(6, Math.min(Math.floor((heightU * U_PX - 24) / 2), 16));
  const hiddenSet = new Set(hidden ?? []);
  const slots = Array.from({ length: count }, (_, i) => i + 1).filter(
    (n) => !hiddenSet.has(n),
  );
  if (slots.length === 0) return null;
  const per =
    colsProp && colsProp > 0
      ? colsProp
      : rowsProp && rowsProp > 0
        ? Math.ceil(slots.length / rowsProp)
        : Math.ceil(slots.length / 2);
  const rows: number[][] = [];
  for (let i = 0; i < slots.length; i += per) {
    rows.push(slots.slice(i, i + per));
  }
  const connectedSet = new Set(connectedOutlets);
  const icon = batteryBacked ? "B" : surgeProtected ? "~" : null;
  if (pxPerInch) {
    const d = Math.max(6, Math.round(ELEMENT_INCHES.outlet.w * pxPerInch));
    const gap = Math.max(1, Math.round(ELEMENT_GAP_INCHES * pxPerInch));
    return (
      <div className="grid" style={{ gridTemplateColumns: `repeat(${per}, ${d}px)`, gap }}>
        {slots.map((n) => {
          const connected = connectedSet.has(n);
          return (
            <button
              key={n}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onInspect(`outlet:${groupId}:${n}`); }}
              style={{ width: d, height: d }}
              className={`flex cursor-pointer items-center justify-center rounded-full border ${
                connected ? "border-[#52d062]/60 bg-status-green/25" : "border-[#3a424d] bg-[#2a313b]"
              }`}
              title={`Outlet ${n}${connected ? " (connected)" : batteryBacked ? " (battery-backed)" : surgeProtected ? " (surge-protected)" : ""}`}
            >
              {icon && d >= 10 && <span className={`text-[6px] font-bold leading-none ${connected ? "text-[#0d1117]" : "text-faint"}`}>{icon}</span>}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-[3px]">
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-[3px]">
          {row.map((n) => {
            const connected = connectedSet.has(n);
            return (
              <button
                key={n}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onInspect(`outlet:${groupId}:${n}`);
                }}
                style={{ width: sz, height: sz }}
                className={`shrink-0 cursor-pointer rounded-full border transition-transform hover:scale-125 hover:shadow-[0_0_7px_rgba(0,168,198,0.7)] flex items-center justify-center ${
                  connected
                    ? "border-[#52d062]/60 bg-status-green/25"
                    : "border-[#3a424d] bg-[#2a313b]"
                }`}
                title={`Outlet ${n}${connected ? " (connected)" : batteryBacked ? " (battery-backed)" : surgeProtected ? " (surge-protected)" : ""}`}
              >
                {sz >= 8 && icon && (
                  <span className={`text-[5px] font-bold leading-none ${connected ? "text-[#0d1117]" : "text-faint"}`}>{icon}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function KvmGrid({
  assetId,
  count,
  connectedKvmChannels,
  onInspect,
}: {
  assetId: string;
  count: number;
  connectedKvmChannels: number[];
  onInspect: (target: string) => void;
}) {
  const prefs = useDiagramPrefs();
  if (prefs.hidePorts) return null;
  if (count <= 0) return null;
  const channels = Array.from({ length: count }, (_, i) => i + 1);
  const connectedSet = new Set(connectedKvmChannels);
  return (
    <div className="flex flex-wrap content-center gap-1">
      {channels.map((n) => {
        const connected = connectedSet.has(n);
        return (
          <button
            key={n}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onInspect(`kvm:${assetId}:${n}`);
            }}
            className={`flex h-[17px] w-[17px] shrink-0 cursor-pointer items-center justify-center rounded-[3px] border text-[8px] font-black transition-transform hover:scale-110 hover:shadow-[0_0_7px_rgba(0,168,198,0.6)] ${
              connected
                ? "border-cat-kvm bg-cat-kvm text-[#0d1117]"
                : "border-cat-kvm/60 bg-[#26333f] text-[#f0a868]"
            }`}
            title={`Channel ${n}${connected ? " — connected" : ""}`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

export function NicGrid({
  assetId,
  ethernet,
  sfp,
  heightU,
  onInspect,
  pxPerInch,
}: {
  assetId: string;
  ethernet: number;
  sfp: number;
  heightU: number;
  onInspect: (target: string) => void;
  pxPerInch?: number;
}) {
  const prefs = useDiagramPrefs();
  if (prefs.hidePorts) return null;
  const sz = Math.min(portSize(heightU) + 2, 15);
  const showLabel = sz >= 10;
  if (pxPerInch) {
    const el = ELEMENT_INCHES.port;
    const ew = Math.max(5, Math.round(el.w * pxPerInch));
    const eh = Math.max(5, Math.round(el.h * pxPerInch));
    const gap = Math.max(1, Math.round(ELEMENT_GAP_INCHES * pxPerInch));
    const big = eh >= 11;
    return (
      <div className="flex" style={{ gap }}>
        {Array.from({ length: ethernet }, (_, i) => (
          <button
            key={`eth-${i}`}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onInspect(`nic:${assetId}:eth:${i + 1}`); }}
            style={{ width: ew, height: eh, fontSize: Math.max(5, Math.min(eh - 4, 8)) }}
            className="flex cursor-pointer items-center justify-center overflow-hidden rounded-[1.5px] border border-[#3a424d] bg-[#2a313b] font-bold leading-none text-faint"
            title={`NIC ${i + 1}`}
          >
            {big ? "GbE" : ""}
          </button>
        ))}
        {Array.from({ length: sfp }, (_, i) => (
          <button
            key={`sfp-${i}`}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onInspect(`nic:${assetId}:sfp:${i + 1}`); }}
            style={{ width: ew, height: eh, fontSize: Math.max(5, Math.min(eh - 4, 8)) }}
            className={`flex cursor-pointer items-center justify-center overflow-hidden rounded-[1.5px] border font-bold leading-none ${PORT_EMPTY_CLASS}`}
            title={`SFP ${i + 1}`}
          >
            {big ? "S+" : ""}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: ethernet }, (_, i) => (
        <button
          key={`eth-${i}`}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onInspect(`nic:${assetId}:eth:${i + 1}`);
          }}
          style={{ width: sz, height: sz, fontSize: Math.max(5, sz - 6), lineHeight: `${sz}px` }}
          className="shrink-0 cursor-pointer overflow-hidden rounded-[1.5px] border border-[#3a424d] bg-[#2a313b] font-bold text-center text-faint transition-transform hover:scale-125 hover:shadow-[0_0_7px_rgba(0,168,198,0.7)]"
          title={`NIC ${i + 1}`}
        >
          {showLabel && "GbE"}
        </button>
      ))}
      {Array.from({ length: sfp }, (_, i) => (
        <button
          key={`sfp-${i}`}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onInspect(`nic:${assetId}:sfp:${i + 1}`);
          }}
          style={{ width: sz, height: sz, fontSize: Math.max(5, sz - 6), lineHeight: `${sz}px` }}
          className={`shrink-0 cursor-pointer overflow-hidden rounded-[1.5px] border font-bold text-center transition-transform hover:scale-125 hover:shadow-[0_0_7px_rgba(0,168,198,0.7)] ${PORT_EMPTY_CLASS}`}
          title={`SFP ${i + 1}`}
        >
          {showLabel && "S+"}
        </button>
      ))}
    </div>
  );
}

function PciNicGrid({
  componentId,
  slotSortOrder,
  portCount,
  portType,
  portSpeed,
  heightU,
  onInspect,
}: {
  componentId: string;
  slotSortOrder: number;
  portCount: number;
  portType?: string;
  portSpeed?: string | null;
  heightU: number;
  onInspect: (target: string) => void;
}) {
  const { portLabels } = useDiagramSettings();
  const prefs = useDiagramPrefs();
  if (prefs.hidePorts) return null;
  if (portCount <= 0) return null;
  const sz = portSize(heightU);
  const per = Math.ceil(portCount / 2);
  const slots = Array.from({ length: portCount }, (_, i) => i + 1);
  const rows: number[][] = [];
  for (let r = 0; r < 2; r++) {
    const row = slots.slice(r * per, (r + 1) * per);
    if (row.length > 0) rows.push(row);
  }
  const shortLabel = portType ? (portLabels[portType] ?? DEFAULT_PORT_TYPE_LABELS[portType] ?? portType.slice(0, 3)) : "N";
  return (
    <div className="flex flex-col gap-[3px]">
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-[3px]">
          {row.map((n) => (
            <button
              key={n}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onInspect(`nic-pcie:${componentId}:${n}`);
              }}
              style={{ width: sz, height: sz, fontSize: Math.max(5, sz - 6), lineHeight: `${sz}px` }}
              className={`shrink-0 cursor-pointer overflow-hidden rounded-[1.5px] border font-bold text-center transition-transform hover:scale-125 hover:shadow-[0_0_7px_rgba(0,168,198,0.7)] ${PORT_EMPTY_CLASS}`}
              title={`Slot ${slotSortOrder + 1} · Port ${n}${portSpeed ? ` · ${portSpeed}` : ""}`}
            >
              {sz >= 10 && shortLabel}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function PsuGrid({
  assetId,
  psus,
  psuCount,
  connectedPsuOrders,
  heightU,
  onInspect,
}: {
  assetId: string;
  psus: DiagramAsset["psus"];
  psuCount: number | null;
  // sort orders (0-based) of PSUs that have an incoming POWER connection
  connectedPsuOrders: number[];
  heightU: number;
  onInspect: (target: string) => void;
}) {
  const prefs = useDiagramPrefs();
  if (prefs.hidePorts) return null;
  const ph = Math.min(heightU * U_PX - 26, 18);
  const count = psus.length > 0 ? psus.length : (psuCount ?? 0);
  if (count <= 0) return null;
  const connectedSet = new Set(connectedPsuOrders);
  return (
    <div className="flex items-center gap-1.5">
      {psus.length > 0
        ? psus.map((psu, i) => {
            const connected = connectedSet.has(psu.sortOrder);
            return (
              <button
                key={psu.id}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onInspect(`psu:${assetId}:${i + 1}`);
                }}
                style={{ width: ph * 1.7, height: ph }}
                className={`relative shrink-0 cursor-pointer overflow-hidden rounded-[2px] border transition-colors hover:border-accent ${
                  psu.state !== "IN_USE"
                    ? "border-border/30 bg-panel-2/40 opacity-60"
                    : connected
                      ? "border-status-green/60 bg-status-green/20"
                      : "border-[#3a424d] bg-[#2a313b]"
                }`}
                title={`PSU ${i + 1}${psu.wattage ? ` — ${psu.wattage}W` : ""}${connected ? " — powered" : " — no power connection"}${psu.state !== "IN_USE" ? ` (${psu.state})` : ""}`}
              >
                <span className={`absolute inset-0 flex items-center justify-center text-[7px] ${connected ? "text-status-green" : "text-faint"}`}>
                  ⚡
                </span>
              </button>
            );
          })
        : Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onInspect(`psu:${assetId}:${i + 1}`);
              }}
              style={{ width: ph * 1.7, height: ph }}
              className="shrink-0 cursor-pointer rounded-[2px] border border-[#3a424d] bg-[#2a313b] transition-colors hover:border-accent"
              title={`PSU ${i + 1}`}
            >
              <span className="flex h-full items-center justify-center text-[7px] text-faint">⚡</span>
            </button>
          ))}
    </div>
  );
}

function DraggableShelfItem({
  item,
  onInspect,
}: {
  item: DiagramAsset["shelfItems"][number];
  onInspect: (target: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shelf-item:${item.id}`,
    data: {
      assetId: item.id,
      asset: {
        id: item.id,
        codename: item.codename,
        name: item.name,
        category: item.category,
        formFactor: "SHELF_ITEM",
        startU: null,
        rackUnits: null,
        gridColumn: null,
        columnSpan: null,
        state: "IN_USE",
        requiresSupport: false,
        depthInches: null,
        faceOrientation: null,
        rackFace: null,
        patchPanelType: null,
        kvmChannelCount: null,
        builtInEthernetCount: null,
        builtInSfpCount: null,
        psuCount: null,
        psus: [],
        connectedPsuOrders: [],
        connectedKvmChannels: [],
        bayZones: [],
        portGroups: [],
        outletGroups: [],
        shelfItems: [],
        pciNics: [],
      } satisfies DiagramAsset,
    },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.35 : 1 }}
      className="flex cursor-grab items-center gap-1 rounded-[4px] border border-[#3a424d] bg-[#26333f] px-2 py-px text-[9px] font-black uppercase text-text hover:border-accent/60 active:cursor-grabbing"
      title={`${item.codename} — ${item.name} (drag to move)`}
    >
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onInspect(`asset:${item.id}`);
        }}
        className="cursor-pointer"
      >
        {item.codename}
      </button>
    </div>
  );
}

function ShelfItems({
  items,
  onInspect,
}: {
  items: DiagramAsset["shelfItems"];
  onInspect: (target: string) => void;
}) {
  if (items.length === 0)
    return (
      <p className="text-[9px] uppercase tracking-wide text-faint">Empty shelf</p>
    );
  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((it) => (
        <DraggableShelfItem key={it.id} item={it} onInspect={onInspect} />
      ))}
    </div>
  );
}

function StorageStrip({
  storages,
  unboxed,
  onAssetClick,
  isTouch,
  placingId,
  onSelectForPlace,
  onTapPlace,
}: {
  storages: StorageBox[];
  unboxed: StorageItem[];
  onAssetClick: (id: string) => void;
  isTouch: boolean;
  placingId: string | null;
  onSelectForPlace: (asset: { id: string; codename: string }) => void;
  onTapPlace: (target: PlacementTarget) => void;
}) {
  return (
    <Panel>
      <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-accent">
            Storage
          </h2>
          <p className="mt-0.5 text-[11px] text-text-dim">
            Drag assets in or out. Drop on a box to put it in storage; drag
            from a box onto the rack to place it.
          </p>
        </div>
        <LinkButton href="/storages/new" className="px-2.5 py-1 text-xs">
          New storage
        </LinkButton>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {storages.map((s) => (
          <DroppableStorageBox
            key={s.id}
            storage={s}
            onAssetClick={onAssetClick}
            isTouch={isTouch}
            placingId={placingId}
            onSelectForPlace={onSelectForPlace}
            onTapPlace={onTapPlace}
          />
        ))}
        <DroppableUnboxedBin
          assets={unboxed}
          onAssetClick={onAssetClick}
          isTouch={isTouch}
          placingId={placingId}
          onSelectForPlace={onSelectForPlace}
          onTapPlace={onTapPlace}
        />
        {storages.length === 0 && unboxed.length === 0 && (
          <p className="col-span-full px-3 py-6 text-center text-[12px] text-faint">
            No off-rack inventory yet.
          </p>
        )}
      </div>
    </Panel>
  );
}

function DroppableStorageBox({
  storage,
  onAssetClick,
  isTouch,
  placingId,
  onSelectForPlace,
  onTapPlace,
}: {
  storage: StorageBox;
  onAssetClick: (id: string) => void;
  isTouch: boolean;
  placingId: string | null;
  onSelectForPlace: (asset: { id: string; codename: string }) => void;
  onTapPlace: (target: PlacementTarget) => void;
}) {
  const target: PlacementTarget = { kind: "storage", storageId: storage.id };
  const { isOver, setNodeRef } = useDroppable({
    id: `storage:${storage.id}`,
    data: target,
  });
  const placing = placingId != null;
  return (
    <div
      ref={setNodeRef}
      onClick={placing ? () => onTapPlace(target) : undefined}
      className={`rounded-md border p-3 transition-colors ${
        isOver || placing
          ? "border-accent bg-accent/10"
          : "border-border bg-panel-2"
      } ${placing ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-baseline justify-between">
        <Link
          href={`/storages/${storage.id}`}
          className="text-[12px] font-bold text-text hover:text-accent hover:underline"
        >
          {storage.name}
        </Link>
        <span className="text-[10.5px] text-text-dim">
          {storage.assets.length} item{storage.assets.length === 1 ? "" : "s"}
        </span>
      </div>
      {storage.assets.length === 0 ? (
        <p className="mt-2 text-[10.5px] text-faint">Empty.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1">
          {storage.assets.map((a) => (
            <DraggableStorageChip
              key={a.id}
              asset={a}
              onClick={onAssetClick}
              isTouch={isTouch}
              isPlacing={placingId === a.id}
              onSelectForPlace={onSelectForPlace}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DroppableUnboxedBin({
  assets,
  onAssetClick,
  isTouch,
  placingId,
  onSelectForPlace,
  onTapPlace,
}: {
  assets: StorageItem[];
  onAssetClick: (id: string) => void;
  isTouch: boolean;
  placingId: string | null;
  onSelectForPlace: (asset: { id: string; codename: string }) => void;
  onTapPlace: (target: PlacementTarget) => void;
}) {
  const target: PlacementTarget = { kind: "storage", storageId: null };
  const { isOver, setNodeRef } = useDroppable({
    id: "storage:null",
    data: target,
  });
  const placing = placingId != null;
  return (
    <div
      ref={setNodeRef}
      onClick={placing ? () => onTapPlace(target) : undefined}
      className={`rounded-md border border-dashed p-3 transition-colors ${
        isOver || placing
          ? "border-accent bg-accent/10"
          : "border-border bg-panel-2"
      } ${placing ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-bold text-text-dim">Unboxed</span>
        <span className="text-[10.5px] text-text-dim">
          {assets.length} item{assets.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-faint">
        Off-rack assets without a storage box. Drop one here to keep it
        off-rack without assigning a box.
      </p>
      {assets.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {assets.map((a) => (
            <DraggableStorageChip
              key={a.id}
              asset={a}
              onClick={onAssetClick}
              isTouch={isTouch}
              isPlacing={placingId === a.id}
              onSelectForPlace={onSelectForPlace}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DraggableStorageChip({
  asset,
  onClick,
  isTouch,
  isPlacing,
  onSelectForPlace,
}: {
  asset: StorageItem;
  onClick: (id: string) => void;
  isTouch: boolean;
  isPlacing: boolean;
  onSelectForPlace: (asset: { id: string; codename: string }) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `storage-chip:${asset.id}`,
    data: {
      assetId: asset.id,
      asset: {
        id: asset.id,
        codename: asset.codename,
        name: asset.name,
        category: asset.category,
        formFactor: asset.formFactor,
        startU: null,
        rackUnits: asset.rackUnits,
        gridColumn: null,
        columnSpan: asset.columnSpan,
        state: asset.state,
        requiresSupport: false,
        depthInches: null,
        faceOrientation: null,
        rackFace: null,
        patchPanelType: null,
        kvmChannelCount: null,
        builtInEthernetCount: null,
        builtInSfpCount: null,
        psuCount: null,
        psus: [],
        connectedPsuOrders: [],
        connectedKvmChannels: [],
        bayZones: [],
        portGroups: [],
        outletGroups: [],
        shelfItems: [],
        pciNics: [],
      } satisfies DiagramAsset,
    },
  });
  const cols = asset.columnSpan ?? 1;
  const ffLabel =
    asset.formFactor === "TOWER"
      ? `Tower · ${asset.rackUnits ?? "?"}U × ${cols} col${cols !== 1 ? "s" : ""}`
      : asset.formFactor === "SHELF_ITEM"
        ? `Shelf item${asset.rackUnits ? ` · ${asset.rackUnits}U` : ""}`
        : asset.formFactor === "NON_RACK"
          ? "Non-rack"
          : asset.rackUnits
            ? `Rack · ${asset.rackUnits}U`
            : "Rack";

  return (
    <li className="group relative">
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={
          isTouch
            ? (e) => {
                e.stopPropagation();
                onSelectForPlace({ id: asset.id, codename: asset.codename });
              }
            : undefined
        }
        style={{ opacity: isDragging ? 0.35 : 1 }}
        className={`flex cursor-grab items-center gap-1 rounded border bg-panel px-1.5 py-0.5 text-[10.5px] text-text hover:border-accent/50 active:cursor-grabbing ${
          isPlacing ? "border-accent ring-1 ring-accent" : "border-border/50"
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${asset.state === "IN_USE" ? "bg-status-green" : "bg-faint"}`}
        />
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClick(asset.id);
          }}
          className="font-bold hover:text-accent"
        >
          {asset.codename}
        </button>
        <span className="text-text-dim">{enumLabel(asset.category)}</span>
      </div>
      {/* Hover tooltip — appears above chip, never interacts with drag */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 w-max max-w-[220px] invisible opacity-0 transition-opacity duration-100 group-hover:visible group-hover:opacity-100"
      >
        <div className="rounded border border-border bg-panel-2 px-2.5 py-2 shadow-lg">
          <p className="text-[11px] font-semibold leading-tight text-text">
            {asset.name}
          </p>
          <p className="mt-0.5 text-[10px] text-text-dim">
            {enumLabel(asset.category)} · {ffLabel}
          </p>
        </div>
        {/* Arrow */}
        <div className="ml-3 h-1.5 w-2 overflow-hidden">
          <div className="h-2 w-2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-panel-2" />
        </div>
      </div>
    </li>
  );
}

function InspectorDrawer({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-full flex-col border-l border-border bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-accent">
            Inspector
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-2 py-1 text-xs text-text-dim hover:border-accent/40 hover:text-text"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}
