"use client";

import { useActionState, useMemo, useState } from "react";
import { emptyFormState, type FormState } from "@/lib/form-state";
import { Field, FieldSet, Textarea, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import {
  CONNECTION_TYPES,
  PORT_TYPE_LABELS,
  enumLabel,
  type PORT_TYPES,
} from "@/lib/enums";
import {
  estimateCableLengthFeet,
  DEFAULT_SERVICE_LOOP_INCHES,
  type DeviceSide,
  type EstimateResult,
  type EstimateFailure,
} from "@/lib/cable-length";
import { PortPicker, type UsedPort } from "@/components/ui/port-picker";
import { pciNicPortLabel } from "@/lib/labels";

// ---------------------------------------------------------------------------
// Cable-category and speed presets per connection type
// ---------------------------------------------------------------------------

const CABLE_CATEGORY_PRESETS: Record<string, string[]> = {
  NETWORK: [
    "Cat5e",
    "Cat6",
    "Cat6a",
    "Cat7",
    "Cat8",
    "Fiber LC/LC (SM)",
    "Fiber LC/LC (MM)",
    "SFP+ DAC",
    "QSFP+ DAC",
  ],
  POWER: [
    "C13/C14",
    "C13/C15",
    "C19/C20",
    "NEMA 5-15P/5-15R",
    "NEMA 5-20P/5-20R",
    "L6-20P/L6-20R",
  ],
  KVM: ["HDMI", "DisplayPort", "VGA", "USB-A/B", "USB-C"],
  CONSOLE: ["RJ-45 Serial", "USB-A/mini-B", "USB-C"],
};

const SPEED_PRESETS = [
  "100M",
  "1G",
  "2.5G",
  "5G",
  "10G",
  "25G",
  "40G",
  "100G",
];

// ---------------------------------------------------------------------------
// EndpointAsset type — passed from the server page
// ---------------------------------------------------------------------------

export type EndpointAsset = {
  id: string;
  codename: string;
  category: string;
  rackId: string | null;
  startU: number | null;
  rackUnits: number | null;
  builtInPortsSide: DeviceSide | null;
  builtInEthernetCount: number | null;
  builtInSfpCount: number | null;
  kvmChannelCount: number | null;
  portGroups: {
    id: string;
    name: string | null;
    portCount: number;
    portType: (typeof PORT_TYPES)[number];
    side: DeviceSide;
    usedPorts: UsedPort[];
  }[];
  outletGroups: {
    id: string;
    name: string | null;
    outletCount: number;
    side: DeviceSide;
    usedOutlets: { outletNumber: number; connLabel: string }[];
  }[];
  psus: {
    id: string;
    sortOrder: number;
    side: DeviceSide;
    wattage: number | null;
    portCount: number;
  }[];
  pciNics: {
    componentId: string;
    componentName: string;
    portCount: number;
    slotSortOrder: number;
    usedPorts: UsedPort[];
  }[];
};

// ---------------------------------------------------------------------------
// Form data shape (matches what server actions read from FormData)
// ---------------------------------------------------------------------------

export type ConnectionFormData = {
  id: string;
  type: string;
  aEndAssetId: string;
  aEndLabel: string;
  aEndPortGroupId: string;
  aEndPortNumber: string;
  aEndOutletGroupId: string;
  aEndOutletNumber: string;
  bEndAssetId: string;
  bEndLabel: string;
  bEndPortGroupId: string;
  bEndPortNumber: string;
  bEndOutletGroupId: string;
  bEndOutletNumber: string;
  cableType: string;
  cableCategory: string;
  isPatch: boolean;
  speed: string;
  cableLengthFeet: string;
  estimatedCableLengthFeet: string;
  serviceLoopLengthInches: string;
  notes: string;
};

const EMPTY: ConnectionFormData = {
  id: "",
  type: "NETWORK",
  aEndAssetId: "",
  aEndLabel: "",
  aEndPortGroupId: "",
  aEndPortNumber: "",
  aEndOutletGroupId: "",
  aEndOutletNumber: "",
  bEndAssetId: "",
  bEndLabel: "",
  bEndPortGroupId: "",
  bEndPortNumber: "",
  bEndOutletGroupId: "",
  bEndOutletNumber: "",
  cableType: "",
  cableCategory: "",
  isPatch: false,
  speed: "",
  cableLengthFeet: "",
  estimatedCableLengthFeet: "",
  serviceLoopLengthInches: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Endpoint state (client-side; encoded as strings for simplicity)
//   "free"        – free-form label only
//   "pg:<id>"     – port group
//   "og:<id>"     – outlet group
//   "psu:<id>"    – individual PSU row
//   "builtin-eth" – built-in Ethernet
//   "builtin-sfp" – built-in SFP
//   "channel"     – KVM channel
// ---------------------------------------------------------------------------

type EndpointState = {
  assetId: string;
  kind: string;
  number: string; // port / outlet / channel number
  label: string;  // user override; auto-built when empty
};

function initialEndpointFromData(
  data: ConnectionFormData,
  side: "a" | "b",
): EndpointState {
  const portGroupId =
    side === "a" ? data.aEndPortGroupId : data.bEndPortGroupId;
  const outletGroupId =
    side === "a" ? data.aEndOutletGroupId : data.bEndOutletGroupId;
  let kind = "free";
  let number = "";
  if (portGroupId) {
    kind = `pg:${portGroupId}`;
    number = side === "a" ? data.aEndPortNumber : data.bEndPortNumber;
  } else if (outletGroupId) {
    kind = `og:${outletGroupId}`;
    number = side === "a" ? data.aEndOutletNumber : data.bEndOutletNumber;
  }
  return {
    assetId: side === "a" ? data.aEndAssetId : data.bEndAssetId,
    kind,
    number,
    label: side === "a" ? data.aEndLabel : data.bEndLabel,
  };
}

// Derive the DeviceSide and rack for cable-length estimation.
function deriveSideAndGeometry(
  endpoint: EndpointState,
  assets: EndpointAsset[],
): { asset: EndpointAsset | undefined; side: DeviceSide } {
  const asset = assets.find((a) => a.id === endpoint.assetId);
  if (!asset) return { asset: undefined, side: "LEFT" };

  if (endpoint.kind.startsWith("pg:")) {
    const group = asset.portGroups.find(
      (g) => g.id === endpoint.kind.slice(3),
    );
    return { asset, side: group?.side ?? asset.builtInPortsSide ?? "LEFT" };
  }
  if (endpoint.kind.startsWith("og:")) {
    const group = asset.outletGroups.find(
      (g) => g.id === endpoint.kind.slice(3),
    );
    return { asset, side: group?.side ?? "LEFT" };
  }
  if (endpoint.kind.startsWith("psu:")) {
    const psu = asset.psus.find((p) => p.id === endpoint.kind.slice(4));
    return { asset, side: psu?.side ?? "LEFT" };
  }
  // PCIe cards have no tracked side — fall back to the device's built-in side.
  return { asset, side: asset.builtInPortsSide ?? "LEFT" };
}

// Build the auto-generated label from the endpoint state.
function buildAutoLabel(
  endpoint: EndpointState,
  asset: EndpointAsset | undefined,
): string {
  if (!asset) return endpoint.label;

  if (endpoint.kind === "free" || !endpoint.number) {
    if (endpoint.kind === "free") return endpoint.label;
  }

  if (endpoint.kind.startsWith("pg:")) {
    const group = asset.portGroups.find(
      (g) => g.id === endpoint.kind.slice(3),
    );
    if (!group) return endpoint.label;
    const groupName = group.name ?? PORT_TYPE_LABELS[group.portType];
    return endpoint.number
      ? `${groupName} port ${endpoint.number}`
      : groupName;
  }
  if (endpoint.kind.startsWith("og:")) {
    const group = asset.outletGroups.find(
      (g) => g.id === endpoint.kind.slice(3),
    );
    if (!group) return endpoint.label;
    const groupName = group.name ?? "Outlet";
    return endpoint.number ? `${groupName} ${endpoint.number}` : groupName;
  }
  if (endpoint.kind.startsWith("psu:")) {
    const psuId = endpoint.kind.slice(4);
    const psuIdx = (asset.psus.findIndex((p) => p.id === psuId) ?? 0) + 1;
    return endpoint.number
      ? `PSU ${psuIdx} port ${endpoint.number}`
      : `PSU ${psuIdx}`;
  }
  if (endpoint.kind.startsWith("pci:")) {
    const card = asset.pciNics.find(
      (n) => n.componentId === endpoint.kind.slice(4),
    );
    if (!card) return endpoint.label;
    return endpoint.number
      ? pciNicPortLabel(card.componentName, card.slotSortOrder, Number(endpoint.number))
      : `${card.componentName} [slot ${card.slotSortOrder + 1}]`;
  }
  if (endpoint.kind === "builtin-eth")
    return `Built-in Ethernet port ${endpoint.number}`;
  if (endpoint.kind === "builtin-sfp")
    return `Built-in SFP port ${endpoint.number}`;
  if (endpoint.kind === "channel") return `Channel ${endpoint.number}`;
  return endpoint.label;
}

// ---------------------------------------------------------------------------
// Root form component
// ---------------------------------------------------------------------------

export function ConnectionForm({
  action,
  connection,
  assets,
  submitLabel,
  defaultType = "NETWORK",
  globalServiceLoopInches = DEFAULT_SERVICE_LOOP_INCHES,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  connection?: ConnectionFormData;
  assets: EndpointAsset[];
  submitLabel: string;
  defaultType?: string;
  globalServiceLoopInches?: number;
}) {
  const [state, formAction, isPending] = useActionState(action, emptyFormState);
  const data = connection ?? { ...EMPTY, type: defaultType };
  const err = (name: string) => state.fieldErrors?.[name]?.[0];

  const [type, setType] = useState(data.type);
  const [aEnd, setAEnd] = useState<EndpointState>(
    initialEndpointFromData(data, "a"),
  );
  const [bEnd, setBEnd] = useState<EndpointState>(
    initialEndpointFromData(data, "b"),
  );
  const [bEndIsWall, setBEndIsWall] = useState(
    Boolean(!data.bEndAssetId && data.bEndLabel === "Wall"),
  );
  const [isPatch, setIsPatch] = useState(data.isPatch);
  // Patch-panel cable side. The readers infer front/rear from which end the
  // patch panel sits on (FRONT ⇒ PP is bEnd, REAR ⇒ PP is aEnd); make it
  // explicit here so the action can normalise the ends before saving.
  const [patchPanelSide, setPatchPanelSide] = useState<"FRONT" | "REAR">(() => {
    const a = initialEndpointFromData(data, "a");
    const aAsset = assets.find((x) => x.id === a.assetId);
    return aAsset?.category === "PATCH_PANEL" && a.kind.startsWith("pg:")
      ? "REAR"
      : "FRONT";
  });
  const [actualLength, setActualLength] = useState(data.cableLengthFeet);
  const [serviceLoopOverride, setServiceLoopOverride] = useState(
    data.serviceLoopLengthInches,
  );
  const [cableCategory, setCableCategory] = useState(
    data.cableCategory || (data.type === "CONSOLE" ? "RJ-45 Serial" : ""),
  );
  const [speed, setSpeed] = useState(data.speed);

  // When type changes, update cable-category default for CONSOLE; reset wall flag if leaving POWER
  function handleTypeChange(t: string) {
    setType(t);
    if (t !== "POWER" && bEndIsWall) {
      setBEndIsWall(false);
      setBEnd({ assetId: "", kind: "free", number: "", label: "" });
    }
    if (t === "CONSOLE" && !cableCategory) {
      setCableCategory("RJ-45 Serial");
    }
  }

  const aDerived = useMemo(
    () => deriveSideAndGeometry(aEnd, assets),
    [aEnd, assets],
  );
  const bDerived = useMemo(
    () => deriveSideAndGeometry(bEnd, assets),
    [bEnd, assets],
  );

  const aAutoLabel = useMemo(
    () => buildAutoLabel(aEnd, aDerived.asset),
    [aEnd, aDerived.asset],
  );
  const bAutoLabel = useMemo(
    () => buildAutoLabel(bEnd, bDerived.asset),
    [bEnd, bDerived.asset],
  );

  const showLength = type === "NETWORK" || type === "POWER";

  // A patch-panel port endpoint needs an explicit front/rear designation.
  const aIsPpPort =
    aDerived.asset?.category === "PATCH_PANEL" && aEnd.kind.startsWith("pg:");
  const bIsPpPort =
    bDerived.asset?.category === "PATCH_PANEL" && bEnd.kind.startsWith("pg:");
  const showPatchSide = type === "NETWORK" && aIsPpPort !== bIsPpPort;

  const estimate = useMemo<EstimateResult | EstimateFailure | null>(() => {
    if (!showLength) return null;
    if (!aDerived.asset || !bDerived.asset) return null;
    const loopInches = serviceLoopOverride
      ? parseInt(serviceLoopOverride, 10)
      : globalServiceLoopInches;
    return estimateCableLengthFeet(
      {
        startU: aDerived.asset.startU,
        rackUnits: aDerived.asset.rackUnits,
        side: aDerived.side,
        rackId: aDerived.asset.rackId,
      },
      {
        startU: bDerived.asset.startU,
        rackUnits: bDerived.asset.rackUnits,
        side: bDerived.side,
        rackId: bDerived.asset.rackId,
      },
      {
        isPatch,
        kind: type === "POWER" ? "power" : "ethernet",
        serviceLoopInches: loopInches,
      },
    );
  }, [aDerived, bDerived, type, isPatch, showLength, serviceLoopOverride, globalServiceLoopInches]);

  function endpointHiddenFields(endpoint: EndpointState, side: "a" | "b") {
    const prefix = side === "a" ? "aEnd" : "bEnd";
    let portGroupId = "";
    let portNumber = "";
    let outletGroupId = "";
    let outletNumber = "";
    if (endpoint.kind.startsWith("pg:")) {
      portGroupId = endpoint.kind.slice(3);
      portNumber = endpoint.number;
    } else if (endpoint.kind.startsWith("og:")) {
      outletGroupId = endpoint.kind.slice(3);
      outletNumber = endpoint.number;
    }
    // PSU endpoints: label carries the info; no separate DB ref yet
    return (
      <>
        <input type="hidden" name={`${prefix}PortGroupId`} value={portGroupId} />
        <input type="hidden" name={`${prefix}PortNumber`} value={portNumber} />
        <input
          type="hidden"
          name={`${prefix}OutletGroupId`}
          value={outletGroupId}
        />
        <input
          type="hidden"
          name={`${prefix}OutletNumber`}
          value={outletNumber}
        />
      </>
    );
  }

  const categoryPresets = CABLE_CATEGORY_PRESETS[type] ?? [];

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5">
      {state.error && (
        <p
          className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400"
          role="alert"
        >
          {state.error}
        </p>
      )}

      {/* ── Step 1: Connection type pill picker ── */}
      <FieldSet legend="Connection type">
        <div className="flex w-fit overflow-hidden rounded-lg border border-border bg-panel-2">
          {CONNECTION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={
                t === type
                  ? "border-r border-border/50 bg-border/60 px-4 py-1.5 text-[12.5px] font-semibold text-accent transition-colors last:border-r-0"
                  : "border-r border-border/50 px-4 py-1.5 text-[12.5px] font-semibold text-text-dim transition-colors last:border-r-0 hover:text-accent"
              }
            >
              {enumLabel(t)}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
      </FieldSet>

      {/* ── Step 2: Endpoints ── */}
      <EndpointFieldSet
        legend="A end"
        endpoint={aEnd}
        onChange={setAEnd}
        autoLabel={aAutoLabel}
        assets={assets}
        type={type}
        nameAsset="aEndAssetId"
        nameLabel="aEndLabel"
        requiredAsset
        requiredLabel
        err={err}
        hiddenFields={endpointHiddenFields(aEnd, "a")}
      />

      {type === "POWER" && bEndIsWall ? (
        <FieldSet legend="B end">
          <WallOutletCheckbox
            checked={true}
            onChange={(checked) => {
              setBEndIsWall(checked);
              setBEnd({ assetId: "", kind: "free", number: "", label: "" });
            }}
          />
          <input type="hidden" name="bEndAssetId" value="" />
          <input type="hidden" name="bEndLabel" value="Wall" />
          <input type="hidden" name="bEndPortGroupId" value="" />
          <input type="hidden" name="bEndPortNumber" value="" />
          <input type="hidden" name="bEndOutletGroupId" value="" />
          <input type="hidden" name="bEndOutletNumber" value="" />
        </FieldSet>
      ) : (
        <EndpointFieldSet
          legend="B end"
          endpoint={bEnd}
          onChange={setBEnd}
          autoLabel={bAutoLabel}
          assets={assets}
          type={type}
          nameAsset="bEndAssetId"
          nameLabel="bEndLabel"
          err={err}
          hiddenFields={endpointHiddenFields(bEnd, "b")}
          extraTop={
            type === "POWER" ? (
              <WallOutletCheckbox
                checked={false}
                onChange={(checked) => {
                  setBEndIsWall(checked);
                  if (checked)
                    setBEnd({ assetId: "", kind: "free", number: "", label: "Wall" });
                }}
              />
            ) : undefined
          }
        />
      )}

      {/* ── Patch-panel cable side ── */}
      <input type="hidden" name="patchPanelSide" value={patchPanelSide} />
      {showPatchSide && (
        <FieldSet legend="Patch panel side">
          <Field
            label="This cable is the…"
            htmlFor="patchPanelSide-select"
            hint="Front = patch side (cable from a switch). Rear = permanent side (cable to the end device)."
          >
            <select
              id="patchPanelSide-select"
              value={patchPanelSide}
              onChange={(e) =>
                setPatchPanelSide(e.target.value === "REAR" ? "REAR" : "FRONT")
              }
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            >
              <option value="FRONT">Front — patch side</option>
              <option value="REAR">Rear — permanent side</option>
            </select>
          </Field>
        </FieldSet>
      )}

      {/* ── Cable section (type-conditional fields) ── */}
      <FieldSet legend="Cable">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cable category" htmlFor="cableCategory">
            <TextInput
              id="cableCategory"
              name="cableCategory"
              placeholder={categoryPresets[0] ?? "e.g. Cat6a"}
              value={cableCategory}
              onChange={(e) => setCableCategory(e.target.value)}
              suggestions={categoryPresets}
            />
          </Field>

          <Field
            label="Cable type"
            htmlFor="cableType"
            hint="Strand colour, brand, etc."
          >
            <TextInput
              id="cableType"
              name="cableType"
              defaultValue={data.cableType}
            />
          </Field>

          {type === "NETWORK" && (
            <Field label="Speed" htmlFor="speed">
              <TextInput
                id="speed"
                name="speed"
                placeholder="e.g. 1G"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                suggestions={SPEED_PRESETS}
              />
            </Field>
          )}
          {type !== "NETWORK" && (
            <input type="hidden" name="speed" value="" />
          )}

          {showLength && (
            <Field
              label="Actual length (ft)"
              htmlFor="cableLengthFeet"
              hint="Leave blank to accept the estimate."
            >
              <TextInput
                id="cableLengthFeet"
                name="cableLengthFeet"
                type="number"
                min={0}
                value={actualLength}
                onChange={(e) => setActualLength(e.target.value)}
              />
            </Field>
          )}
          {!showLength && (
            <input type="hidden" name="cableLengthFeet" value="" />
          )}
        </div>

        {type === "NETWORK" && (
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="checkbox"
              name="isPatch"
              checked={isPatch}
              onChange={(e) => setIsPatch(e.target.checked)}
              className="mt-0.5"
            />
            <span className="flex flex-col">
              <span className="font-medium">Patch cable</span>
              <span className="text-[11px] text-text-dim">
                Skip the service-loop slack in the length estimate.
              </span>
            </span>
          </label>
        )}

        <input
          type="hidden"
          name="estimatedCableLengthFeet"
          value={estimate && "feet" in estimate ? estimate.feet : ""}
        />
        <input
          type="hidden"
          name="serviceLoopLengthInches"
          value={serviceLoopOverride}
        />

        {estimate && "feet" in estimate && (
          <Panel className="bg-panel-2 px-4 py-3 text-[12.5px]">
            <div className="flex items-baseline justify-between">
              <span className="font-bold text-accent">
                Estimated: ~{estimate.feet} ft
              </span>
              <span className="text-[11px] text-text-dim">
                A: {aDerived.side.toLowerCase()} side · B:{" "}
                {bDerived.side.toLowerCase()} side
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-dim">
              {estimate.breakdown}
            </p>
          </Panel>
        )}
        {estimate && "reason" in estimate && (
          <Panel className="border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[12.5px]">
            <p className="text-[11.5px] text-amber-400/80">
              {estimate.reason}
            </p>
          </Panel>
        )}
        {!estimate && showLength && (aEnd.assetId || bEnd.assetId) && (
          <p className="text-[11.5px] text-faint">
            Estimate appears once both ends are picked and both assets have a
            rack position.
          </p>
        )}

        {showLength && (
          <Field
            label="Service loop override (inches)"
            htmlFor="serviceLoopOverride"
            hint={`Global default: ${globalServiceLoopInches}". Leave blank to use it. Set to 0 for patch cables.`}
          >
            <TextInput
              id="serviceLoopOverride"
              type="number"
              min={0}
              placeholder={`${globalServiceLoopInches} (global)`}
              value={serviceLoopOverride}
              onChange={(e) => setServiceLoopOverride(e.target.value)}
            />
          </Field>
        )}
      </FieldSet>

      <FieldSet legend="Notes">
        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" name="notes" defaultValue={data.notes} />
        </Field>
      </FieldSet>

      <div>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// WallOutletCheckbox — B end shortcut for direct wall plug (POWER only)
// ---------------------------------------------------------------------------

function WallOutletCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-start gap-2.5 text-sm text-text">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 shrink-0"
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">Connected to wall outlet</span>
        <span className="text-[11px] text-text-dim">
          PSU plugs directly into the wall — skip the B-end asset picker.
        </span>
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// EndpointFieldSet — one side of a connection
// ---------------------------------------------------------------------------

function EndpointFieldSet({
  legend,
  endpoint,
  onChange,
  autoLabel,
  assets,
  type,
  nameAsset,
  nameLabel,
  requiredAsset,
  requiredLabel,
  err,
  hiddenFields,
  extraTop,
}: {
  legend: string;
  endpoint: EndpointState;
  onChange: (next: EndpointState) => void;
  autoLabel: string;
  assets: EndpointAsset[];
  type: string;
  nameAsset: string;
  nameLabel: string;
  requiredAsset?: boolean;
  requiredLabel?: boolean;
  err: (name: string) => string | undefined;
  hiddenFields: React.ReactNode;
  extraTop?: React.ReactNode;
}) {
  const asset = assets.find((a) => a.id === endpoint.assetId);

  // Build endpoint options for the chosen connection type
  const endpointOptions = useMemo<{ value: string; label: string }[]>(() => {
    if (!asset) return [{ value: "free", label: "— Free label —" }];

    const opts: { value: string; label: string }[] = [
      { value: "free", label: "— Free label —" },
    ];

    if (type === "NETWORK") {
      for (const g of asset.portGroups) {
        opts.push({
          value: `pg:${g.id}`,
          label: `${g.name ?? PORT_TYPE_LABELS[g.portType]} (${g.portCount} × ${PORT_TYPE_LABELS[g.portType]}, ${g.side.toLowerCase()})`,
        });
      }
      if ((asset.builtInEthernetCount ?? 0) > 0) {
        opts.push({
          value: "builtin-eth",
          label: `Built-in Ethernet (${asset.builtInEthernetCount} ports)`,
        });
      }
      if ((asset.builtInSfpCount ?? 0) > 0) {
        opts.push({
          value: "builtin-sfp",
          label: `Built-in SFP (${asset.builtInSfpCount} ports)`,
        });
      }
      for (const nic of asset.pciNics) {
        opts.push({
          value: `pci:${nic.componentId}`,
          label: `${nic.componentName} [slot ${nic.slotSortOrder + 1}] (${nic.portCount} ports)`,
        });
      }
    } else if (type === "POWER") {
      for (const g of asset.outletGroups) {
        opts.push({
          value: `og:${g.id}`,
          label: `${g.name ?? "Outlets"} (${g.outletCount} × ${g.side.toLowerCase()})`,
        });
      }
      for (let i = 0; i < asset.psus.length; i++) {
        const psu = asset.psus[i];
        const wattLabel = psu.wattage ? ` ${psu.wattage}W` : "";
        opts.push({
          value: `psu:${psu.id}`,
          label: `PSU ${i + 1}${wattLabel} (${psu.portCount} port${psu.portCount !== 1 ? "s" : ""})`,
        });
      }
    } else if (type === "KVM" && (asset.kvmChannelCount ?? 0) > 0) {
      opts.push({
        value: "channel",
        label: `KVM channel (${asset.kvmChannelCount} channels)`,
      });
    }

    return opts;
  }, [asset, type]);

  // Resolve port picker config from the current kind
  const pickerConfig = useMemo<{
    portCount: number;
    usedPorts: UsedPort[];
    portLabel: string;
  } | null>(() => {
    if (!asset) return null;

    if (endpoint.kind.startsWith("pg:")) {
      const group = asset.portGroups.find(
        (g) => g.id === endpoint.kind.slice(3),
      );
      if (!group) return null;
      return {
        portCount: group.portCount,
        usedPorts: group.usedPorts,
        portLabel: "port",
      };
    }
    if (endpoint.kind.startsWith("og:")) {
      const group = asset.outletGroups.find(
        (g) => g.id === endpoint.kind.slice(3),
      );
      if (!group) return null;
      return {
        portCount: group.outletCount,
        usedPorts: group.usedOutlets.map((u) => ({
          portNumber: u.outletNumber,
          connLabel: u.connLabel,
        })),
        portLabel: "outlet",
      };
    }
    if (endpoint.kind.startsWith("psu:")) {
      const psu = asset.psus.find((p) => p.id === endpoint.kind.slice(4));
      if (!psu) return null;
      return { portCount: psu.portCount, usedPorts: [], portLabel: "port" };
    }
    if (endpoint.kind.startsWith("pci:")) {
      const card = asset.pciNics.find(
        (n) => n.componentId === endpoint.kind.slice(4),
      );
      if (!card) return null;
      return {
        portCount: card.portCount,
        usedPorts: card.usedPorts,
        portLabel: "port",
      };
    }
    if (
      endpoint.kind === "builtin-eth" ||
      endpoint.kind === "builtin-sfp" ||
      endpoint.kind === "channel"
    ) {
      const count =
        endpoint.kind === "builtin-eth"
          ? (asset.builtInEthernetCount ?? 0)
          : endpoint.kind === "builtin-sfp"
            ? (asset.builtInSfpCount ?? 0)
            : (asset.kvmChannelCount ?? 0);
      return {
        portCount: count,
        usedPorts: [],
        portLabel: endpoint.kind === "channel" ? "channel" : "port",
      };
    }
    return null;
  }, [asset, endpoint.kind]);

  const selectedNumber = endpoint.number ? parseInt(endpoint.number, 10) : null;

  // Displayed label: auto-built unless the user has typed a custom value.
  const displayedLabel =
    endpoint.label && endpoint.label !== autoLabel && endpoint.label.length > 0
      ? endpoint.label
      : autoLabel;

  return (
    <FieldSet legend={legend}>
      {extraTop}
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Asset"
          htmlFor={nameAsset}
          required={requiredAsset}
          error={err(nameAsset)}
        >
          <select
            id={nameAsset}
            name={nameAsset}
            value={endpoint.assetId}
            onChange={(e) =>
              onChange({ ...endpoint, assetId: e.target.value, kind: "free", number: "" })
            }
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">— Pick an asset —</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.codename} ({enumLabel(a.category)})
              </option>
            ))}
          </select>
        </Field>

        {endpointOptions.length > 1 && (
          <Field
            label="Endpoint"
            htmlFor={`${nameAsset}-kind`}
            hint="Pick the port group / outlet group for an accurate cable estimate."
          >
            <select
              id={`${nameAsset}-kind`}
              value={endpoint.kind}
              onChange={(e) =>
                onChange({ ...endpoint, kind: e.target.value, number: "" })
              }
              disabled={!asset}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent disabled:opacity-50"
            >
              {endpointOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {/* Visual port picker — replaces the old number input */}
      {pickerConfig && pickerConfig.portCount > 0 && (
        <Field
          label={`Pick ${pickerConfig.portLabel}`}
          hint={
            pickerConfig.usedPorts.length > 0
              ? "Dimmed squares are already in use."
              : undefined
          }
        >
          <PortPicker
            portCount={pickerConfig.portCount}
            selected={selectedNumber}
            onChange={(n) =>
              onChange({ ...endpoint, number: n != null ? String(n) : "" })
            }
            usedPorts={pickerConfig.usedPorts}
            label={pickerConfig.portLabel}
          />
        </Field>
      )}

      <Field
        label="Label"
        htmlFor={nameLabel}
        required={requiredLabel}
        error={err(nameLabel)}
        hint="Auto-filled from your endpoint choice. Edit to override."
      >
        <TextInput
          id={nameLabel}
          name={nameLabel}
          value={displayedLabel}
          onChange={(e) => onChange({ ...endpoint, label: e.target.value })}
        />
      </Field>

      {hiddenFields}
    </FieldSet>
  );
}
