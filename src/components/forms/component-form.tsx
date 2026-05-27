"use client";

import { useActionState, useState } from "react";
import { emptyFormState, type FormState } from "@/lib/form-state";
import {
  COMPONENT_TYPES,
  LIFECYCLE_STATES,
  PORT_TYPES,
  PORT_TYPE_LABELS,
  enumLabel,
} from "@/lib/enums";
import {
  CheckboxField,
  Field,
  FieldSet,
  Select,
  Textarea,
  TextInput,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

export type ComponentFormData = {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  specs: string;
  serialNumber: string;
  quantity: string;
  purchaseDate: string;
  purchasePrice: string;
  purchasedFrom: string;
  purchasedFromUrl: string;
  notes: string;
  imagePath: string;
  installedInId: string;
  // CPU
  speedGHz: string;
  cores: string;
  threads: string;
  socket: string;
  tdpWatts: string;
  // RAM
  capacityGB: string;
  speedMHz: string;
  generation: string;
  ecc: boolean;
  formFactor: string;
  // NIC_CARD
  portCount: string;
  portType: string;
  portSpeed: string;
  // RAID / PCIe / NIC shared
  cardInterface: string;
  // PSU
  wattsRating: string;
  modular: boolean;
  // Lifecycle
  state: string;
  soldDate: string;
  soldPrice: string;
};

type StringKey = {
  [K in keyof ComponentFormData]: ComponentFormData[K] extends string
    ? K
    : never;
}[keyof ComponentFormData];

const EMPTY: ComponentFormData = {
  id: "",
  name: "",
  type: "",
  manufacturer: "",
  model: "",
  specs: "",
  serialNumber: "",
  quantity: "1",
  purchaseDate: "",
  purchasePrice: "",
  purchasedFrom: "",
  purchasedFromUrl: "",
  notes: "",
  imagePath: "",
  installedInId: "",
  speedGHz: "",
  cores: "",
  threads: "",
  socket: "",
  tdpWatts: "",
  capacityGB: "",
  speedMHz: "",
  generation: "",
  ecc: false,
  formFactor: "",
  portCount: "",
  portType: "",
  portSpeed: "",
  cardInterface: "",
  wattsRating: "",
  modular: false,
  state: "IN_USE",
  soldDate: "",
  soldPrice: "",
};

type PrefillData = {
  installedInId?: string;
  type?: string;
  purchaseDate?: string;
  purchasedFrom?: string;
  purchasedFromUrl?: string;
  fromAssetPurchase?: boolean;
  fromAssetLabel?: string;
};

export function ComponentForm({
  action,
  component,
  hosts,
  submitLabel,
  prefill,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  component?: ComponentFormData;
  hosts: { id: string; codename: string }[];
  submitLabel: string;
  prefill?: PrefillData;
}) {
  const [state, formAction, isPending] = useActionState(action, emptyFormState);
  const base = component ?? EMPTY;
  // Merge prefill into base (only for new components — skip when editing)
  const data: ComponentFormData = component
    ? base
    : {
        ...base,
        ...(prefill?.installedInId && { installedInId: prefill.installedInId }),
        ...(prefill?.type && { type: prefill.type }),
        ...(prefill?.purchaseDate && { purchaseDate: prefill.purchaseDate }),
        ...(prefill?.purchasedFrom && { purchasedFrom: prefill.purchasedFrom }),
        ...(prefill?.purchasedFromUrl && {
          purchasedFromUrl: prefill.purchasedFromUrl,
        }),
      };
  const [type, setType] = useState(data.type);
  const [lifecycleState, setLifecycleState] = useState(data.state);
  const showSoldFields = lifecycleState === "SOLD" || lifecycleState === "JUNKED";
  const err = (name: string) => state.fieldErrors?.[name]?.[0];

  const isCpu = type === "CPU";
  const isRam = type === "RAM";
  const isNic = type === "NIC_CARD";
  const hasCardInterface =
    type === "RAID_CONTROLLER" || type === "PCIE_CARD" || type === "NIC_CARD";
  const isPsu = type === "POWER_SUPPLY";

  const field = (
    name: StringKey,
    label: string,
    inputType: "text" | "number" | "date" = "text",
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
        type={inputType}
        required={options.required}
        step={inputType === "number" ? "any" : undefined}
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

      <FieldSet legend="Type">
        <Field
          label="Type"
          htmlFor="type"
          required
          hint="Pick what kind of component this is — the rest of the form adapts."
          error={err("type")}
        >
          <Select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
          >
            <option value="">— Pick a type —</option>
            {COMPONENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {enumLabel(t)}
              </option>
            ))}
          </Select>
        </Field>
        {type === "" && (
          <p className="text-[11.5px] text-faint">
            Pick a type above to continue.
          </p>
        )}
      </FieldSet>

      {type !== "" && (
        <>
          <FieldSet legend="Component">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" htmlFor="name" required error={err("name")}>
                <TextInput
                  id="name"
                  name="name"
                  required
                  defaultValue={data.name}
                />
              </Field>
              {field("manufacturer", "Manufacturer")}
              {field("model", "Model")}
              {field("quantity", "Quantity", "number")}
              {field("serialNumber", "Serial number")}
            </div>
          </FieldSet>

          {isCpu && (
            <FieldSet legend="CPU details">
              <div className="grid grid-cols-2 gap-4">
                {field("speedGHz", "Speed (GHz)", "number")}
                {field("cores", "Cores", "number")}
                {field("threads", "Threads", "number")}
                {field("socket", "Socket", "text", {
                  hint: "e.g. LGA2011, AM4, SP3.",
                })}
                {field("tdpWatts", "TDP (W)", "number")}
              </div>
            </FieldSet>
          )}

          {isRam && (
            <FieldSet legend="RAM details">
              <div className="grid grid-cols-2 gap-4">
                {field("capacityGB", "Capacity (GB)", "number")}
                {field("speedMHz", "Speed (MHz)", "number")}
                <Field label="Generation" htmlFor="generation">
                  <Select
                    id="generation"
                    name="generation"
                    defaultValue={data.generation}
                  >
                    <option value="">— Unspecified —</option>
                    <option value="DDR3">DDR3</option>
                    <option value="DDR4">DDR4</option>
                    <option value="DDR5">DDR5</option>
                  </Select>
                </Field>
                <Field
                  label="Form factor"
                  htmlFor="formFactor"
                  hint='e.g. DIMM, SO-DIMM, RDIMM, LRDIMM, 2Rx4, 1Rx8.'
                >
                  <TextInput
                    id="formFactor"
                    name="formFactor"
                    defaultValue={data.formFactor}
                  />
                </Field>
              </div>
              <CheckboxField
                name="ecc"
                label="ECC"
                defaultChecked={data.ecc}
                hint="Error-correcting memory. Server / workstation RAM."
              />
            </FieldSet>
          )}

          {isNic && (
            <FieldSet legend="NIC card details">
              <div className="grid grid-cols-2 gap-4">
                {field("portCount", "Port count", "number")}
                <Field label="Port type" htmlFor="portType">
                  <Select
                    id="portType"
                    name="portType"
                    defaultValue={data.portType}
                  >
                    <option value="">— Unspecified —</option>
                    {PORT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {PORT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </Select>
                </Field>
                {field("portSpeed", "Port speed", "text", {
                  hint: 'e.g. "1G", "10G".',
                })}
              </div>
            </FieldSet>
          )}

          {hasCardInterface && (
            <FieldSet legend="Card interface">
              {field("cardInterface", "PCIe interface", "text", {
                hint: 'e.g. "PCIe 3.0 x8".',
              })}
            </FieldSet>
          )}

          {isPsu && (
            <FieldSet legend="Power supply details">
              <div className="grid grid-cols-2 gap-4">
                {field("wattsRating", "Wattage", "number")}
              </div>
              <CheckboxField
                name="modular"
                label="Modular cables"
                defaultChecked={data.modular}
              />
            </FieldSet>
          )}

          <FieldSet legend="Specs (free text)">
            <Field
              label="Specs"
              htmlFor="specs"
              hint="Anything not captured by the fields above."
            >
              <Textarea id="specs" name="specs" defaultValue={data.specs} />
            </Field>
          </FieldSet>

          <FieldSet legend="Acquisition">
            {prefill?.fromAssetPurchase && prefill.fromAssetLabel && (
              <p className="mb-3 rounded border border-accent/30 bg-accent/5 px-3 py-2 text-[12px] text-accent">
                Purchase date and source pre-filled from{" "}
                <span className="font-bold">{prefill.fromAssetLabel}</span>.
                Edit the fields below to change.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              {field("purchaseDate", "Purchase date", "date")}
              {field("purchasedFrom", "Purchased from")}
              {field("purchasedFromUrl", "Purchased from URL")}
              {field("purchasePrice", "Purchase price", "number")}
            </div>
          </FieldSet>

          <FieldSet legend="Image">
            <ImageUpload name="imagePath" defaultValue={data.imagePath} />
          </FieldSet>

          <FieldSet legend="Placement">
            <Field
              label="Installed in"
              htmlFor="installedInId"
              hint="The host asset this component is inside. Leave unset to keep it in storage."
            >
              <Select
                id="installedInId"
                name="installedInId"
                defaultValue={data.installedInId}
              >
                <option value="">— Not Installed (in storage) —</option>
                {hosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.codename}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldSet>

          <FieldSet legend="Notes">
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={data.notes} />
            </Field>
          </FieldSet>

          <FieldSet legend="Lifecycle">
            <div className="grid grid-cols-2 gap-4">
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
              {showSoldFields && (
                <>
                  <Field
                    label={lifecycleState === "JUNKED" ? "Disposal date" : "Sold date"}
                    htmlFor="soldDate"
                    required
                    error={err("soldDate")}
                  >
                    <TextInput
                      id="soldDate"
                      name="soldDate"
                      type="date"
                      defaultValue={data.soldDate}
                    />
                  </Field>
                  {lifecycleState === "SOLD" && (
                    <Field
                      label="Sold price"
                      htmlFor="soldPrice"
                      required
                      error={err("soldPrice")}
                    >
                      <TextInput
                        id="soldPrice"
                        name="soldPrice"
                        type="number"
                        step="any"
                        defaultValue={data.soldPrice}
                      />
                    </Field>
                  )}
                </>
              )}
            </div>
          </FieldSet>
        </>
      )}

      {type !== "" && (
        <div>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving…" : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
