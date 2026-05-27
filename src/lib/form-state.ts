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
