"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { PORT_TYPE_LABELS } from "@/lib/enums";
import { useDiagramSettings } from "@/components/providers/diagram-settings-provider";
import { DEFAULT_PORT_TYPE_LABELS } from "@/lib/diagram-settings";

// ── Port style constants — uses customisable CSS vars (Admin › Settings) ──────

const PORT_EMPTY = "border-[#3a424d] bg-[#2a313b] text-faint";

function portTypeClass(type: string): string {
  switch (type) {
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
    case "SERIAL":        return "border-port-serial/60 bg-port-serial/20 text-port-serial";
    case "FIBER":         return "border-port-fiber/60 bg-port-fiber/20 text-port-fiber";
    case "THUNDERBOLT":   return "border-port-thunderbolt/60 bg-port-thunderbolt/20 text-port-thunderbolt";
    default:              return PORT_EMPTY;
  }
}

// ── Data types passed from server ────────────────────────────────────────────

export type PortGroupPanel = {
  id: string;
  name: string | null;
  portType: string;
  portCount: number;
  connectedPorts: number[];
  // For PATCH_PANEL: front = bEnd (patch) connections; rear = aEnd connections.
  // When present, the panel renders two port rows instead of one.
  connectedRearPorts?: number[];
  // "KEYSTONE" = permanent punch-down rear; "COUPLER" = ethernet both sides; null = non-patch.
  patchPanelType?: string | null;
};

export type OutletGroupPanel = {
  id: string;
  name: string | null;
  outletType: string | null;
  outletCount: number;
  batteryBacked: boolean;
  surgeProtected: boolean;
  connectedOutlets: number[];
};

export type PsuPanel = {
  id: string;
  sortOrder: number;
  wattage: number | null;
  state: string;
};

export type PciNicPanel = {
  componentId: string;
  componentName: string;
  portCount: number;
  portType: string;
  portSpeed: string | null;
  connectedPorts: number[];
  slotSortOrder: number;
  slotSize: string;
};

export type InspectorPortPanelProps = {
  assetId: string;
  portGroups: PortGroupPanel[];
  outletGroups: OutletGroupPanel[];
  psus: PsuPanel[];
  psuCount: number | null;
  connectedPsuOrders: number[];
  kvmChannelCount: number | null;
  connectedKvmChannels: number[];
  builtInEthernetCount: number | null;
  builtInSfpCount: number | null;
  pciNics: PciNicPanel[];
};

// ── Sizes ─────────────────────────────────────────────────────────────────────

