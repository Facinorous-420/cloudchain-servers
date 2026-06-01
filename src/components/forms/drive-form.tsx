"use client";

import { useState, useMemo } from "react";
import { emptyFormState, mergedDefaults, type FormState } from "@/lib/form-state";
import { usePreservedForm } from "@/lib/use-preserved-form";
import { DRIVE_KINDS, DRIVE_SIZES } from "@/lib/enums";
import { LIFECYCLE_STATES, enumLabel } from "@/lib/enums";
import {
  Field,
  FieldSet,
  Select,
  Textarea,
  TextInput,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

export type DriveFormData = {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  kind: string;
  size: string;
  capacityGB: string;
  serialNumber: string;
  manufactureDate: string;
  purchaseDate: string;
  purchasePrice: string;
  purchasedFrom: string;
  purchasedFromUrl: string;
  condition: string;
  assignedUse: string;
  state: string;
  soldDate: string;
  soldPrice: string;
  notes: string;
  imagePath: string;
  installedInId: string;
  bayZoneId: string;
  bayNumber: string;
};

export type DriveHostOption = {
  id: string;
  codename: string;
  bayZones: {
    id: string;
    name: string;
    driveSize: string;
    bayCount: number;
    occupiedBays: number[];
  }[];
};

type StringKey = keyof Omit<DriveFormData, never>;

const EMPTY: DriveFormData = {
  id: "",
  name: "",
  manufacturer: "",
  model: "",
  kind: "HDD",
  size: "SFF",
  capacityGB: "",
  serialNumber: "",
  manufactureDate: "",
  purchaseDate: "",
  purchasePrice: "",
  purchasedFrom: "",
  purchasedFromUrl: "",
  condition: "",
  assignedUse: "",
  state: "IN_USE",
  soldDate: "",
  soldPrice: "",
  notes: "",
  imagePath: "",
  installedInId: "",
  bayZoneId: "",
  bayNumber: "",
};

function zoneHasRoom(zone: DriveHostOption["bayZones"][number]): boolean {
  return zone.occupiedBays.length < zone.bayCount;
}

type DrivePrefill = {
  purchaseDate?: string;
  purchasedFrom?: string;
  purchasedFromUrl?: string;
  fromAssetLabel?: string;
};

export function DriveForm({
  action,
  drive,
  hosts,
  submitLabel,
  prefill,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  drive?: DriveFormData;
  hosts: DriveHostOption[];
  submitLabel: string;
  prefill?: DrivePrefill;
}) {
  const { state, formAction, isPending, submittedValues } = usePreservedForm(
    action,
    emptyFormState,
  );
  const base = drive ?? EMPTY;
  const baseData: DriveFormData = drive
    ? base
    : {
        ...base,
        ...(prefill?.purchaseDate && { purchaseDate: prefill.purchaseDate }),
        ...(prefill?.purchasedFrom && { purchasedFrom: prefill.purchasedFrom }),
        ...(prefill?.purchasedFromUrl && {
          purchasedFromUrl: prefill.purchasedFromUrl,
        }),
      };
  // Restore user-entered values after a validation error (React resets the form).
  const data = mergedDefaults(baseData, submittedValues);
  const [lifecycleState, setLifecycleState] = useState(data.state);
  const showSoldFields = lifecycleState === "SOLD" || lifecycleState === "JUNKED";
  const [size, setSize] = useState(data.size);
  const [installedInId, setInstalledInId] = useState(data.installedInId);
  const [bayZoneId, setBayZoneId] = useState(data.bayZoneId);
  const [bayNumber, setBayNumber] = useState(data.bayNumber);
  const err = (name: string) => state.fieldErrors?.[name]?.[0];

  // Hosts with at least one matching-size bay that still has room.
  const compatibleHosts = hosts.filter((h) =>
    h.bayZones.some((z) => z.driveSize === size && zoneHasRoom(z)),
  );
  const host = compatibleHosts.find((h) => h.id === installedInId);
  const zones =
    host?.bayZones.filter((z) => z.driveSize === size && zoneHasRoom(z)) ?? [];
  const selectedZone = zones.find((z) => z.id === bayZoneId);
  const availableBays = selectedZone
    ? Array.from({ length: selectedZone.bayCount }, (_, i) => i + 1).filter(
        (n) => !selectedZone.occupiedBays.includes(n),
      )
    : [];

  // If the user switches drive size and the previously-picked host/zone no
  // longer matches, reset the placement.
  function handleSizeChange(newSize: string) {
    setSize(newSize);
    if (
      installedInId &&
      !hosts.some((h) =>
        h.id === installedInId &&
        h.bayZones.some((z) => z.driveSize === newSize && zoneHasRoom(z)),
      )
    ) {
      setInstalledInId("");
      setBayZoneId("");
      setBayNumber("");
    }
  }

  const field = (
    name: StringKey,
    label: string,
    type: "text" | "number" | "date" = "text",
  ) => (
    <Field label={label} htmlFor={name} error={err(name)}>
      <TextInput
        id={name}
        name={name}
        type={type}
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

      <FieldSet legend="Drive">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" htmlFor="name" required error={err("name")}>
            <TextInput id="name" name="name" required defaultValue={data.name} />
          </Field>
          <Field label="Kind" htmlFor="kind" required error={err("kind")}>
            <Select id="kind" name="kind" defaultValue={data.kind}>
              {DRIVE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Size"
            htmlFor="size"
            required
            hint="Physical form factor. Must match the bay zone the drive is installed in."
            error={err("size")}
          >
            <Select
              id="size"
              name="size"
              value={size}
              onChange={(e) => handleSizeChange(e.target.value)}
            >
              {DRIVE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          {field("capacityGB", "Capacity (GB)", "number")}
          {field("manufacturer", "Manufacturer")}
          {field("model", "Model")}
          {field("serialNumber", "Serial number")}
          {field("condition", "Condition")}
          <Field
            label="Assigned use"
            htmlFor="assignedUse"
            hint="What this drive is FOR (Unraid array, OS mirror). Separate from where it's physically installed."
          >
            <TextInput
              id="assignedUse"
              name="assignedUse"
              defaultValue={data.assignedUse}
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet legend="Acquisition">
        {prefill?.fromAssetLabel && !drive && (
          <p className="mb-3 rounded border border-accent/30 bg-accent/5 px-3 py-2 text-[12px] text-accent">
            Purchase date and source pre-filled from{" "}
            <span className="font-bold">{prefill.fromAssetLabel}</span>.
            Edit the fields below to change.
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          {field("manufactureDate", "Manufacture date", "date")}
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
          hint="Only hosts with a matching-size bay zone that still has free bays are listed."
          error={err("installedInId")}
        >
          <Select
            id="installedInId"
            name="installedInId"
            value={installedInId}
            onChange={(e) => {
              setInstalledInId(e.target.value);
              setBayZoneId("");
              setBayNumber("");
            }}
          >
            <option value="">— Not Installed (in storage) —</option>
            {compatibleHosts.map((h) => (
              <option key={h.id} value={h.id}>
                {h.codename}
              </option>
            ))}
          </Select>
        </Field>
        {installedInId && (
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Bay zone"
              htmlFor="bayZoneId"
              required
              error={err("bayZoneId")}
            >
              <Select
                id="bayZoneId"
                name="bayZoneId"
                value={bayZoneId}
                onChange={(e) => {
                  setBayZoneId(e.target.value);
                  setBayNumber("");
                }}
              >
                <option value="">— Select a zone —</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.bayCount - z.occupiedBays.length} of{" "}
                    {z.bayCount} free)
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Bay number"
              htmlFor="bayNumber"
              required
              error={err("bayNumber")}
            >
              <Select
                id="bayNumber"
                name="bayNumber"
                value={bayNumber}
                onChange={(e) => setBayNumber(e.target.value)}
                disabled={!selectedZone}
              >
                <option value="">— Select a bay —</option>
                {availableBays.map((n) => (
                  <option key={n} value={n}>
                    Bay {n}
                  </option>
                ))}
              </Select>
            </Field>
            {zones.length === 0 && (
              <p className="col-span-2 text-[11px] text-faint">
                The selected host has no matching-size bay zones with free
                bays. Add zones on the asset first.
              </p>
            )}
          </div>
        )}
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
