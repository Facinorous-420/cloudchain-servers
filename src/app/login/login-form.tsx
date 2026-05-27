"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";
import { Field, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Username" htmlFor="username">
        <TextInput
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {errorMessage && (
        <p className="text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={isPending}
        className="mt-1"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
