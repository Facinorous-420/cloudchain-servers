// Shared shape for server-action results consumed by useActionState in forms.

export type CascadeConfirmRequired = {
  assetId: string;
  newState: "SOLD" | "JUNKED";
  drivesCount: number;
  componentsCount: number;
  pciCardCount: number;
  batteriesCount: number;
};

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // Returned by updateAsset when the asset is transitioning to SOLD/JUNKED
  // and there are nested items that may also need marking.
  confirmCascade?: CascadeConfirmRequired;
};

export const emptyFormState: FormState = {};

/**
 * Merge the user's last-submitted form values (all strings, from FormData) over
 * a form's initial data, preserving the data object's field types. Only string
 * and boolean fields are overridden; arrays/objects (inline editors, which keep
 * their own React state) are left untouched. Paired with `usePreservedForm` so a
 * validation error doesn't discard the user's other edits when React resets the
 * form. Unchecked checkboxes are absent from FormData, so an unchecked box falls
 * back to its initial value (acceptable; a *checked* box is always preserved).
 */
export function mergedDefaults<T extends Record<string, unknown>>(
  initial: T,
  values: Record<string, FormDataEntryValue> | null | undefined,
): T {
  if (!values) return initial;
  const out: Record<string, unknown> = { ...initial };
  for (const key of Object.keys(initial)) {
    if (!(key in values)) continue;
    const submitted = values[key];
    if (typeof submitted !== "string") continue; // skip File entries
    const current = initial[key];
    if (typeof current === "boolean") {
      out[key] = submitted === "on" || submitted === "true";
    } else if (typeof current === "string") {
      out[key] = submitted;
    }
    // arrays/objects untouched — their editor components own their state
  }
  return out as T;
}
