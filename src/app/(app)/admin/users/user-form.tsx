"use client";

import { useActionState } from "react";
import { Field, FieldSet, TextInput, Select } from "@/components/ui/field";
import { Button, LinkButton } from "@/components/ui/button";
import { emptyFormState, type FormState } from "@/lib/form-state";
import type { Role } from "@/generated/prisma";

type DefaultValues = {
  username: string;
  displayName: string;
  role: Role;
};

export function UserForm({
  action,
  submitLabel,
  defaultValues,
  isInitialAdmin = false,
  isEdit = false,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  defaultValues?: DefaultValues;
  isInitialAdmin?: boolean;
  isEdit?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <FieldSet legend="Account">
        <Field
          label="Username"
          htmlFor="username"
          required
          error={state.fieldErrors?.username?.[0]}
        >
          <TextInput
            id="username"
            name="username"
            autoComplete="off"
            defaultValue={defaultValues?.username}
          />
        </Field>

        <Field
          label="Display name"
          htmlFor="displayName"
          error={state.fieldErrors?.displayName?.[0]}
        >
          <TextInput
            id="displayName"
            name="displayName"
            autoComplete="off"
            defaultValue={defaultValues?.displayName}
          />
        </Field>

        <Field
          label="Role"
          htmlFor="role"
          error={state.fieldErrors?.role?.[0]}
        >
          {/* Disabled selects are not submitted by the browser; send the
              value via a hidden input so the server action always gets it. */}
          {isInitialAdmin && (
            <input type="hidden" name="role" value={defaultValues?.role ?? "ADMIN"} />
          )}
          <Select
            id="role"
            name="role"
            defaultValue={defaultValues?.role ?? "MEMBER"}
            disabled={isInitialAdmin}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="MEMBER">MEMBER</option>
          </Select>
          {isInitialAdmin && (
            <p className="text-xs text-text-dim">
              The initial admin account cannot be demoted.
            </p>
          )}
        </Field>
      </FieldSet>

      <FieldSet legend={isEdit ? "Change password (leave blank to keep current)" : "Password"}>
        <Field
          label="Password"
          htmlFor="password"
          required={!isEdit}
          hint={isEdit ? "Leave blank to keep the current password" : undefined}
          error={state.fieldErrors?.password?.[0]}
        >
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
          />
        </Field>
      </FieldSet>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <LinkButton href="/admin/users">Cancel</LinkButton>
      </div>
    </form>
  );
}
