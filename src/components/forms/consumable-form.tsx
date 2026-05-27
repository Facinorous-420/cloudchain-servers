"use client";

import { useActionState, useState } from "react";
import { emptyFormState, type FormState } from "@/lib/form-state";
import { LIFECYCLE_STATES, enumLabel } from "@/lib/enums";
import { Field, FieldSet, Select, Textarea, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

export type ConsumableFormData = {
  id: string;
  name: string;
  type: string;
  quantity: string;
  location: string;
  purchaseDate: string;
  purchasePrice: string;
  purchasedFrom: string;
  purchasedFromUrl: string;
  state: string;
  notes: string;
  imagePath: string;
};

type StringKey = keyof ConsumableFormData;

const EMPTY: ConsumableFormData = {
  id: "",
  name: "",
  type: "",
  quantity: "1",
  location: "",
  purchaseDate: "",
  purchasePrice: "",
  purchasedFrom: "",
  purchasedFromUrl: "",
  state: "IN_USE",
  notes: "",
  imagePath: "",
};

export function ConsumableForm({
  action,
  consumable,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  consumable?: ConsumableFormData;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, emptyFormState);
  const data = consumable ?? EMPTY;
  const [lifecycleState, setLifecycleState] = useState(data.state);
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

      <FieldSet legend="Consumable">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" htmlFor="name" error={err("name")}>
            <TextInput id="name" name="name" required defaultValue={data.name} />
          </Field>
          {field("type", "Type")}
          {field("quantity", "Quantity", "number")}
          {field("location", "Location")}
        </div>
      </FieldSet>

      <FieldSet legend="Acquisition">
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

      <FieldSet legend="Lifecycle">
        <Field label="State" htmlFor="state" error={err("state")}>
          <Select
            id="state"
            name="state"
            value={lifecycleState}
            onChange={(e) => setLifecycleState(e.target.value)}
          >
            {LIFECYCLE_STATES.map((s) => (
              <option key={s} value={s}>
                {enumLabel(s)}
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

      <div>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
