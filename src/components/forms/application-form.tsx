"use client";

import { useActionState } from "react";
import { emptyFormState, type FormState } from "@/lib/form-state";
import {
  Field,
  FieldSet,
  Select,
  Textarea,
  TextInput,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { APP_TYPES, enumLabel } from "@/lib/enums";

export type ApplicationFormData = {
  id: string;
  name: string;
  type: string;
  hostId: string;
  operatingSystem: string;
  status: string;
  notes: string;
  imagePath: string;
};

const EMPTY: ApplicationFormData = {
  id: "",
  name: "",
  type: "SERVICE",
  hostId: "",
  operatingSystem: "",
  status: "",
  notes: "",
  imagePath: "",
};

export function ApplicationForm({
  action,
  application,
  hosts,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  application?: ApplicationFormData;
  hosts: { id: string; codename: string }[];
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, emptyFormState);
  const data = application ?? EMPTY;
  const err = (name: string) => state.fieldErrors?.[name]?.[0];

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

      <FieldSet legend="Application">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" htmlFor="name" required error={err("name")}>
            <TextInput
              id="name"
              name="name"
              required
              defaultValue={data.name}
            />
          </Field>
          <Field label="Type" htmlFor="type" required error={err("type")}>
            <Select id="type" name="type" defaultValue={data.type}>
              {APP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {enumLabel(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Host"
            htmlFor="hostId"
            required
            error={err("hostId")}
            hint="The server this runs on. Required."
          >
            <Select id="hostId" name="hostId" defaultValue={data.hostId} required>
              <option value="">— Pick a host —</option>
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.codename}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Operating system" htmlFor="operatingSystem">
            <TextInput
              id="operatingSystem"
              name="operatingSystem"
              defaultValue={data.operatingSystem}
            />
          </Field>
          <Field
            label="Status"
            htmlFor="status"
            hint="Free text — e.g. running, stopped, planned."
          >
            <TextInput
              id="status"
              name="status"
              defaultValue={data.status}
            />
          </Field>
        </div>
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
