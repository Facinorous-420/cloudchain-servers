"use client";

import { emptyFormState, mergedDefaults, type FormState } from "@/lib/form-state";
import { usePreservedForm } from "@/lib/use-preserved-form";
import { Field, FieldSet, Textarea, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

export type StorageFormData = {
  id: string;
  name: string;
  notes: string;
  imagePath: string;
};

const EMPTY: StorageFormData = { id: "", name: "", notes: "", imagePath: "" };

export function StorageForm({
  action,
  storage,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  storage?: StorageFormData;
  submitLabel: string;
}) {
  const { state, formAction, isPending, submittedValues } = usePreservedForm(
    action,
    emptyFormState,
  );
  const data = mergedDefaults(storage ?? EMPTY, submittedValues);
  const err = (n: string) => state.fieldErrors?.[n]?.[0];

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-5">
      {state.error && (
        <p
          className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <FieldSet legend="Storage">
        <Field
          label="Name"
          htmlFor="name"
          required
          hint="A name for this off-rack container — e.g. Box 1, Shelf A, Desk drawer."
          error={err("name")}
        >
          <TextInput id="name" name="name" required defaultValue={data.name} />
        </Field>
        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" name="notes" defaultValue={data.notes} />
        </Field>
      </FieldSet>

      <FieldSet legend="Image">
        <ImageUpload name="imagePath" defaultValue={data.imagePath} />
      </FieldSet>

      <div>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
