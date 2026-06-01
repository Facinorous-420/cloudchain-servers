"use client";

import { emptyFormState, mergedDefaults, type FormState } from "@/lib/form-state";
import { usePreservedForm } from "@/lib/use-preserved-form";
import { RENEWAL_PERIODS, RENEWAL_PERIOD_LABELS } from "@/lib/enums";
import {
  Field,
  FieldSet,
  Select,
  Textarea,
  TextInput,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

export type LicenseFormData = {
  id: string;
  name: string;
  type: string;
  licenseKey: string;
  seats: string;
  renewalPeriod: string;
  purchaseDate: string;
  cost: string;
  purchasedFrom: string;
  purchasedFromUrl: string;
  notes: string;
  imagePath: string;
  assignedAssetIds: string[];
};

type StringKey = keyof Omit<LicenseFormData, "assignedAssetIds">;

const EMPTY: LicenseFormData = {
  id: "",
  name: "",
  type: "",
  licenseKey: "",
  seats: "",
  renewalPeriod: "",
  purchaseDate: "",
  cost: "",
  purchasedFrom: "",
  purchasedFromUrl: "",
  notes: "",
  imagePath: "",
  assignedAssetIds: [],
};

export function LicenseForm({
  action,
  license,
  assets,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  license?: LicenseFormData;
  assets: { id: string; codename: string }[];
  submitLabel: string;
}) {
  const { state, formAction, isPending, submittedValues } = usePreservedForm(
    action,
    emptyFormState,
  );
  const data = mergedDefaults(license ?? EMPTY, submittedValues);
  const assigned = new Set(data.assignedAssetIds);
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

      <FieldSet legend="License">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" htmlFor="name" error={err("name")}>
            <TextInput id="name" name="name" required defaultValue={data.name} />
          </Field>
          {field("type", "Type")}
          {field("licenseKey", "License key")}
          {field("seats", "Seats", "number")}
          <Field
            label="Renewal period"
            htmlFor="renewalPeriod"
            error={err("renewalPeriod")}
          >
            <Select
              id="renewalPeriod"
              name="renewalPeriod"
              defaultValue={data.renewalPeriod}
            >
              <option value="">— None —</option>
              {RENEWAL_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {RENEWAL_PERIOD_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FieldSet>

      <FieldSet legend="Acquisition">
        <div className="grid grid-cols-2 gap-4">
          {field("purchaseDate", "Purchase date", "date")}
          {field("purchasedFrom", "Purchased from")}
          {field("purchasedFromUrl", "Purchased from URL")}
          {field("cost", "Cost", "number")}
        </div>
      </FieldSet>

      <FieldSet legend="Image">
        <ImageUpload name="imagePath" defaultValue={data.imagePath} />
      </FieldSet>

      <FieldSet legend="Assigned to assets">
        {assets.length === 0 ? (
          <p className="text-[11px] text-faint">
            No assets yet — create assets to assign this license to.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {assets.map((a) => (
              <label
                key={a.id}
                className="flex items-center gap-2.5 text-sm text-text"
              >
                <input
                  type="checkbox"
                  name="assetIds"
                  value={a.id}
                  defaultChecked={assigned.has(a.id)}
                  className="ui-checkbox"
                />
                {a.codename}
              </label>
            ))}
          </div>
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
