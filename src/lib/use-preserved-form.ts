"use client";

import { useActionState, useCallback, useState } from "react";
import type { FormState } from "./form-state";

/**
 * Wraps useActionState and captures the values the user just submitted.
 *
 * React 19 automatically resets a <form action={fn}> after its action runs.
 * On a validation error that means every uncontrolled input snaps back to its
 * `defaultValue` — discarding the user's other edits. Callers merge the
 * returned `submittedValues` over their initial data (see `mergedDefaults`) and
 * feed that to `defaultValue`, so the reset restores what the user typed.
 *
 * On a successful submit the action redirects (throws), so the capture line is
 * never reached and there is nothing to restore.
 */
export function usePreservedForm(
  action: (prev: FormState, formData: FormData) => Promise<FormState>,
  initialState: FormState,
) {
  const [submittedValues, setSubmittedValues] = useState<Record<
    string,
    FormDataEntryValue
  > | null>(null);

  const wrapped = useCallback(
    async (prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await action(prev, formData);
      setSubmittedValues(Object.fromEntries(formData));
      return result;
    },
    [action],
  );

  const [state, formAction, isPending] = useActionState(wrapped, initialState);
  return { state, formAction, isPending, submittedValues };
}
