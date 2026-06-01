"use client";

import { emptyFormState, mergedDefaults, type FormState } from "@/lib/form-state";
import { usePreservedForm } from "@/lib/use-preserved-form";
import type { Suggestions } from "@/lib/suggestions";
import {
  CheckboxField,
  Field,
  FieldSet,
  Textarea,
  TextInput,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

export type RackFormData = {
  id: string;
  name: string;
  totalU: string;
  columnCount: string;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  condition: string;
  purchaseDate: string;
  purchasePrice: string;
  purchasedFrom: string;
  purchasedFromUrl: string;
  inUse: boolean;
  notes: string;
  imagePath: string;
};

type StringKey = {
  [K in keyof RackFormData]: RackFormData[K] extends string ? K : never;
}[keyof RackFormData];

const EMPTY: RackFormData = {
  id: "",
  name: "",
  totalU: "25",
  columnCount: "6",
  manufacturer: "",
  modelNumber: "",
  serialNumber: "",
  condition: "",
  purchaseDate: "",
  purchasePrice: "",
  purchasedFrom: "",
  purchasedFromUrl: "",
  inUse: true,
  notes: "",
  imagePath: "",
};

export function RackForm({
  action,
  rack,
  suggestions,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  rack?: RackFormData;
  suggestions: Suggestions;
  submitLabel: string;
}) {
  const { state, formAction, isPending, submittedValues } = usePreservedForm(
    action,
    emptyFormState,
  );
  const data = mergedDefaults(rack ?? EMPTY, submittedValues);
  const err = (n: string) => state.fieldErrors?.[n]?.[0];

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

      <FieldSet legend="Identity">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" htmlFor="name" required error={err("name")}>
            <TextInput id="name" name="name" required defaultValue={data.name} />
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
          <Field label="Condition" htmlFor="condition">
            <TextInput
              id="condition"
              name="condition"
              defaultValue={data.condition}
              suggestions={suggestions.conditions}
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet legend="Dimensions">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Total U"
            htmlFor="totalU"
            required
            hint="How many rack units (slots) this rack has."
            error={err("totalU")}
          >
            <TextInput
              id="totalU"
              name="totalU"
              type="number"
              min={1}
              required
              defaultValue={data.totalU}
            />
          </Field>
          <Field
            label="Column count"
            htmlFor="columnCount"
            hint="Grid columns for placing towers side-by-side. Default 6."
            error={err("columnCount")}
          >
            <TextInput
              id="columnCount"
              name="columnCount"
              type="number"
              min={1}
              defaultValue={data.columnCount}
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet legend="Acquisition">
        <div className="grid grid-cols-2 gap-4">
          {field("purchaseDate", "Purchase date", "date")}
          {field("purchasePrice", "Purchase price", "number")}
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
        </div>
        <CheckboxField
          name="inUse"
          label="In use"
          defaultChecked={data.inUse}
          hint="Uncheck for retired or spare racks."
        />
      </FieldSet>

      <FieldSet legend="Image">
        <ImageUpload name="imagePath" defaultValue={data.imagePath} />
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
