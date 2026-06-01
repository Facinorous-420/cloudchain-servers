"use client";

import { useState } from "react";
import { emptyFormState, mergedDefaults, type FormState } from "@/lib/form-state";
import { usePreservedForm } from "@/lib/use-preserved-form";
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

export type BatteryFormData = {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  voltage: string;
  capacityAh: string;
  quantity: string;
  installDate: string;
  purchaseDate: string;
  purchasePrice: string;
  purchasedFrom: string;
  purchasedFromUrl: string;
  state: string;
  soldDate: string;
  soldPrice: string;
  notes: string;
  imagePath: string;
  installedInId: string;
  storageId: string;
};

type StringKey = keyof BatteryFormData;

const EMPTY: BatteryFormData = {
  id: "",
  name: "",
  manufacturer: "",
  model: "",
  voltage: "",
  capacityAh: "",
  quantity: "1",
  installDate: "",
  purchaseDate: "",
  purchasePrice: "",
  purchasedFrom: "",
  purchasedFromUrl: "",
  state: "IN_USE",
  soldDate: "",
  soldPrice: "",
  notes: "",
  imagePath: "",
  installedInId: "",
  storageId: "",
};

export function BatteryForm({
  action,
  battery,
  hosts,
  storages,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  battery?: BatteryFormData;
  hosts: { id: string; codename: string }[];
  storages: { id: string; name: string }[];
  submitLabel: string;
}) {
  const { state, formAction, isPending, submittedValues } = usePreservedForm(
    action,
    emptyFormState,
  );
  const data = mergedDefaults(battery ?? EMPTY, submittedValues);
  const [lifecycleState, setLifecycleState] = useState(data.state);
  const showSoldFields = lifecycleState === "SOLD" || lifecycleState === "JUNKED";
  const err = (name: string) => state.fieldErrors?.[name]?.[0];

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

      <FieldSet legend="Battery">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" htmlFor="name" required error={err("name")}>
            <TextInput id="name" name="name" required defaultValue={data.name} />
          </Field>
          {field("manufacturer", "Manufacturer")}
          {field("model", "Model")}
          {field("quantity", "Quantity", "number")}
          {field("voltage", "Voltage (V)", "number")}
          {field("capacityAh", "Capacity (Ah)", "number")}
        </div>
      </FieldSet>

      <FieldSet legend="Acquisition">
        <div className="grid grid-cols-2 gap-4">
          {field("installDate", "Install date", "date")}
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
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Installed in"
            htmlFor="installedInId"
            hint="The UPS this battery is inside. Leave unset if not installed."
          >
            <Select
              id="installedInId"
              name="installedInId"
              defaultValue={data.installedInId}
            >
              <option value="">— Not Installed —</option>
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.codename}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Storage location"
            htmlFor="storageId"
            hint="Which off-rack bin this battery is stored in."
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
        </div>
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
