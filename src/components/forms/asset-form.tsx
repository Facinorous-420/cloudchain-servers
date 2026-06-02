"use client";

import { useState } from "react";
import { emptyFormState, mergedDefaults, type FormState } from "@/lib/form-state";
import { usePreservedForm } from "@/lib/use-preserved-form";
import type { BayZoneInput } from "@/lib/schemas/asset";
import type { PortGroupInput } from "@/lib/schemas/port-group";
import type { OutletGroupInput } from "@/lib/schemas/outlet-group";
import type {
  InlineCpuInput,
  InlineRamInput,
  InlinePciSlotInput,
  InlinePsuInput,
  PciNewComponentDraft,
  FaceplateAnnotationInput,
} from "@/lib/schemas/inline-components";
import { FaceplateDesigner, type BuiltInBlock } from "./faceplate-designer";
import type { Suggestions } from "@/lib/suggestions";
import {
  ASSET_CATEGORIES,
  DRIVE_SIZES,
  FACE_SIDES,
  FORM_FACTORS,
  LIFECYCLE_STATES,
  PORT_TYPES,
  PORT_TYPE_LABELS,
  enumLabel,
} from "@/lib/enums";
import type { CascadeConfirmRequired } from "@/lib/form-state";
import {
  CheckboxField,
  Field,
  FieldSet,
  Select,
  Textarea,
  TextInput,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { MultiImageUpload, type ImageEntry } from "@/components/ui/multi-image-upload";
import {
  PCI_SIZES,
  compatibleCardSizes,
  cardFitsSlot,
  allowedCardTypes,
} from "@/lib/pci-sizes";

export type AssetFormData = {
  id: string;
  codename: string;
  name: string;
  category: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  condition: string;
  purchaseDate: string;
  purchasePrice: string;
  purchasePriceBeforeShip: string;
  purchasedFrom: string;
  purchasedFromUrl: string;
  state: string;
  soldDate: string;
  soldPrice: string;
  notes: string;
  imageGallery: string; // JSON: ImageEntry[]
  rackRenderFrontPath: string;
  rackRenderRearPath: string;
  // Faceplate designer (issue 5)
  annotations: FaceplateAnnotationInput[];
  builtInGridRow: string;
  builtInGridCol: string;
  builtInFace: string;
  formFactor: string;
  faceOrientation: string;
  rackFace: string;
  heightInches: string;
  widthInches: string;
  depthInches: string;
  rackUnits: string;
  requiresSupport: boolean;
  storageId: string;
  builtInEthernetCount: string;
  builtInSfpCount: string;
  builtInPortsSide: string;
  surgeProtectedEthernetCount: string;
  kvmChannelCount: string;
  psuCount: string;
  chassis: string;
  mainboard: string;
  raidController: string;
  operatingSystem: string;
  biosVersion: string;
  extras: string;
  maxPowerDrawWatts: string;
  idlePowerWatts: string;
  warrantyEndDate: string;
  firmwareVersion: string;
  managementType: string;
  poeBudgetWatts: string;
  throughputGbps: string;
  maxConcurrentConnections: string;
  vaRating: string;
  wattsRating: string;
  estimatedRuntimeMinutes: string;
  amperage: string;
  pduType: string;
  supportedProtocols: string;
  wifiStandard: string;
  maxThroughputMbps: string;
  bandSupport: string;
  bandsLegacyText: string;
  poeInputType: string;
  placement: string;
  maxLoadLbs: string;
  ventilated: boolean;
  drawerType: string;
  pulloutDepthInches: string;
  purpose: string;
  patchPanelType: string;
  bayZones: BayZoneInput[];
  portGroups: PortGroupInput[];
  outletGroups: OutletGroupInput[];
  cpus: InlineCpuInput[];
  rams: InlineRamInput[];
  pciSlots: InlinePciSlotInput[];
  psus: InlinePsuInput[];
};

type StringKey = {
  [K in keyof AssetFormData]: AssetFormData[K] extends string ? K : never;
}[keyof AssetFormData];

const EMPTY: AssetFormData = {
  id: "",
  codename: "",
  name: "",
  category: "",
  manufacturer: "",
  modelNumber: "",
  serialNumber: "",
  condition: "",
  purchaseDate: "",
  purchasePrice: "",
  purchasePriceBeforeShip: "",
  purchasedFrom: "",
  purchasedFromUrl: "",
  state: "IN_USE",
  soldDate: "",
  soldPrice: "",
  notes: "",
  imageGallery: "[]",
  rackRenderFrontPath: "",
  rackRenderRearPath: "",
  annotations: [],
  builtInGridRow: "",
  builtInGridCol: "",
  builtInFace: "",
  formFactor: "RACK",
  faceOrientation: "FRONT_FRONT",
  rackFace: "",
  heightInches: "",
  widthInches: "",
  depthInches: "",
  rackUnits: "",
  requiresSupport: false,
  storageId: "",
  builtInEthernetCount: "",
  builtInSfpCount: "",
  builtInPortsSide: "",
  surgeProtectedEthernetCount: "",
  kvmChannelCount: "",
  psuCount: "",
  chassis: "",
  mainboard: "",
  raidController: "",
  operatingSystem: "",
  biosVersion: "",
  extras: "",
  maxPowerDrawWatts: "",
  idlePowerWatts: "",
  warrantyEndDate: "",
  firmwareVersion: "",
  managementType: "",
  poeBudgetWatts: "",
  throughputGbps: "",
  maxConcurrentConnections: "",
  vaRating: "",
  wattsRating: "",
  estimatedRuntimeMinutes: "",
  amperage: "",
  pduType: "",
  supportedProtocols: "",
  wifiStandard: "",
  maxThroughputMbps: "",
  bandSupport: "",
  bandsLegacyText: "",
  poeInputType: "",
  placement: "",
  maxLoadLbs: "",
  ventilated: false,
  drawerType: "",
  pulloutDepthInches: "",
  purpose: "",
  patchPanelType: "",
  bayZones: [],
  portGroups: [],
  outletGroups: [],
  cpus: [],
  rams: [],
  pciSlots: [],
  psus: [],
};

export type PciInventoryItem = {
  id: string;
  name: string;
  type: string;
  portCount?: number | null;
  portType?: string | null;
  portSpeed?: string | null;
  cardSize?: string | null;
};

export function AssetForm({
  action,
  asset,
  storages,
  suggestions,
  submitLabel,
  pciInventory = [],
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  asset?: AssetFormData;
  storages: { id: string; name: string }[];
  suggestions: Suggestions;
  submitLabel: string;
  pciInventory?: PciInventoryItem[];
}) {
  const { state, formAction, isPending, submittedValues } = usePreservedForm(
    action,
    emptyFormState,
  );
  const data = mergedDefaults(asset ?? EMPTY, submittedValues);
  const [lifecycleState, setLifecycleState] = useState(data.state);
  const showSoldFields = lifecycleState === "SOLD" || lifecycleState === "JUNKED";
  const [category, setCategory] = useState(data.category);
  const [bayZones, setBayZones] = useState<BayZoneInput[]>(data.bayZones);
  const [portGroups, setPortGroups] = useState<PortGroupInput[]>(data.portGroups);
  const [outletGroups, setOutletGroups] = useState<OutletGroupInput[]>(
    data.outletGroups,
  );
  const [cpus, setCpus] = useState<InlineCpuInput[]>(data.cpus);
  const [rams, setRams] = useState<InlineRamInput[]>(data.rams);
  const [pciSlots, setPciSlots] = useState<InlinePciSlotInput[]>(data.pciSlots);
  const [psus, setPsus] = useState<InlinePsuInput[]>(data.psus);
  const [annotations, setAnnotations] = useState<FaceplateAnnotationInput[]>(
    data.annotations,
  );
  const [builtIn, setBuiltIn] = useState<BuiltInBlock>({
    ethernet: parseInt(data.builtInEthernetCount || "0", 10) || 0,
    sfp: parseInt(data.builtInSfpCount || "0", 10) || 0,
    gridRow: data.builtInGridRow ? parseInt(data.builtInGridRow, 10) : null,
    gridCol: data.builtInGridCol ? parseInt(data.builtInGridCol, 10) : null,
    face: data.builtInFace || null,
  });
  const [requiresSupport, setRequiresSupport] = useState(data.requiresSupport);
  const [formFactor, setFormFactor] = useState(data.formFactor);
  const [patchPanelType, setPatchPanelType] = useState(data.patchPanelType || "KEYSTONE");
  const [heightInches, setHeightInches] = useState(data.heightInches);
  // AP band support — stored as comma-separated "2.4,5,6"
  const [bands, setBands] = useState<string[]>(
    data.bandSupport ? data.bandSupport.split(",").filter(Boolean) : [],
  );
  // For non-RACK form factors, rackUnits is derived from heightInches
  // (1U = 1.75"). This is the value submitted in the hidden input below.
  const derivedRackUnitsFromHeight = (() => {
    const h = parseFloat(heightInches);
    if (!Number.isFinite(h) || h <= 0) return "";
    return String(Math.max(1, Math.ceil(h / 1.75)));
  })();

  const err = (name: string) => state.fieldErrors?.[name]?.[0];

  const isServer = category === "SERVER";
  const isSwitch = category === "SWITCH";
  const isPatchPanel = category === "PATCH_PANEL";
  const isGwOrFw = category === "GATEWAY" || category === "FIREWALL";
  const isUps = category === "UPS";
  const isPdu = category === "PDU";
  const isKvm = category === "KVM";
  const isAp = category === "ACCESS_POINT";
  const isNuc = category === "NUC";
  const isSbc = category === "SBC";
  const isShelf = category === "SHELF";
  const isDrawer = category === "DRAWER";
  const isBlank = category === "BLANK_PANEL";
  const isServerLike = isServer || isNuc || isSbc;
  const hasPortGroups = isSwitch || isPatchPanel || isGwOrFw || isAp;
  const hasOutletGroups = isUps || isPdu;
  const hasPowerStats =
    isServerLike || isSwitch || isGwOrFw || isAp || isUps;
  const hasFirmware = isSwitch || isGwOrFw || isUps || isAp;

  // Plain render helper (not a nested component) so re-renders don't remount
  // and clear the uncontrolled inputs.
  const field = (
    name: StringKey,
    label: string,
    type: "text" | "number" | "date" = "text",
    options: { hint?: string; required?: boolean } = {},
  ) => (
    <Field
      label={label}
      htmlFor={name}
      hint={options.hint}
      required={options.required}
      error={err(name)}
    >
      <TextInput
        id={name}
        name={name}
        type={type}
        required={options.required}
        step={type === "number" ? "any" : undefined}
        defaultValue={data[name]}
      />
    </Field>
  );

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

      <FieldSet legend="Category">
        <Field
          label="Category"
          htmlFor="category"
          required
          hint="Pick the kind of asset first — the rest of the form adapts to the category you choose."
          error={err("category")}
        >
          <Select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            <option value="">— Pick a category —</option>
            {ASSET_CATEGORIES.filter((c) => c !== "GATEWAY" && c !== "FIREWALL").map((c) => (
              <option key={c} value={c}>
                {enumLabel(c)}
              </option>
            ))}
            <optgroup label="Combined appliances">
              <option value="GATEWAY">Gateway (recommended for combined units)</option>
              <option value="FIREWALL">Firewall (pure firewall only)</option>
            </optgroup>
          </Select>
        </Field>
        {(category === "GATEWAY" || category === "FIREWALL") && (
          <p className="text-[11.5px] text-text-dim">
            Most appliances do both routing and firewalling — <span className="font-bold text-text">Gateway</span> is the safer choice for combined units like UDM Pro, pfSense, OPNsense.
          </p>
        )}
        {category === "" && (
          <p className="text-[11.5px] text-faint">
            Pick a category above to continue.
          </p>
        )}
      </FieldSet>

      {category !== "" && (
        <>
          <FieldSet legend="Identity">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Codename"
                htmlFor="codename"
                required
                hint="Stable short ID used in listings and the rack diagram."
                error={err("codename")}
              >
                <TextInput
                  id="codename"
                  name="codename"
                  required
                  defaultValue={data.codename}
                />
              </Field>
              <Field label="Name" htmlFor="name" required error={err("name")}>
                <TextInput
                  id="name"
                  name="name"
                  required
                  defaultValue={data.name}
                />
              </Field>
              <Field label="Manufacturer" htmlFor="manufacturer">
                <TextInput
                  id="manufacturer"
                  name="manufacturer"
                  defaultValue={data.manufacturer}
                  suggestions={suggestions.manufacturers}
                />
              </Field>
              {field("modelNumber", "Model number")}
              {field("serialNumber", "Serial number")}
            </div>
          </FieldSet>

          <FieldSet legend="Acquisition & disposal">
            <div className="grid grid-cols-2 gap-4">
              {field("purchaseDate", "Purchase date", "date")}
              {field("warrantyEndDate", "Warranty end date", "date", {
                hint: "When the warranty expires. Used for refresh-planning stats.",
              })}
              <Field label="Purchased from" htmlFor="purchasedFrom">
                <TextInput
                  id="purchasedFrom"
                  name="purchasedFrom"
                  defaultValue={data.purchasedFrom}
                  suggestions={suggestions.purchasedFroms}
                />
              </Field>
              <Field
                label="Purchased from (URL)"
                htmlFor="purchasedFromUrl"
                hint="Optional — link to the listing, site, or invoice."
              >
                <TextInput
                  id="purchasedFromUrl"
                  name="purchasedFromUrl"
                  type="url"
                  defaultValue={data.purchasedFromUrl}
                />
              </Field>
              {field("purchasePrice", "Purchase price", "number")}
              {field("purchasePriceBeforeShip", "Price before shipping", "number")}
              <Field label="Condition" htmlFor="condition">
                <TextInput
                  id="condition"
                  name="condition"
                  defaultValue={data.condition}
                  suggestions={suggestions.conditions}
                />
              </Field>
              {showSoldFields && (
                <>
                  {field(
                    "soldDate",
                    lifecycleState === "JUNKED" ? "Disposal date" : "Sold date",
                    "date",
                    { required: true },
                  )}
                  {lifecycleState === "SOLD" &&
                    field("soldPrice", "Sold price", "number", { required: true })}
                </>
              )}
            </div>
            <Field label="State" htmlFor="state" error={err("state")}>
              <Select
                id="state"
                name="state"
                value={lifecycleState}
                onChange={(e) => setLifecycleState(e.target.value)}
              >
                {LIFECYCLE_STATES.filter((s) => s !== "USED_UP").map((s) => (
                  <option key={s} value={s}>
                    {enumLabel(s)}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldSet>

          <FieldSet legend="Physical form">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Form factor"
                htmlFor="formFactor"
                required
                hint="Rack gear mounts on rails. Tower / shelf-sitting gear needs to rest on something."
              >
                <Select
                  id="formFactor"
                  name="formFactor"
                  value={formFactor}
                  onChange={(e) => setFormFactor(e.target.value)}
                >
                  {FORM_FACTORS.map((f) => (
                    <option key={f} value={f}>
                      {enumLabel(f)}
                    </option>
                  ))}
                </Select>
              </Field>
              {isPatchPanel && (
                <Field
                  label="Patch panel type"
                  htmlFor="patchPanelType"
                  hint="Keystone: punch-down rear (occupies both rack faces). Coupler: RJ45 on both sides (thin, can share a U with a panel on the opposite face)."
                >
                  <Select
                    id="patchPanelType"
                    name="patchPanelType"
                    value={patchPanelType}
                    onChange={(e) => setPatchPanelType(e.target.value)}
                  >
                    <option value="KEYSTONE">Keystone / permanent rear</option>
                    <option value="COUPLER">Coupler / ethernet both sides</option>
                  </Select>
                </Field>
              )}
              {((isPatchPanel && patchPanelType === "COUPLER") || isShelf || isBlank) ? (
                <Field
                  label="Rack face"
                  htmlFor="rackFace"
                  hint="Which face of the rack this item mounts from. Two items can share the same U if they're on opposite faces."
                >
                  <Select
                    id="rackFace"
                    name="rackFace"
                    defaultValue={data.rackFace || "FRONT"}
                  >
                    <option value="FRONT">Front</option>
                    <option value="REAR">Rear</option>
                  </Select>
                </Field>
              ) : (formFactor === "RACK" || formFactor === "TOWER") && !(isPatchPanel && patchPanelType === "KEYSTONE") && (
                <Field
                  label="Mounting direction"
                  htmlFor="faceOrientation"
                  hint="Reversed: device is installed backwards so its physical front faces the rack rear."
                >
                  <Select
                    id="faceOrientation"
                    name="faceOrientation"
                    defaultValue={data.faceOrientation || "FRONT_FRONT"}
                  >
                    <option value="FRONT_FRONT">Normal (front faces rack front)</option>
                    <option value="FRONT_REAR">Reversed (front faces rack rear)</option>
                  </Select>
                </Field>
              )}
              {formFactor === "RACK" ? (
                <>
                  {field("rackUnits", "Rack units (U)", "number", {
                    required: true,
                    hint: "How many U this asset occupies.",
                  })}
                  {/* heightInches kept but not shown for RACK — submit the
                      stored value so it round-trips on edit. */}
                  <input
                    type="hidden"
                    name="heightInches"
                    value={data.heightInches}
                  />
                </>
              ) : (
                <>
                  <Field
                    label="Height (in)"
                    htmlFor="heightInches"
                    required
                    hint="Rack units are computed as ceil(height ÷ 1.75)."
                  >
                    <TextInput
                      id="heightInches"
                      name="heightInches"
                      type="number"
                      step="any"
                      value={heightInches}
                      onChange={(e) => setHeightInches(e.target.value)}
                    />
                  </Field>
                  {/* rackUnits is derived for non-RACK gear and submitted
                      via this hidden input so the server still gets it. */}
                  <input
                    type="hidden"
                    name="rackUnits"
                    value={derivedRackUnitsFromHeight}
                  />
                  {derivedRackUnitsFromHeight && (
                    <p className="col-span-2 -mt-2 text-[11px] text-text-dim">
                      Computed rack units: <span className="font-bold text-accent">{derivedRackUnitsFromHeight}U</span>
                    </p>
                  )}
                </>
              )}
              {field("depthInches", "Depth (in)", "number")}
              {requiresSupport &&
                field("widthInches", "Width (in)", "number", {
                  hint: "Used to place towers in the rack grid. Only relevant for free-standing gear.",
                })}
            </div>
            <CheckboxField
              name="requiresSupport"
              label="Requires support (tower / shelf-sitting gear)"
              checked={requiresSupport}
              onChange={(e) => setRequiresSupport(e.target.checked)}
              hint="True for gear that can't float in mid-rack — must rest on the floor or another item."
            />
          </FieldSet>

          <FieldSet legend="Storage">
            <Field
              label="Storage"
              htmlFor="storageId"
              hint="Which off-rack container this asset lives in. Rack placement is set later via the rack diagram."
            >
              <Select
                id="storageId"
                name="storageId"
                defaultValue={data.storageId}
              >
                <option value="">— Unassigned —</option>
                {storages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldSet>

          {isServerLike && (
            <FieldSet legend="Server specification">
              <div className="grid grid-cols-2 gap-4">
                {field("chassis", "Chassis")}
                {field("mainboard", "Mainboard")}
                {field("raidController", "RAID controller")}
                {field("operatingSystem", "Operating system")}
                {field("biosVersion", "BIOS version")}
                {field("builtInEthernetCount", "Built-in Ethernet ports", "number", {
                  hint: "Ports physically on the chassis. PCIe NIC cards are tracked as Components.",
                })}
                {field("builtInSfpCount", "Built-in SFP ports", "number")}
                {field("psuCount", "PSU bays", "number", {
                  hint: "Total number of PSU slots on the chassis (including empty ones).",
                })}
                <Field
                  label="Built-in ports side"
                  htmlFor="builtInPortsSide"
                  hint="Which side of the rear panel the NICs live on. Used to estimate cable lengths."
                >
                  <Select
                    id="builtInPortsSide"
                    name="builtInPortsSide"
                    defaultValue={data.builtInPortsSide}
                  >
                    <option value="">— Unspecified —</option>
                    <option value="LEFT">Left</option>
                    <option value="CENTER">Center</option>
                    <option value="RIGHT">Right</option>
                  </Select>
                </Field>
              </div>
              <Field label="Extras" htmlFor="extras">
                <Textarea id="extras" name="extras" defaultValue={data.extras} />
              </Field>
            </FieldSet>
          )}

          {isServerLike && (
            <FieldSet legend="CPUs">
              <CpuEditor
                items={cpus}
                onChange={setCpus}
                manufacturerSuggestions={suggestions.manufacturers}
              />
              {err("cpus") && (
                <p className="text-xs text-red-400">{err("cpus")}</p>
              )}
            </FieldSet>
          )}

          {isServerLike && (
            <FieldSet legend="RAM">
              <RamEditor
                items={rams}
                onChange={setRams}
                manufacturerSuggestions={suggestions.manufacturers}
              />
              {err("rams") && (
                <p className="text-xs text-red-400">{err("rams")}</p>
              )}
            </FieldSet>
          )}

          {isServerLike && (
            <FieldSet legend="PCIe Slots">
              <PciSlotEditor slots={pciSlots} onChange={setPciSlots} inventory={pciInventory} />
            </FieldSet>
          )}

          {isServerLike && (
            <FieldSet legend="PSU records">
              <PsuEditor psus={psus} onChange={setPsus} />
              {err("psus") && (
                <p className="text-xs text-red-400">{err("psus")}</p>
              )}
            </FieldSet>
          )}

          {isServer && (
            <FieldSet legend="Drive bays">
              <BayZoneEditor zones={bayZones} onChange={setBayZones} />
              {err("bayZones") && (
                <p className="text-xs text-red-400">{err("bayZones")}</p>
              )}
            </FieldSet>
          )}

          {isSwitch && (
            <FieldSet legend="Switch">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Management type" htmlFor="managementType">
                  <Select
                    id="managementType"
                    name="managementType"
                    defaultValue={data.managementType}
                  >
                    <option value="">— Unspecified —</option>
                    <option value="managed">Managed</option>
                    <option value="lite">Lite</option>
                    <option value="unmanaged">Unmanaged</option>
                  </Select>
                </Field>
                {field("poeBudgetWatts", "PoE budget (W)", "number", {
                  hint: "Total PoE wattage available across all powered ports.",
                })}
              </div>
            </FieldSet>
          )}

          {isGwOrFw && (
            <FieldSet legend={isGwOrFw && category === "GATEWAY" ? "Gateway" : "Firewall"}>
              <div className="grid grid-cols-2 gap-4">
                {field("throughputGbps", "Throughput (Gbps)", "number")}
                {field("maxConcurrentConnections", "Max concurrent connections", "number")}
              </div>
            </FieldSet>
          )}

          {hasPortGroups && (
            <FieldSet legend="Port groups">
              <PortGroupEditor groups={portGroups} onChange={setPortGroups} />
              {err("portGroups") && (
                <p className="text-xs text-red-400">{err("portGroups")}</p>
              )}
              {portGroups.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-bold text-text-dim">
                    Faceplate preview
                  </p>
                  <FaceplatePreview portGroups={portGroups} defaultFace="FRONT" />
                </div>
              )}
            </FieldSet>
          )}

          {isUps && (
            <FieldSet legend="UPS">
              <div className="grid grid-cols-2 gap-4">
                {field("vaRating", "VA rating", "number", {
                  hint: "Apparent-power rating in volt-amps.",
                })}
                {field("wattsRating", "Wattage rating (W)", "number", {
                  hint: "Real-power rating the UPS can deliver.",
                })}
                {field("estimatedRuntimeMinutes", "Est. runtime (min)", "number", {
                  hint: "Approximate runtime at typical load.",
                })}
                {field(
                  "surgeProtectedEthernetCount",
                  "Surge-protected Ethernet pass-through ports",
                  "number",
                )}
              </div>
            </FieldSet>
          )}

          {isPdu && (
            <FieldSet legend="PDU">
              <div className="grid grid-cols-2 gap-4">
                {field("amperage", "Amperage", "text", {
                  hint: 'e.g. "15A", "20A", "30A".',
                })}
                <Field label="Type" htmlFor="pduType">
                  <Select
                    id="pduType"
                    name="pduType"
                    defaultValue={data.pduType}
                  >
                    <option value="">— Unspecified —</option>
                    <option value="basic">Basic</option>
                    <option value="switched">Switched</option>
                    <option value="metered">Metered</option>
                  </Select>
                </Field>
              </div>
            </FieldSet>
          )}

          {hasOutletGroups && (
            <FieldSet legend="Outlet groups">
              <OutletGroupEditor
                groups={outletGroups}
                onChange={setOutletGroups}
              />
              {err("outletGroups") && (
                <p className="text-xs text-red-400">{err("outletGroups")}</p>
              )}
              {outletGroups.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-bold text-text-dim">
                    Faceplate preview
                  </p>
                  <FaceplatePreview outletGroups={outletGroups} defaultFace="REAR" />
                </div>
              )}
            </FieldSet>
          )}

          {isKvm && (
            <FieldSet legend="KVM">
              <div className="grid grid-cols-2 gap-4">
                {field("kvmChannelCount", "Channels", "number", {
                  hint: "Number of switch buttons / channels.",
                })}
                {field("supportedProtocols", "Supported protocols", "text", {
                  hint: 'e.g. "HDMI, DisplayPort, VGA".',
                })}
              </div>
            </FieldSet>
          )}

          {isAp && (
            <FieldSet legend="Access point">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Wi-Fi standard" htmlFor="wifiStandard">
                  <Select
                    id="wifiStandard"
                    name="wifiStandard"
                    defaultValue={data.wifiStandard}
                  >
                    <option value="">— Unspecified —</option>
                    <option value="Wi-Fi 4">Wi-Fi 4 (n)</option>
                    <option value="Wi-Fi 5">Wi-Fi 5 (ac)</option>
                    <option value="Wi-Fi 6">Wi-Fi 6 (ax)</option>
                    <option value="Wi-Fi 6E">Wi-Fi 6E</option>
                    <option value="Wi-Fi 7">Wi-Fi 7 (be)</option>
                  </Select>
                </Field>
                {field("maxThroughputMbps", "Max throughput (Mbps)", "number")}
                <Field label="Band support" htmlFor="bandSupport-2.4">
                  {data.bandsLegacyText && (
                    <p className="mb-2 text-[11px] text-cat-ups">
                      Previous value <span className="font-bold">&ldquo;{data.bandsLegacyText}&rdquo;</span> couldn&apos;t be parsed — select the bands below.
                    </p>
                  )}
                  <div className="flex gap-4">
                    {(["2.4", "5", "6"] as const).map((band) => (
                      <label key={band} className="flex cursor-pointer items-center gap-1.5 text-[13px] text-text">
                        <input
                          type="checkbox"
                          id={`bandSupport-${band}`}
                          className="ui-checkbox cursor-pointer"
                          checked={bands.includes(band)}
                          onChange={(e) => {
                            setBands((prev) =>
                              e.target.checked
                                ? [...prev, band].sort()
                                : prev.filter((b) => b !== band),
                            );
                          }}
                        />
                        {band} GHz
                      </label>
                    ))}
                  </div>
                  <input type="hidden" name="bandSupport" value={bands.join(",")} />
                  <input type="hidden" name="bandsLegacyText" value="" />
                </Field>
                <Field label="PoE input" htmlFor="poeInputType">
                  <Select
                    id="poeInputType"
                    name="poeInputType"
                    defaultValue={data.poeInputType}
                  >
                    <option value="">— Unspecified —</option>
                    <option value="none">None</option>
                    <option value="802.3af">802.3af</option>
                    <option value="802.3at">802.3at</option>
                    <option value="802.3bt">802.3bt</option>
                  </Select>
                </Field>
                <Field label="Placement" htmlFor="placement">
                  <Select
                    id="placement"
                    name="placement"
                    defaultValue={data.placement}
                  >
                    <option value="">— Unspecified —</option>
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                  </Select>
                </Field>
                {field("builtInEthernetCount", "Built-in Ethernet ports", "number")}
              </div>
            </FieldSet>
          )}

          {isShelf && (
            <FieldSet legend="Shelf">
              <div className="grid grid-cols-2 gap-4">
                {field("maxLoadLbs", "Max load (lbs)", "number")}
              </div>
              <CheckboxField
                name="ventilated"
                label="Ventilated"
                defaultChecked={data.ventilated}
                hint="Holes / mesh for airflow to gear above and below."
              />
            </FieldSet>
          )}

          {isDrawer && (
            <FieldSet legend="Drawer">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Drawer type" htmlFor="drawerType">
                  <Select
                    id="drawerType"
                    name="drawerType"
                    defaultValue={data.drawerType}
                  >
                    <option value="">— Unspecified —</option>
                    <option value="keyboard">Keyboard</option>
                    <option value="storage">Storage</option>
                  </Select>
                </Field>
                {field("pulloutDepthInches", "Pull-out depth (in)", "number")}
              </div>
            </FieldSet>
          )}

          {isBlank && (
            <FieldSet legend="Blank panel">
              <Field label="Purpose" htmlFor="purpose">
                <Select
                  id="purpose"
                  name="purpose"
                  defaultValue={data.purpose}
                >
                  <option value="">— Unspecified —</option>
                  <option value="airflow">Airflow</option>
                  <option value="aesthetic">Aesthetic</option>
                  <option value="security">Security</option>
                </Select>
              </Field>
            </FieldSet>
          )}

          {hasPowerStats && (
            <FieldSet legend="Power & firmware">
              <div className="grid grid-cols-2 gap-4">
                {field("maxPowerDrawWatts", "Max power draw (W)", "number", {
                  hint: "Peak power consumption. Used for power-budget summaries.",
                })}
                {field("idlePowerWatts", "Idle power (W)", "number", {
                  hint: "Typical idle consumption.",
                })}
                {hasFirmware && field("firmwareVersion", "Firmware version")}
              </div>
            </FieldSet>
          )}

          <FieldSet legend="Images">
            <MultiImageUpload
              defaultImages={(() => {
                try {
                  return JSON.parse(data.imageGallery) as ImageEntry[];
                } catch {
                  return [];
                }
              })()}
            />
          </FieldSet>

          <FieldSet legend="Rack render (image mode)">
            <p className="mb-2 text-[11.5px] text-text-dim">
              Optional images shown when the topology view is in image mode. Each
              is sized to this item&apos;s U-space.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <RackRenderUpload
                name="rackRenderFrontPath"
                faceLabel="Front"
                defaultValue={data.rackRenderFrontPath}
                rackUnits={
                  parseInt(data.rackUnits || derivedRackUnitsFromHeight || "0", 10) || 0
                }
              />
              <RackRenderUpload
                name="rackRenderRearPath"
                faceLabel="Rear"
                defaultValue={data.rackRenderRearPath}
                rackUnits={
                  parseInt(data.rackUnits || derivedRackUnitsFromHeight || "0", 10) || 0
                }
              />
            </div>
          </FieldSet>

          {(isServerLike || hasPortGroups || hasOutletGroups || isKvm) && (
            <FieldSet legend="Faceplate layout (diagram positions)">
              <FaceplateDesigner
                bayZones={bayZones}
                onBayZones={setBayZones}
                portGroups={portGroups}
                onPortGroups={setPortGroups}
                outletGroups={outletGroups}
                onOutletGroups={setOutletGroups}
                psus={psus}
                onPsus={setPsus}
                annotations={annotations}
                onAnnotations={setAnnotations}
                builtIn={builtIn}
                onBuiltIn={setBuiltIn}
              />
            </FieldSet>
          )}

          <FieldSet legend="Notes">
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={data.notes} />
            </Field>
          </FieldSet>
        </>
      )}

      <input
        type="hidden"
        name="bayZones"
        value={JSON.stringify(isServer ? bayZones : [])}
      />
      <input
        type="hidden"
        name="portGroups"
        value={JSON.stringify(hasPortGroups ? portGroups : [])}
      />
      <input
        type="hidden"
        name="outletGroups"
        value={JSON.stringify(hasOutletGroups ? outletGroups : [])}
      />
      <input
        type="hidden"
        name="cpus"
        value={JSON.stringify(isServerLike ? cpus : [])}
      />
      <input
        type="hidden"
        name="rams"
        value={JSON.stringify(isServerLike ? rams : [])}
      />
      <input
        type="hidden"
        name="pciSlots"
        value={JSON.stringify(isServerLike ? pciSlots : [])}
      />
      <input
        type="hidden"
        name="psus"
        value={JSON.stringify(isServerLike ? psus : [])}
      />
      <input
        type="hidden"
        name="annotations"
        value={JSON.stringify(annotations)}
      />
      <input type="hidden" name="builtInGridRow" value={builtIn.gridRow ?? ""} />
      <input type="hidden" name="builtInGridCol" value={builtIn.gridCol ?? ""} />
      <input type="hidden" name="builtInFace" value={builtIn.face ?? ""} />

      {/* Cascade confirm panel — returned by updateAsset when transitioning to
          SOLD/JUNKED with nested items still attached. */}
      {state.confirmCascade && (
        <CascadeConfirmPanel info={state.confirmCascade} />
      )}

      {category !== "" && (
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving…" : submitLabel}
          </Button>
          {state.confirmCascade && (
            <>
              <input type="hidden" name="cascadeChoice" value="same" />
              <Button
                type="submit"
                name="cascadeChoice"
                value="keep"
                variant="secondary"
                disabled={isPending}
              >
                They&apos;re already removed
              </Button>
            </>
          )}
        </div>
      )}
    </form>
  );
}

function CascadeConfirmPanel({ info }: { info: CascadeConfirmRequired }) {
  const parts: string[] = [];
  if (info.drivesCount > 0)
    parts.push(`${info.drivesCount} drive${info.drivesCount !== 1 ? "s" : ""}`);
  if (info.componentsCount > 0) {
    const pciDetail =
      info.pciCardCount > 0
        ? ` (incl. ${info.pciCardCount} PCIe card${info.pciCardCount !== 1 ? "s" : ""})`
        : "";
    parts.push(
      `${info.componentsCount} component${info.componentsCount !== 1 ? "s" : ""}${pciDetail}`,
    );
  }
  if (info.batteriesCount > 0)
    parts.push(
      `${info.batteriesCount} batter${info.batteriesCount !== 1 ? "ies" : "y"}`,
    );

  return (
    <div className="rounded-md border border-cat-ups/40 bg-cat-ups/10 px-4 py-3 text-sm">
      <p className="font-bold text-cat-ups">Cascade to contained items?</p>
      <p className="mt-1 text-text-dim">
        This asset still contains {parts.join(", ")}. Mark them{" "}
        <strong className="text-text">{info.newState}</strong> too, or confirm
        you&apos;ve already removed them.
      </p>
      <p className="mt-2 text-[11px] text-faint">
        Click <strong className="text-text">Save changes</strong> to cascade, or{" "}
        <strong className="text-text">They&apos;re already removed</strong> to
        skip.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PsuEditor — inline PSU record management for server-like assets
// ---------------------------------------------------------------------------

function PsuEditor({
  psus,
  onChange,
}: {
  psus: InlinePsuInput[];
  onChange: (next: InlinePsuInput[]) => void;
}) {
  function add() {
    onChange([
      ...psus,
      { sortOrder: psus.length, side: "LEFT", wattage: null, portCount: 1, state: "IN_USE" },
    ]);
  }
  function remove(idx: number) {
    onChange(
      psus.filter((_, i) => i !== idx).map((p, i) => ({ ...p, sortOrder: i })),
    );
  }
  function update(idx: number, patch: Partial<InlinePsuInput>) {
    onChange(psus.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  return (
    <div className="flex flex-col gap-2">
      {psus.length === 0 && (
        <p className="text-[11px] text-faint">
          No PSU records. Add a PSU to track its wattage and plug side — the
          side is used for cable-length estimation on power connections.
        </p>
      )}
      {psus.map((psu, i) => (
        <div
          key={i}
          className="flex flex-wrap items-end gap-3 rounded-md border border-border p-2"
        >
          <span className="w-5 shrink-0 text-center text-[11px] text-faint leading-9">
            {i + 1}
          </span>
          <Field label="Side" htmlFor={`psu-side-${i}`}>
            <Select
              id={`psu-side-${i}`}
              value={psu.side}
              onChange={(e) =>
                update(i, { side: e.target.value as InlinePsuInput["side"] })
              }
            >
              <option value="LEFT">Left</option>
              <option value="CENTER">Center</option>
              <option value="RIGHT">Right</option>
            </Select>
          </Field>
          <Field label="Wattage" htmlFor={`psu-wattage-${i}`}>
            <TextInput
              id={`psu-wattage-${i}`}
              type="number"
              min={1}
              placeholder="W"
              value={psu.wattage?.toString() ?? ""}
              onChange={(e) =>
                update(i, {
                  wattage: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
            />
          </Field>
          <Field label="Ports" htmlFor={`psu-ports-${i}`}>
            <TextInput
              id={`psu-ports-${i}`}
              type="number"
              min={1}
              value={psu.portCount.toString()}
              onChange={(e) =>
                update(i, { portCount: parseInt(e.target.value, 10) || 1 })
              }
            />
          </Field>
          <Field label="State" htmlFor={`psu-state-${i}`}>
            <Select
              id={`psu-state-${i}`}
              value={psu.state}
              onChange={(e) =>
                update(i, {
                  state: e.target.value as InlinePsuInput["state"],
                })
              }
            >
              {LIFECYCLE_STATES.map((s) => (
                <option key={s} value={s}>
                  {enumLabel(s)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex-1">
            <Field label="Manufacturer" htmlFor={`psu-mfr-${i}`}>
              <TextInput
                id={`psu-mfr-${i}`}
                placeholder="optional"
                value={psu.manufacturer ?? ""}
                onChange={(e) =>
                  update(i, { manufacturer: e.target.value || null })
                }
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Model" htmlFor={`psu-model-${i}`}>
              <TextInput
                id={`psu-model-${i}`}
                placeholder="optional"
                value={psu.model ?? ""}
                onChange={(e) => update(i, { model: e.target.value || null })}
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="mb-1 shrink-0 text-faint hover:text-red-400"
            title="Remove PSU"
          >
            ×
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={add}>
        Add PSU
      </Button>
    </div>
  );
}

function BayZoneEditor({
  zones,
  onChange,
}: {
  zones: BayZoneInput[];
  onChange: (zones: BayZoneInput[]) => void;
}) {
  function update(index: number, patch: Partial<BayZoneInput>) {
    onChange(zones.map((z, i) => (i === index ? { ...z, ...patch } : z)));
  }
  function add() {
    onChange([
      ...zones,
      {
        name: "",
        faceSide: "FRONT",
        driveSize: "SFF",
        bayCount: 1,
        sortOrder: zones.length,
      },
    ]);
  }
  function remove(index: number) {
    onChange(zones.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {zones.length === 0 && (
        <p className="text-[11px] text-faint">
          No drive-bay zones. Add one to define this server&apos;s bays.
        </p>
      )}
      {zones.map((zone, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-3 rounded-md border border-border p-3"
        >
          <Field label="Zone name">
            <TextInput
              value={zone.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
          </Field>
          <Field label="Face">
            <Select
              value={zone.faceSide}
              onChange={(e) =>
                update(i, {
                  faceSide: e.target.value as BayZoneInput["faceSide"],
                })
              }
            >
              {FACE_SIDES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bay size">
            <Select
              value={zone.driveSize}
              onChange={(e) =>
                update(i, {
                  driveSize: e.target.value as BayZoneInput["driveSize"],
                })
              }
            >
              {DRIVE_SIZES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bays">
            <TextInput
              type="number"
              min={1}
              className="w-20"
              value={zone.bayCount}
              onChange={(e) =>
                update(i, { bayCount: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <Button type="button" variant="secondary" onClick={() => remove(i)}>
            Remove
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="accent" onClick={add}>
          Add zone
        </Button>
      </div>
    </div>
  );
}

// Faceplate layout controls shared by the port- and outlet-group editors:
// which face the strip renders on, its rows × columns shape, and per-port
// show/hide toggles. All optional — leaving them blank keeps the default render.
function FaceplateLayoutControls({
  count,
  face,
  rows,
  columns,
  hidden,
  showFace = true,
  onChange,
}: {
  count: number;
  face?: string | null;
  rows?: number | null;
  columns?: number | null;
  hidden?: number[] | null;
  showFace?: boolean;
  onChange: (patch: {
    face?: string | null;
    rows?: number | null;
    columns?: number | null;
    hiddenPorts?: number[] | null;
  }) => void;
}) {
  const [showPorts, setShowPorts] = useState(false);
  const hiddenSet = new Set(hidden ?? []);

  function togglePort(n: number) {
    const next = new Set(hiddenSet);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    onChange({
      hiddenPorts: next.size ? Array.from(next).sort((a, b) => a - b) : null,
    });
  }
  const numOrNull = (v: string) => (v === "" ? null : Number(v) || null);

  return (
    <div className="col-span-full flex flex-col gap-2 border-t border-border/50 pt-2">
      <div className="flex flex-wrap items-end gap-3">
        {showFace && (
          <Field label="Face">
            <Select
              className="w-28"
              value={face ?? ""}
              onChange={(e) => onChange({ face: e.target.value || null })}
            >
              <option value="">Default</option>
              <option value="FRONT">Front</option>
              <option value="REAR">Rear</option>
            </Select>
          </Field>
        )}
        <Field label="Rows">
          <TextInput
            type="number"
            min={1}
            className="w-20"
            placeholder="auto"
            value={rows ?? ""}
            onChange={(e) => onChange({ rows: numOrNull(e.target.value) })}
          />
        </Field>
        <Field label="Columns">
          <TextInput
            type="number"
            min={1}
            className="w-20"
            placeholder="auto"
            value={columns ?? ""}
            onChange={(e) => onChange({ columns: numOrNull(e.target.value) })}
          />
        </Field>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowPorts((v) => !v)}
        >
          {showPorts ? "Done" : "Show / hide ports"}
          {hiddenSet.size > 0 ? ` (${hiddenSet.size} hidden)` : ""}
        </Button>
      </div>
      {showPorts && count > 0 && (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
            const isHidden = hiddenSet.has(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => togglePort(n)}
                title={isHidden ? "Hidden — click to show" : "Visible — click to hide"}
                className={`h-6 w-7 rounded-[3px] border text-[10px] font-bold ${
                  isHidden
                    ? "border-border bg-panel-2 text-faint line-through"
                    : "border-accent/50 bg-accent/15 text-accent"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Lay visible slot numbers (1..count minus hidden) into rows using the same
// rules as the diagram's PortGrid, for the live faceplate preview.
function previewRows(
  count: number,
  rows?: number | null,
  columns?: number | null,
  hidden?: number[] | null,
): number[][] {
  const hiddenSet = new Set(hidden ?? []);
  const slots = Array.from({ length: count }, (_, i) => i + 1).filter(
    (n) => !hiddenSet.has(n),
  );
  if (slots.length === 0) return [];
  const per =
    columns && columns > 0
      ? columns
      : rows && rows > 0
        ? Math.ceil(slots.length / rows)
        : Math.ceil(slots.length / 2);
  const out: number[][] = [];
  for (let i = 0; i < slots.length; i += per) out.push(slots.slice(i, i + per));
  return out;
}

function PreviewGroup({
  label,
  count,
  rows,
  columns,
  hidden,
  tone,
}: {
  label: string;
  count: number;
  rows?: number | null;
  columns?: number | null;
  hidden?: number[] | null;
  tone: "port" | "outlet";
}) {
  const grid = previewRows(count, rows, columns, hidden);
  return (
    <div>
      <p className="mb-0.5 truncate text-[9px] font-bold uppercase tracking-wide text-text-dim">
        {label}
      </p>
      <div className="flex flex-col gap-[2px]">
        {grid.map((row, ri) => (
          <div key={ri} className="flex gap-[2px]">
            {row.map((n) => (
              <span
                key={n}
                title={`${n}`}
                className={`inline-block h-3 w-4 rounded-[2px] border ${
                  tone === "outlet"
                    ? "border-cat-ups/50 bg-cat-ups/15"
                    : "border-accent/50 bg-accent/15"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Live faceplate preview reflecting each group's face, rows×columns and hidden
// ports — mirrors how the rack diagram will render the device.
function FaceplatePreview({
  portGroups,
  outletGroups,
  defaultFace,
}: {
  portGroups?: PortGroupInput[];
  outletGroups?: OutletGroupInput[];
  defaultFace: "FRONT" | "REAR";
}) {
  const faces: ("FRONT" | "REAR")[] = ["FRONT", "REAR"];
  return (
    <div className="grid grid-cols-2 gap-3">
      {faces.map((face) => {
        const ports = (portGroups ?? []).filter(
          (g) => (g.face ?? defaultFace) === face,
        );
        const outlets = (outletGroups ?? []).filter(
          (g) => (g.face ?? defaultFace) === face,
        );
        const empty = ports.length === 0 && outlets.length === 0;
        return (
          <div
            key={face}
            className="rounded-md border border-border bg-[#0a0d12] p-3"
          >
            <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-accent">
              {face} face
            </p>
            <div className="flex flex-wrap gap-3">
              {ports.map((g, i) => (
                <PreviewGroup
                  key={`p${i}`}
                  label={g.name || PORT_TYPE_LABELS[g.portType]}
                  count={g.portCount}
                  rows={g.rows}
                  columns={g.columns}
                  hidden={g.hiddenPorts}
                  tone="port"
                />
              ))}
              {outlets.map((g, i) => (
                <PreviewGroup
                  key={`o${i}`}
                  label={g.name || g.outletType || "Outlets"}
                  count={g.outletCount}
                  rows={g.rows}
                  columns={g.columns}
                  hidden={g.hiddenPorts}
                  tone="outlet"
                />
              ))}
              {empty && <p className="text-[10px] text-faint">— nothing on this face —</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Per-face rack-render image upload (issue 4 image mode). Blocks uploading until
// the asset's rack height (U) is set, and previews the image scaled into the
// item's exact U-space inside a small example rack.
function RackRenderUpload({
  name,
  faceLabel,
  defaultValue,
  rackUnits,
}: {
  name: string;
  faceLabel: string;
  defaultValue: string;
  rackUnits: number;
}) {
  const [path, setPath] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = rackUnits >= 1;
  const U_PREVIEW = 22; // px per U in the example rack

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { path?: string; error?: string };
      if (!res.ok || !json.path) setError(json.error ?? "Upload failed");
      else setPath(json.path);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-panel-2 p-3">
      <input type="hidden" name={name} value={path} />
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-dim">
        {faceLabel} render image
      </p>
      {!ready ? (
        <p className="text-[11px] text-cat-ups">
          Set the rack height (U) under Physical first — the preview sizes the
          image to the item&apos;s U-space.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-[12px] text-text-dim transition-colors hover:border-accent hover:text-accent">
              {uploading ? "Uploading…" : path ? "Replace image" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {path && (
              <button
                type="button"
                onClick={() => setPath("")}
                className="text-[11px] text-text-dim hover:text-red-400"
              >
                Remove
              </button>
            )}
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          {path && (
            <div>
              <p className="mb-1 text-[10px] text-faint">Preview in rack:</p>
              <div className="inline-flex flex-col rounded-sm border border-[#04070b] bg-[#0a0d12] p-1">
                {/* one empty U above, the item, one empty U below */}
                <div className="h-[6px]" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={path}
                  alt={`${faceLabel} render`}
                  className="block w-[260px] rounded-[2px] object-fill"
                  style={{ height: rackUnits * U_PREVIEW }}
                />
                <div className="h-[6px]" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PortGroupEditor({
  groups,
  onChange,
}: {
  groups: PortGroupInput[];
  onChange: (groups: PortGroupInput[]) => void;
}) {
  function update(index: number, patch: Partial<PortGroupInput>) {
    onChange(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }
  function add() {
    onChange([
      ...groups,
      {
        name: "",
        portCount: 1,
        portType: "ETHERNET",
        portSpeed: "1G",
        poePerPort: null,
        side: "LEFT",
        sortOrder: groups.length,
      },
    ]);
  }
  function remove(index: number) {
    onChange(groups.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.length === 0 && (
        <p className="text-[11px] text-faint">
          No port groups. A switch with 24×1G + 4×SFP+ would be two groups.
        </p>
      )}
      {groups.map((group, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] items-end gap-3 rounded-md border border-border p-3"
        >
          <Field label="Label">
            <TextInput
              placeholder="Access, Uplink…"
              value={group.name ?? ""}
              onChange={(e) => update(i, { name: e.target.value || null })}
            />
          </Field>
          <Field label="Port type">
            <Select
              value={group.portType}
              onChange={(e) =>
                update(i, {
                  portType: e.target.value as PortGroupInput["portType"],
                })
              }
            >
              {PORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PORT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Speed">
            <TextInput
              className="w-20"
              placeholder="1G"
              value={group.portSpeed ?? ""}
              onChange={(e) => update(i, { portSpeed: e.target.value || null })}
            />
          </Field>
          <Field label="Count">
            <TextInput
              type="number"
              min={1}
              className="w-20"
              value={group.portCount}
              onChange={(e) =>
                update(i, { portCount: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <Field label="PoE W/port">
            <TextInput
              type="number"
              min={0}
              className="w-20"
              value={group.poePerPort ?? ""}
              onChange={(e) =>
                update(i, {
                  poePerPort:
                    e.target.value === "" ? null : Number(e.target.value) || 0,
                })
              }
            />
          </Field>
          <Field label="Side">
            <Select
              className="w-28"
              value={group.side}
              onChange={(e) =>
                update(i, { side: e.target.value as PortGroupInput["side"] })
              }
            >
              <option value="LEFT">Left</option>
              <option value="CENTER">Center</option>
              <option value="RIGHT">Right</option>
            </Select>
          </Field>
          <Button type="button" variant="secondary" onClick={() => remove(i)}>
            Remove
          </Button>
          <FaceplateLayoutControls
            count={group.portCount}
            face={group.face}
            rows={group.rows}
            columns={group.columns}
            hidden={group.hiddenPorts}
            onChange={(patch) => update(i, patch as Partial<PortGroupInput>)}
          />
        </div>
      ))}
      <div>
        <Button type="button" variant="accent" onClick={add}>
          Add port group
        </Button>
      </div>
    </div>
  );
}

function OutletGroupEditor({
  groups,
  onChange,
}: {
  groups: OutletGroupInput[];
  onChange: (groups: OutletGroupInput[]) => void;
}) {
  function update(index: number, patch: Partial<OutletGroupInput>) {
    onChange(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }
  function add() {
    onChange([
      ...groups,
      {
        name: "",
        outletCount: 1,
        outletType: "",
        batteryBacked: false,
        surgeProtected: true,
        side: "LEFT",
        sortOrder: groups.length,
      },
    ]);
  }
  function remove(index: number) {
    onChange(groups.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.length === 0 && (
        <p className="text-[11px] text-faint">
          No outlet groups. A UPS with battery + surge-only outlets would be two
          groups.
        </p>
      )}
      {groups.map((group, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] items-end gap-3 rounded-md border border-border p-3"
        >
          <Field label="Label">
            <TextInput
              placeholder="Battery backup, Surge only…"
              value={group.name ?? ""}
              onChange={(e) => update(i, { name: e.target.value || null })}
            />
          </Field>
          <Field label="Outlet type">
            <TextInput
              placeholder="C13, NEMA 5-15R…"
              value={group.outletType ?? ""}
              onChange={(e) =>
                update(i, { outletType: e.target.value || null })
              }
            />
          </Field>
          <Field label="Count">
            <TextInput
              type="number"
              min={1}
              className="w-20"
              value={group.outletCount}
              onChange={(e) =>
                update(i, { outletCount: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wide text-text-dim">
            <span>Battery</span>
            <input
              type="checkbox"
              checked={group.batteryBacked}
              onChange={(e) =>
                update(i, { batteryBacked: e.target.checked })
              }
              className="ui-checkbox"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wide text-text-dim">
            <span>Surge</span>
            <input
              type="checkbox"
              checked={group.surgeProtected}
              onChange={(e) =>
                update(i, { surgeProtected: e.target.checked })
              }
              className="ui-checkbox"
            />
          </label>
          <Field label="Side">
            <Select
              className="w-28"
              value={group.side}
              onChange={(e) =>
                update(i, { side: e.target.value as OutletGroupInput["side"] })
              }
            >
              <option value="LEFT">Left</option>
              <option value="CENTER">Center</option>
              <option value="RIGHT">Right</option>
            </Select>
          </Field>
          <Button type="button" variant="secondary" onClick={() => remove(i)}>
            Remove
          </Button>
          <FaceplateLayoutControls
            count={group.outletCount}
            face={group.face}
            rows={group.rows}
            columns={group.columns}
            hidden={group.hiddenPorts}
            showFace={false}
            onChange={(patch) => update(i, patch as Partial<OutletGroupInput>)}
          />
        </div>
      ))}
      <div>
        <Button type="button" variant="accent" onClick={add}>
          Add outlet group
        </Button>
      </div>
    </div>
  );
}

function CpuEditor({
  items,
  onChange,
  manufacturerSuggestions,
}: {
  items: InlineCpuInput[];
  onChange: (items: InlineCpuInput[]) => void;
  manufacturerSuggestions: string[];
}) {
  function update(index: number, patch: Partial<InlineCpuInput>) {
    onChange(items.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }
  function add() {
    onChange([
      ...items,
      {
        name: "",
        manufacturer: null,
        model: null,
        quantity: 1,
        speedGHz: null,
        cores: null,
        threads: null,
        socket: null,
        tdpWatts: null,
      },
    ]);
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && (
        <p className="text-[11px] text-faint">
          No CPUs. Each CPU type (with its quantity) lives in its own row and
          shows up in /components as a Component.
        </p>
      )}
      {items.map((c, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-md border border-border p-3"
        >
          <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-3">
            <Field label="Qty">
              <TextInput
                type="number"
                min={1}
                value={c.quantity}
                onChange={(e) =>
                  update(i, { quantity: Number(e.target.value) || 1 })
                }
              />
            </Field>
            <Field label="Name">
              <TextInput
                placeholder='e.g. "Xeon E5-2650 v3"'
                value={c.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
            </Field>
            <Field label="Manufacturer">
              <TextInput
                id={`cpu-${i}-mfg`}
                value={c.manufacturer ?? ""}
                onChange={(e) =>
                  update(i, { manufacturer: e.target.value || null })
                }
                suggestions={manufacturerSuggestions}
              />
            </Field>
            <Field label="Model">
              <TextInput
                value={c.model ?? ""}
                onChange={(e) => update(i, { model: e.target.value || null })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-end gap-3">
            <Field label="GHz">
              <TextInput
                type="number"
                step="any"
                value={c.speedGHz ?? ""}
                onChange={(e) =>
                  update(i, {
                    speedGHz:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Cores">
              <TextInput
                type="number"
                min={1}
                value={c.cores ?? ""}
                onChange={(e) =>
                  update(i, {
                    cores:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Threads">
              <TextInput
                type="number"
                min={1}
                value={c.threads ?? ""}
                onChange={(e) =>
                  update(i, {
                    threads:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="TDP (W)">
              <TextInput
                type="number"
                min={0}
                value={c.tdpWatts ?? ""}
                onChange={(e) =>
                  update(i, {
                    tdpWatts:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Socket">
              <TextInput
                value={c.socket ?? ""}
                onChange={(e) =>
                  update(i, { socket: e.target.value || null })
                }
              />
            </Field>
            <Button type="button" variant="secondary" onClick={() => remove(i)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <div>
        <Button type="button" variant="accent" onClick={add}>
          Add CPU
        </Button>
      </div>
    </div>
  );
}

function RamEditor({
  items,
  onChange,
  manufacturerSuggestions,
}: {
  items: InlineRamInput[];
  onChange: (items: InlineRamInput[]) => void;
  manufacturerSuggestions: string[];
}) {
  function update(index: number, patch: Partial<InlineRamInput>) {
    onChange(items.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function add() {
    onChange([
      ...items,
      {
        name: "",
        manufacturer: null,
        model: null,
        quantity: 1,
        capacityGB: null,
        speedMHz: null,
        generation: null,
        ecc: null,
        formFactor: null,
      },
    ]);
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && (
        <p className="text-[11px] text-faint">
          No RAM. Each RAM type (with its quantity) is a separate row, persisted
          as a Component.
        </p>
      )}
      {items.map((r, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-md border border-border p-3"
        >
          <div className="grid grid-cols-[80px_1fr_1fr] gap-3">
            <Field label="Qty">
              <TextInput
                type="number"
                min={1}
                value={r.quantity}
                onChange={(e) =>
                  update(i, { quantity: Number(e.target.value) || 1 })
                }
              />
            </Field>
            <Field label="Name">
              <TextInput
                placeholder='e.g. "16GB PC4-2133 ECC"'
                value={r.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
            </Field>
            <Field label="Manufacturer">
              <TextInput
                id={`ram-${i}-mfg`}
                value={r.manufacturer ?? ""}
                onChange={(e) =>
                  update(i, { manufacturer: e.target.value || null })
                }
                suggestions={manufacturerSuggestions}
              />
            </Field>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] items-end gap-3">
            <Field label="GB">
              <TextInput
                type="number"
                min={1}
                value={r.capacityGB ?? ""}
                onChange={(e) =>
                  update(i, {
                    capacityGB:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="MHz">
              <TextInput
                type="number"
                min={0}
                value={r.speedMHz ?? ""}
                onChange={(e) =>
                  update(i, {
                    speedMHz:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Generation">
              <Select
                value={r.generation ?? ""}
                onChange={(e) =>
                  update(i, { generation: e.target.value || null })
                }
              >
                <option value="">—</option>
                <option value="DDR3">DDR3</option>
                <option value="DDR4">DDR4</option>
                <option value="DDR5">DDR5</option>
              </Select>
            </Field>
            <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wide text-text-dim">
              <span>ECC</span>
              <input
                type="checkbox"
                checked={r.ecc ?? false}
                onChange={(e) => update(i, { ecc: e.target.checked })}
                className="ui-checkbox"
              />
            </label>
            <Button type="button" variant="secondary" onClick={() => remove(i)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <div>
        <Button type="button" variant="accent" onClick={add}>
          Add RAM
        </Button>
      </div>
    </div>
  );
}

const PCI_TYPE_LABEL: Record<string, string> = {
  NIC_CARD: "NIC Card",
  GPU: "GPU / Video Card",
  PCIE_CARD: "PCIe Card (other)",
  RAID_CONTROLLER: "RAID Controller",
  NVME_RISER: "NVMe Riser",
};

type RiserDriveRow = { name: string; capacityGB: string };

type PanelDraft = {
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  portCount: string;
  portType: string;
  portSpeed: string;
  cardInterface: string;
  cardSize: string;
  // NVMe riser only
  m2SlotCount: string;
  m2SlotSize: string;
  drives: RiserDriveRow[];
};
// A fresh draft seeded to fit the given slot: type defaults to the first type
// the slot family allows, cardSize to the slot's own size.
function emptyDraft(slotSize: string): PanelDraft {
  const types = allowedCardTypes(slotSize);
  return {
    name: "",
    type: types[0] ?? "PCIE_CARD",
    manufacturer: "",
    model: "",
    portCount: "",
    portType: "ETHERNET",
    portSpeed: "",
    cardInterface: "",
    cardSize: slotSize,
    m2SlotCount: "",
    m2SlotSize: "M.2 2280",
    drives: [],
  };
}
type PanelState = {
  slotIndex: number;
  mode: "inventory" | "new";
  pickId: string;
  draft: PanelDraft;
};

function PciSlotEditor({
  slots,
  onChange,
  inventory,
}: {
  slots: InlinePciSlotInput[];
  onChange: (slots: InlinePciSlotInput[]) => void;
  inventory: PciInventoryItem[];
}) {
  const [panel, setPanel] = useState<PanelState | null>(null);

  function addSlot() {
    onChange([...slots, { sortOrder: slots.length, size: "x8" }]);
  }

  function removeSlot(i: number) {
    // Remove slot from form — any occupant will be unlinked in the action
    onChange(
      slots.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, sortOrder: idx }))
    );
    if (panel?.slotIndex === i) setPanel(null);
  }

  function updateSize(i: number, size: string) {
    // Changing the slot size invalidates any pending install (a card that fit
    // the old size may not fit the new one), so clear the pending selection.
    onChange(
      slots.map((s, idx) =>
        idx === i
          ? {
              ...s,
              size,
              pendingExistingComponentId: null,
              pendingNewComponent: null,
            }
          : s,
      ),
    );
    // If the install panel is open for this slot, reseed it so its type/size
    // options and the create-new fields match the new slot size.
    setPanel((p) =>
      p && p.slotIndex === i
        ? { ...p, pickId: "", draft: emptyDraft(size) }
        : p,
    );
  }

  function setPendingVacate(i: number) {
    onChange(slots.map((s, idx) =>
      idx === i ? { ...s, pendingVacate: true, pendingExistingComponentId: null, pendingNewComponent: null } : s
    ));
    if (panel?.slotIndex === i) setPanel(null);
  }

  function undoVacate(i: number) {
    onChange(slots.map((s, idx) => (idx === i ? { ...s, pendingVacate: false } : s)));
  }

  function cancelPending(i: number) {
    onChange(slots.map((s, idx) =>
      idx === i ? { ...s, pendingExistingComponentId: null, pendingNewComponent: null } : s
    ));
  }

  function openPanel(i: number) {
    const slotSize = slots[i].size;
    const compatibleInv = inventory.filter((c) =>
      cardFitsSlot(c.cardSize, slotSize),
    );
    setPanel({
      slotIndex: i,
      mode: compatibleInv.length > 0 ? "inventory" : "new",
      pickId: compatibleInv[0]?.id ?? "",
      draft: emptyDraft(slotSize),
    });
  }

  function applyInventory() {
    if (!panel?.pickId) return;
    onChange(slots.map((s, i) =>
      i === panel.slotIndex
        ? { ...s, pendingExistingComponentId: panel.pickId, pendingNewComponent: null, pendingVacate: false }
        : s
    ));
    setPanel(null);
  }

  function applyNew() {
    if (!panel || !panel.draft.name.trim()) return;
    const d = panel.draft;
    const portCountNum = d.portCount ? parseInt(d.portCount, 10) : null;
    const isRiser = d.type === "NVME_RISER";
    const m2 = d.m2SlotCount ? parseInt(d.m2SlotCount, 10) : null;
    const riserDrives = isRiser
      ? d.drives
          .map((r) => ({
            name: r.name.trim(),
            capacityGB: r.capacityGB ? parseInt(r.capacityGB, 10) : NaN,
          }))
          .filter((r) => r.name !== "" && Number.isFinite(r.capacityGB) && r.capacityGB > 0)
      : [];
    const draft: PciNewComponentDraft = {
      name: d.name.trim(),
      type: d.type,
      manufacturer: d.manufacturer.trim() || null,
      model: d.model.trim() || null,
      portCount: portCountNum != null && Number.isFinite(portCountNum) ? portCountNum : null,
      portType: d.type === "NIC_CARD" && d.portType ? d.portType : null,
      portSpeed: d.portSpeed.trim() || null,
      cardInterface: d.cardInterface.trim() || null,
      cardSize: d.cardSize || null,
      m2SlotCount: isRiser && m2 != null && Number.isFinite(m2) && m2 > 0 ? m2 : null,
      m2SlotSize: isRiser ? d.m2SlotSize || null : null,
      drives: riserDrives.length > 0 ? riserDrives : undefined,
    };
    onChange(slots.map((s, i) =>
      i === panel.slotIndex
        ? { ...s, pendingNewComponent: draft, pendingExistingComponentId: null, pendingVacate: false }
        : s
    ));
    setPanel(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {slots.length === 0 && (
        <p className="text-[11px] text-faint">
          No PCIe slots defined. Add slots below, then use the &ldquo;Add card&rdquo; button to install a component.
        </p>
      )}

      {slots.map((slot, i) => {
        const isOccupied = Boolean(slot.occupiedByComponentId) && !slot.pendingVacate;
        const hasPending = Boolean(slot.pendingExistingComponentId || slot.pendingNewComponent);
        const pendingName = slot.pendingExistingComponentId
          ? (inventory.find((c) => c.id === slot.pendingExistingComponentId)?.name ?? "Unknown component")
          : slot.pendingNewComponent?.name ?? null;
        const isPanelOpen = panel?.slotIndex === i;

        return (
          <div key={i} className="rounded-md border border-border">
            {/* Slot row */}
            <div className="flex items-center gap-3 p-2">
              <span className="w-5 shrink-0 text-center text-[11px] text-faint">
                {i + 1}
              </span>
              <Field label="Size">
                <Select
                  value={slot.size}
                  onChange={(e) => updateSize(i, e.target.value)}
                >
                  {PCI_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </Select>
              </Field>

              {/* Occupant / pending status */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {slot.pendingVacate && slot.occupiedByComponentId ? (
                  <>
                    <span className="truncate text-[11.5px] text-text-dim line-through">
                      {slot.occupiedByName ?? slot.occupiedByComponentId}
                    </span>
                    <span className="shrink-0 text-[10px] text-cat-ups">(will remove)</span>
                    <Button type="button" variant="secondary" onClick={() => undoVacate(i)}>
                      Undo
                    </Button>
                  </>
                ) : hasPending ? (
                  <>
                    <span className="text-[10px] text-text-dim">Will install:</span>
                    <span className="truncate text-[11.5px] font-medium text-text">
                      {pendingName}
                    </span>
                    <Button type="button" variant="secondary" onClick={() => cancelPending(i)}>
                      Cancel
                    </Button>
                  </>
                ) : isOccupied ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-medium text-text">
                        {slot.occupiedByName ?? slot.occupiedByComponentId}
                      </span>
                      <span className="text-[10px] text-text-dim">
                        {PCI_TYPE_LABEL[slot.occupiedByComponentId ? "NIC_CARD" : ""] ?? "PCIe card"}
                      </span>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setPendingVacate(i)}>
                      Remove
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-faint">Empty</span>
                    <Button
                      type="button"
                      variant="accent"
                      onClick={() => (isPanelOpen ? setPanel(null) : openPanel(i))}
                    >
                      {isPanelOpen ? "Cancel" : "+ Add card"}
                    </Button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeSlot(i)}
                className="ml-1 shrink-0 text-faint hover:text-red-400"
                title="Remove slot"
              >
                ×
              </button>
            </div>

            {/* Install panel — shown inline below this slot row */}
            {isPanelOpen && (
              <div className="border-t border-border bg-bg-subtle px-3 py-3">
                {/* Tab toggle */}
                {inventory.length > 0 && (
                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPanel((p) => p && { ...p, mode: "inventory" })}
                      className={`rounded px-3 py-1 text-[11px] font-bold transition-colors ${panel?.mode === "inventory" ? "bg-accent text-white" : "border border-border text-text-dim hover:text-text"}`}
                    >
                      From inventory
                    </button>
                    <button
                      type="button"
                      onClick={() => setPanel((p) => p && { ...p, mode: "new" })}
                      className={`rounded px-3 py-1 text-[11px] font-bold transition-colors ${panel?.mode === "new" ? "bg-accent text-white" : "border border-border text-text-dim hover:text-text"}`}
                    >
                      Create new
                    </button>
                  </div>
                )}

                {/* Inventory picker — only cards that physically fit this slot */}
                {panel?.mode === "inventory" && inventory.length > 0 && (() => {
                  const fit = inventory.filter((c) =>
                    cardFitsSlot(c.cardSize, slot.size),
                  );
                  return (
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Field label={`Compatible cards (slot ${i + 1} · ${slot.size})`}>
                          {fit.length === 0 ? (
                            <p className="text-[11px] text-faint">
                              No in-stock cards fit a {slot.size} slot. Use
                              &ldquo;Create new&rdquo; instead.
                            </p>
                          ) : (
                            <Select
                              value={panel.pickId}
                              onChange={(e) => setPanel((p) => p && { ...p, pickId: e.target.value })}
                            >
                              <option value="">— Select a component —</option>
                              {fit.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                  {c.cardSize ? ` · ${c.cardSize}` : ""}
                                  {c.portCount && c.portType
                                    ? ` · ${c.portCount}× ${c.portType.replace(/_/g, "+")} ${c.portSpeed ?? ""}`
                                    : ""}{" "}
                                  ({PCI_TYPE_LABEL[c.type] ?? c.type})
                                </option>
                              ))}
                            </Select>
                          )}
                        </Field>
                      </div>
                      <Button type="button" variant="primary" onClick={applyInventory} disabled={!panel.pickId}>
                        Install
                      </Button>
                    </div>
                  );
                })()}

                {/* Create new form */}
                {panel?.mode === "new" && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
                      <Field label="Name" required>
                        <TextInput
                          placeholder='e.g. "Intel X710-DA2"'
                          value={panel.draft.name}
                          onChange={(e) => setPanel((p) => p && { ...p, draft: { ...p.draft, name: e.target.value } })}
                        />
                      </Field>
                      <Field label="Type">
                        <Select
                          value={panel.draft.type}
                          onChange={(e) => setPanel((p) => p && { ...p, draft: { ...p.draft, type: e.target.value } })}
                        >
                          {allowedCardTypes(slot.size).map((t) => (
                            <option key={t} value={t}>{PCI_TYPE_LABEL[t] ?? t}</option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Manufacturer">
                        <TextInput
                          placeholder="Intel, NVIDIA, LSI…"
                          value={panel.draft.manufacturer}
                          onChange={(e) => setPanel((p) => p && { ...p, draft: { ...p.draft, manufacturer: e.target.value } })}
                        />
                      </Field>
                      <Field label="Model">
                        <TextInput
                          value={panel.draft.model}
                          onChange={(e) => setPanel((p) => p && { ...p, draft: { ...p.draft, model: e.target.value } })}
                        />
                      </Field>
                    </div>
                    {panel.draft.type === "NIC_CARD" && (
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Port count">
                          <TextInput
                            type="number"
                            min={1}
                            placeholder="2"
                            value={panel.draft.portCount}
                            onChange={(e) => setPanel((p) => p && { ...p, draft: { ...p.draft, portCount: e.target.value } })}
                          />
                        </Field>
                        <Field label="Port type">
                          <Select
                            value={panel.draft.portType}
                            onChange={(e) => setPanel((p) => p && { ...p, draft: { ...p.draft, portType: e.target.value } })}
                          >
                            {PORT_TYPES.map((t) => (
                              <option key={t} value={t}>{PORT_TYPE_LABELS[t]}</option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Speed" hint='e.g. "10G", "25G"'>
                          <TextInput
                            placeholder="10G"
                            value={panel.draft.portSpeed}
                            onChange={(e) => setPanel((p) => p && { ...p, draft: { ...p.draft, portSpeed: e.target.value } })}
                          />
                        </Field>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Card interface" hint='Physical PCIe interface, e.g. "PCIe 3.0 x8"'>
                        <TextInput
                          placeholder="PCIe 3.0 x8"
                          value={panel.draft.cardInterface}
                          onChange={(e) => setPanel((p) => p && { ...p, draft: { ...p.draft, cardInterface: e.target.value } })}
                        />
                      </Field>
                      <Field
                        label="Connector size"
                        hint="Constrained to sizes that fit this slot."
                      >
                        <Select
                          value={panel.draft.cardSize}
                          onChange={(e) => setPanel((p) => p && { ...p, draft: { ...p.draft, cardSize: e.target.value } })}
                        >
                          {compatibleCardSizes(slot.size).map((sz) => (
                            <option key={sz} value={sz}>{sz}</option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    {/* NVMe riser: define its M.2 slots and (optionally) the
                        drives to create + mount into them on save. */}
                    {panel.draft.type === "NVME_RISER" && (
                      <RiserDraftFields
                        draft={panel.draft}
                        onChange={(patch) =>
                          setPanel((p) => p && { ...p, draft: { ...p.draft, ...patch } })
                        }
                      />
                    )}

                    <div>
                      <Button type="button" variant="primary" onClick={applyNew} disabled={!panel.draft.name.trim()}>
                        Create &amp; add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div>
        <Button type="button" variant="accent" onClick={addSlot}>
          Add PCIe slot
        </Button>
      </div>
    </div>
  );
}

// Inline editor shown when the create-new card type is an NVMe riser: define its
// M.2 slot count + size and optionally the drives to create + mount on save.
function RiserDraftFields({
  draft,
  onChange,
}: {
  draft: PanelDraft;
  onChange: (patch: Partial<PanelDraft>) => void;
}) {
  const count = draft.m2SlotCount ? parseInt(draft.m2SlotCount, 10) : 0;
  const hasCount = Number.isFinite(count) && count > 0;
  const canAdd = !hasCount || draft.drives.length < count;
  const m2Sizes = PCI_SIZES.filter((s) => s.family === "M2");

  function setDrive(idx: number, patch: Partial<RiserDriveRow>) {
    onChange({
      drives: draft.drives.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border/70 bg-bg/30 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-text-dim">
        NVMe riser slots
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="M.2 slots" hint="How many M.2 slots this riser adds.">
          <TextInput
            type="number"
            min={1}
            placeholder="2"
            value={draft.m2SlotCount}
            onChange={(e) => onChange({ m2SlotCount: e.target.value })}
          />
        </Field>
        <Field label="M.2 slot size">
          <Select
            value={draft.m2SlotSize}
            onChange={(e) => onChange({ m2SlotSize: e.target.value })}
          >
            {m2Sizes.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-dim">
            NVMe drives (optional — created &amp; mounted into the riser on save)
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onChange({ drives: [...draft.drives, { name: "", capacityGB: "" }] })}
            disabled={!canAdd}
          >
            + Add drive
          </Button>
        </div>
        {draft.drives.length === 0 && (
          <p className="text-[11px] text-faint">
            None — you can also mount drives later from the riser&apos;s page.
          </p>
        )}
        {draft.drives.map((d, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
            <Field label={`Drive ${idx + 1} name`}>
              <TextInput
                placeholder='e.g. "Samsung 980 Pro"'
                value={d.name}
                onChange={(e) => setDrive(idx, { name: e.target.value })}
              />
            </Field>
            <Field label="Capacity (GB)">
              <TextInput
                type="number"
                min={1}
                value={d.capacityGB}
                onChange={(e) => setDrive(idx, { capacityGB: e.target.value })}
              />
            </Field>
            <button
              type="button"
              onClick={() => onChange({ drives: draft.drives.filter((_, i) => i !== idx) })}
              className="mb-1 shrink-0 px-2 text-faint hover:text-red-400"
              title="Remove drive"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