const PORT_SZ   = 14; // px — port squares
const OUTLET_SZ = 16; // px — outlet circles
const KVM_SZ    = 22; // px — KVM channel buttons
const PSU_W     = 36; // px — PSU block width
const PSU_H     = 20; // px — PSU block height

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({
  label,
  count,
  connected,
}: {
  label: string;
  count: number;
  connected: number;
}) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold text-text-dim">
      {label}
      <span className="ml-1.5 font-normal text-faint">
        {connected}/{count}{" "}
        {connected > 0 ? (
          <span className="text-status-green">connected</span>
        ) : (
          "connected"
        )}
      </span>
    </p>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InspectorPortPanel({
  assetId,
  portGroups,
  outletGroups,
  psus,
  psuCount,
  connectedPsuOrders,
  kvmChannelCount,
  connectedKvmChannels,
  builtInEthernetCount,
  builtInSfpCount,
  pciNics,
}: InspectorPortPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { portLabels } = useDiagramSettings();

  function nav(target: string) {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("inspect", target);
    router.push(`?${sp.toString()}`, { scroll: false });
  }

  const connectedPsuSet = new Set(connectedPsuOrders);
  const connectedKvmSet = new Set(connectedKvmChannels);
  const psuTotal = psus.length > 0 ? psus.length : (psuCount ?? 0);
  const kvmTotal = kvmChannelCount ?? 0;

  // Show built-in NICs only when there are no structured portGroups covering them.
  const showBuiltIn =
    !portGroups.some((g) => g.portType === "ETHERNET" || g.portType === "SFP" || g.portType === "SFP_PLUS") &&
    ((builtInEthernetCount ?? 0) > 0 || (builtInSfpCount ?? 0) > 0);

  const hasAnything =
    portGroups.length > 0 ||
    outletGroups.length > 0 ||
    psuTotal > 0 ||
    kvmTotal > 0 ||
    showBuiltIn ||
    pciNics.length > 0;

  if (!hasAnything) return null;

  return (
    <div className="rounded-md border border-border bg-panel-2 p-3">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-dim">
        Interface Panel
      </p>

      <div className="flex flex-col gap-4">
        {/* ── Port groups ─────────────────────────────────────────────── */}
        {portGroups.map((pg) => {
          const shortLabel = portLabels[pg.portType] ?? DEFAULT_PORT_TYPE_LABELS[pg.portType] ?? pg.portType.slice(0, 3);
          const typeLabel =
            (PORT_TYPE_LABELS as Record<string, string>)[pg.portType] ??
            pg.portType;

          const renderPortRow = (
            connSet: Set<number>,
            portClass: (connected: boolean) => string,
            getTitle: (n: number, connected: boolean) => string,
          ) => (
            <div className="flex flex-wrap gap-[3px]">
              {Array.from({ length: pg.portCount }, (_, i) => i + 1).map((n) => {
                const connected = connSet.has(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => nav(`port:${pg.id}:${n}`)}
                    style={{ width: PORT_SZ, height: PORT_SZ, fontSize: 6, lineHeight: `${PORT_SZ}px` }}
                    className={`flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[1.5px] border font-bold transition-transform hover:scale-125 hover:shadow-[0_0_7px_rgba(0,168,198,0.7)] ${portClass(connected)}`}
                    title={getTitle(n, connected)}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          );

          // Patch panel: show FRONT (patch side) and REAR (permanent side) separately.
          if (pg.connectedRearPorts !== undefined) {
            const frontSet = new Set(pg.connectedPorts);
            const rearSet  = new Set(pg.connectedRearPorts);
            return (
              <div key={pg.id}>
                <p className="mb-2 text-[10px] font-semibold text-text-dim">
                  {pg.name ?? typeLabel}
                </p>
                {/* Front / patch side */}
                <div className="mb-2">
                  <p className="mb-1 text-[9px] uppercase tracking-wider text-faint">
                    Front — patch side
                    <span className="ml-1.5">
                      {frontSet.size > 0
                        ? <span className="text-status-green">{frontSet.size}/{pg.portCount} connected</span>
                        : <span>{frontSet.size}/{pg.portCount} connected</span>}
                    </span>
                  </p>
                  {renderPortRow(
                    frontSet,
                    (c) => c ? portTypeClass(pg.portType) : PORT_EMPTY,
                    (n, c) => `Port ${n} front (patch)${c ? " — connected" : ""}`,
                  )}
                </div>
                {/* Rear side — label depends on whether rear is permanent (keystone) or ethernet (coupler) */}
                <div className="mt-2 border-t border-border pt-2">
                  <p className="mb-1 text-[9px] uppercase tracking-wider text-faint">
                    {pg.patchPanelType === "COUPLER" ? "Rear — ethernet side" : "Rear — permanent side"}
                    <span className="ml-1.5">
                      {rearSet.size > 0
                        ? <span className="text-cat-ups">{rearSet.size}/{pg.portCount} connected</span>
                        : <span>{rearSet.size}/{pg.portCount} connected</span>}
                    </span>
                  </p>
                  {renderPortRow(
                    rearSet,
                    (c) => c ? "border-[#d9a441]/60 bg-[#3d2a08]/50 text-cat-ups" : PORT_EMPTY,
                    (n, c) => `Port ${n} rear${pg.patchPanelType === "COUPLER" ? " (ethernet)" : " (permanent)"}${c ? " — connected" : ""}`,
                  )}
                </div>
              </div>
            );
          }

          // Standard single-sided port group.
          const connSet = new Set(pg.connectedPorts);
          return (
            <div key={pg.id}>
              <SectionLabel
                label={pg.name ?? typeLabel}
                count={pg.portCount}
                connected={connSet.size}
              />
              {renderPortRow(
                connSet,
                (c) => c ? portTypeClass(pg.portType) : PORT_EMPTY,
                (n, c) => `${typeLabel} Port ${n}${c ? " (connected)" : ""}`,
              )}
            </div>
          );
        })}

        {/* ── Built-in NICs (fallback when no structured portGroups) ─── */}
        {showBuiltIn && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold text-text-dim">
              Built-in NICs
            </p>
            <div className="flex flex-wrap gap-[3px]">
              {Array.from(
                { length: builtInEthernetCount ?? 0 },
                (_, i) => i + 1,
              ).map((n) => (
                <button
                  key={`eth-${n}`}
                  type="button"
                  onClick={() => nav(`nic:${assetId}:eth:${n}`)}
                  style={{
                    width: PORT_SZ,
                    height: PORT_SZ,
                    fontSize: 6,
                    lineHeight: `${PORT_SZ}px`,
                  }}
                  className={`flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[1.5px] border font-bold ${PORT_EMPTY} transition-transform hover:scale-125 hover:shadow-[0_0_7px_rgba(0,168,198,0.7)]`}
                  title={`NIC ${n}`}
                >
                  G
                </button>
              ))}
              {Array.from(
                { length: builtInSfpCount ?? 0 },
                (_, i) => i + 1,
              ).map((n) => (
                <button
                  key={`sfp-${n}`}
                  type="button"
                  onClick={() => nav(`nic:${assetId}:sfp:${n}`)}
                  style={{
                    width: PORT_SZ,
                    height: PORT_SZ,
                    fontSize: 6,
                    lineHeight: `${PORT_SZ}px`,
                  }}
                  className={`flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[1.5px] border font-bold ${portTypeClass("SFP_PLUS")} transition-transform hover:scale-125 hover:shadow-[0_0_7px_rgba(0,168,198,0.7)]`}
                  title={`SFP ${n}`}
                >
                  S+
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Outlet groups ────────────────────────────────────────────── */}
        {outletGroups.map((og) => {
          const connSet = new Set(og.connectedOutlets);
          const icon = og.batteryBacked ? "B" : og.surgeProtected ? "~" : null;
          return (
            <div key={og.id}>
              <SectionLabel
                label={og.name ?? og.outletType ?? "Power Outlets"}
                count={og.outletCount}
                connected={connSet.size}
              />
              <div className="flex flex-wrap gap-[3px]">
                {Array.from(
                  { length: og.outletCount },
                  (_, i) => i + 1,
                ).map((n) => {
                  const connected = connSet.has(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => nav(`outlet:${og.id}:${n}`)}
                      style={{ width: OUTLET_SZ, height: OUTLET_SZ }}
                      className={`flex shrink-0 cursor-pointer items-center justify-center rounded-full border transition-transform hover:scale-125 hover:shadow-[0_0_7px_rgba(0,168,198,0.7)] ${
                        connected
                          ? "border-[#52d062]/60 bg-status-green/25"
                          : "border-[#3a424d] bg-[#2a313b]"
                      }`}
                      title={`Outlet ${n}${connected ? " (in use)" : ""}${og.batteryBacked ? " · battery-backed" : og.surgeProtected ? " · surge-protected" : ""}`}
                    >
                      {icon && (
                        <span
                          className={`text-[7px] font-bold leading-none ${
                            connected ? "text-[#0d1117]" : "text-faint"
                          }`}
                        >
                          {icon}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── PSUs ─────────────────────────────────────────────────────── */}
        {psuTotal > 0 && (
          <div>
            <SectionLabel
              label="Power Supplies"
              count={psuTotal}
              connected={connectedPsuSet.size}
            />
            <div className="flex flex-wrap gap-2">
              {psus.length > 0
                ? psus.map((psu, i) => {
                    const connected = connectedPsuSet.has(psu.sortOrder);
                    const retired = psu.state !== "IN_USE";
                    return (
                      <button
                        key={psu.id}
                        type="button"
                        onClick={() => nav(`psu:${assetId}:${i + 1}`)}
                        style={{ width: PSU_W, height: PSU_H }}
                        className={`relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[2px] border transition-colors hover:border-accent ${
                          retired
                            ? "border-border/30 bg-panel-2/40 opacity-50"
                            : connected
                              ? "border-status-green/60 bg-status-green/20"
                              : "border-[#3a424d] bg-[#2a313b]"
                        }`}
                        title={`PSU ${i + 1}${psu.wattage ? ` · ${psu.wattage}W` : ""}${connected ? " — powered" : " — no power"}${retired ? ` (${psu.state})` : ""}`}
                      >
                        <span
                          className={`text-[9px] ${connected ? "text-status-green" : "text-faint"}`}
                        >
                          ⚡
                        </span>
                      </button>
                    );
                  })
                : Array.from({ length: psuTotal }, (_, i) => {
                    const connected = connectedPsuSet.has(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => nav(`psu:${assetId}:${i + 1}`)}
                        style={{ width: PSU_W, height: PSU_H }}
                        className={`flex shrink-0 cursor-pointer items-center justify-center rounded-[2px] border transition-colors hover:border-accent ${
                          connected
                            ? "border-status-green/60 bg-status-green/20"
                            : "border-[#3a424d] bg-[#2a313b]"
                        }`}
                        title={`PSU ${i + 1}${connected ? " — powered" : " — no power"}`}
                      >
                        <span
                          className={`text-[9px] ${connected ? "text-status-green" : "text-faint"}`}
                        >
                          ⚡
                        </span>
                      </button>
                    );
                  })}
            </div>
          </div>
        )}

        {/* ── KVM channels ─────────────────────────────────────────────── */}
        {kvmTotal > 0 && (
          <div>
            <SectionLabel
              label="KVM Channels"
              count={kvmTotal}
              connected={connectedKvmSet.size}
            />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: kvmTotal }, (_, i) => {
                const n = i + 1;
                const connected = connectedKvmSet.has(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => nav(`kvm:${assetId}:${n}`)}
                    style={{ width: KVM_SZ, height: KVM_SZ }}
                    className={`flex shrink-0 cursor-pointer items-center justify-center rounded-[3px] border text-[10px] font-black transition-transform hover:scale-110 hover:shadow-[0_0_7px_rgba(0,168,198,0.6)] ${
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
          </div>
        )}

        {/* ── PCIe NIC/RAID cards ──────────────────────────────────────── */}
        {pciNics.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-text-dim">
                PCIe Cards
              </p>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            {pciNics.map((nic) => {
              const connSet = new Set(nic.connectedPorts);
              const shortLabel = portLabels[nic.portType] ?? DEFAULT_PORT_TYPE_LABELS[nic.portType] ?? "N";
              const typeLabel =
                (PORT_TYPE_LABELS as Record<string, string>)[nic.portType] ??
                nic.portType;
              return (
                <div key={nic.componentId}>
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <span className="text-[9px] font-medium text-faint">
                      Slot {nic.slotSortOrder + 1}
                    </span>
                    <span className="rounded border border-border/60 bg-panel-2 px-1 py-px text-[8px] font-semibold text-text-dim">
                      {nic.slotSize}
                    </span>
                  </div>
                  <SectionLabel
                    label={nic.componentName}
                    count={nic.portCount}
                    connected={connSet.size}
                  />
                  <div className="flex flex-wrap gap-0.75">
                    {Array.from({ length: nic.portCount }, (_, i) => i + 1).map(
                      (n) => {
                        const connected = connSet.has(n);
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => nav(`nic-pcie:${nic.componentId}:${n}`)}
                            style={{
                              width: PORT_SZ,
                              height: PORT_SZ,
                              fontSize: 6,
                              lineHeight: `${PORT_SZ}px`,
                            }}
                            className={`flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[1.5px] border font-bold transition-transform hover:scale-125 hover:shadow-[0_0_7px_rgba(0,168,198,0.7)] ${
                              connected ? portTypeClass(nic.portType) : PORT_EMPTY
                            }`}
                            title={`${nic.componentName} · ${typeLabel} Port ${n}${nic.portSpeed ? ` · ${nic.portSpeed}` : ""}${connected ? " (connected)" : ""}`}
                          >
                            {shortLabel}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
