"use client";

import { useActionState, useState } from "react";
import { Field, FieldSet, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { emptyFormState, type FormState } from "@/lib/form-state";
import { ACCENT_COLOR_SWATCHES } from "@/lib/schemas/app-settings";
import {
  PORT_COLOR_GROUPS,
  PORT_LABEL_TYPES,
  CATEGORY_COLOR_GROUPS,
  DEFAULT_PORT_TYPE_COLORS,
  DEFAULT_PORT_TYPE_LABELS,
  DEFAULT_CATEGORY_COLORS,
} from "@/lib/diagram-settings";
import { saveSettings, resetDiagramColors } from "./actions";

// ── Shared colour swatch + hex input ─────────────────────────────────────────

function ColorRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
          title="Pick a colour"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[12px] font-medium text-text">{label}</span>
        {description && (
          <span className="text-[10px] text-faint">{description}</span>
        )}
      </div>
      <input
        type="text"
        value={value}
        maxLength={7}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
        }}
        className="w-24 rounded-md border border-border bg-bg px-2 py-1 font-mono text-[12px] text-text outline-none focus:border-accent"
      />
    </div>
  );
}

// ── Main form ────────────────────────────────────────────────────────────────

export function SettingsForm({
  defaultValues,
}: {
  defaultValues: {
    appName: string;
    appDescription: string;
    accentColor: string;
    serviceLoopLengthInches: number;
    portTypeColors: Record<string, string>;
    portTypeLabels: Record<string, string>;
    categoryColors: Record<string, string>;
  };
}) {
  const [state, formAction, pending] = useActionState(saveSettings, emptyFormState);
  const [resetState, resetAction, resetPending] = useActionState(resetDiagramColors, emptyFormState);

  const [accentColor, setAccentColor] = useState(defaultValues.accentColor);
  const [portColors, setPortColors] = useState<Record<string, string>>(
    defaultValues.portTypeColors,
  );
  const [portLabels, setPortLabels] = useState<Record<string, string>>(
    defaultValues.portTypeLabels,
  );
  const [catColors, setCatColors] = useState<Record<string, string>>(
    defaultValues.categoryColors,
  );

  function setPortColor(key: string, val: string) {
    setPortColors((prev) => ({ ...prev, [key]: val }));
  }
  function setPortLabel(type: string, val: string) {
    setPortLabels((prev) => ({ ...prev, [type]: val }));
  }
  function setCatColor(key: string, val: string) {
    setCatColors((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Save form ─────────────────────────────────────────────────── */}
      <form action={formAction} className="flex flex-col gap-4">
        {state.error && (
          <p className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-400">
            {state.error}
          </p>
        )}

        {/* Hidden serialised diagram settings */}
        <input type="hidden" name="portTypeColors" value={JSON.stringify(portColors)} />
        <input type="hidden" name="portTypeLabels" value={JSON.stringify(portLabels)} />
        <input type="hidden" name="categoryColors" value={JSON.stringify(catColors)} />

        <FieldSet legend="General">
          <Field
            label="App name"
            htmlFor="appName"
            hint="Displayed in the top bar, browser title, and login screen."
            error={state.fieldErrors?.appName?.[0]}
          >
            <TextInput
              id="appName"
              name="appName"
              defaultValue={defaultValues.appName}
              placeholder="Cloudchain Inventory"
              className="w-80"
            />
          </Field>
          <Field
            label="App description"
            htmlFor="appDescription"
            hint="Short tagline shown on the login screen. Optional."
            error={state.fieldErrors?.appDescription?.[0]}
          >
            <TextInput
              id="appDescription"
              name="appDescription"
              defaultValue={defaultValues.appDescription}
              placeholder="Homelab server rack inventory and documentation"
              className="w-full max-w-md"
            />
          </Field>
        </FieldSet>

        <FieldSet legend="Appearance">
          <Field
            label="Accent colour"
            htmlFor="accentColor"
            error={state.fieldErrors?.accentColor?.[0]}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    title={swatch}
                    onClick={() => setAccentColor(swatch)}
                    style={{ backgroundColor: swatch }}
                    className={`h-7 w-7 rounded-md border-2 transition-all hover:scale-110 ${
                      accentColor === swatch
                        ? "border-text scale-110"
                        : "border-border hover:border-text"
                    }`}
                  />
                ))}
              </div>
              <input
                id="accentColor"
                name="accentColor"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#00a8c6"
                className="w-36 rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-text outline-none focus:border-accent"
              />
            </div>
          </Field>
        </FieldSet>

        <FieldSet legend="Cable routing">
          <Field
            label="Service loop length (inches)"
            htmlFor="serviceLoopLengthInches"
            hint="Extra slack added to each cable run for future moves."
            error={state.fieldErrors?.serviceLoopLengthInches?.[0]}
          >
            <TextInput
              id="serviceLoopLengthInches"
              name="serviceLoopLengthInches"
              type="number"
              min={1}
              defaultValue={defaultValues.serviceLoopLengthInches}
              className="w-24"
            />
          </Field>
        </FieldSet>

        {/* ── Diagram: port colours ──────────────────────────────────── */}
        <FieldSet legend="Diagram — port colours">
          <p className="text-[11px] text-text-dim">
            Controls the colour of connected port squares in the rack diagram and inspector panel.
          </p>
          <div className="flex flex-col gap-2.5">
            {PORT_COLOR_GROUPS.map((g) => (
              <ColorRow
                key={g.key}
                label={g.label}
                description={`Applies to: ${g.types.join(", ")}`}
                value={portColors[g.key] ?? DEFAULT_PORT_TYPE_COLORS[g.key]}
                onChange={(v) => setPortColor(g.key, v)}
              />
            ))}
          </div>
        </FieldSet>

        {/* ── Diagram: port labels ───────────────────────────────────── */}
        <FieldSet legend="Diagram — port labels">
          <p className="text-[11px] text-text-dim">
            Short text shown inside port squares (max 4 characters).
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
            {PORT_LABEL_TYPES.map(({ type, description }) => (
              <div key={type} className="flex items-center gap-2">
                <span className="min-w-22.5 text-[11px] text-text-dim">
                  {description}
                </span>
                <input
                  type="text"
                  value={portLabels[type] ?? DEFAULT_PORT_TYPE_LABELS[type]}
                  maxLength={4}
                  onChange={(e) => setPortLabel(type, e.target.value)}
                  className="w-14 rounded-md border border-border bg-bg px-2 py-1 font-mono text-[12px] text-text outline-none focus:border-accent"
                  placeholder={DEFAULT_PORT_TYPE_LABELS[type]}
                />
              </div>
            ))}
          </div>
        </FieldSet>

        {/* ── Diagram: category colours ─────────────────────────────── */}
        <FieldSet legend="Diagram — category colours">
          <p className="text-[11px] text-text-dim">
            Controls the accent colour for each asset category in the rack diagram.
          </p>
          <div className="flex flex-col gap-2.5">
            {CATEGORY_COLOR_GROUPS.map((g) => (
              <ColorRow
                key={g.key}
                label={g.label}
                description={`Applies to: ${g.categories.join(", ")}`}
                value={catColors[g.key] ?? DEFAULT_CATEGORY_COLORS[g.key]}
                onChange={(v) => setCatColor(g.key, v)}
              />
            ))}
          </div>
        </FieldSet>

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>

      {/* ── Reset diagram colours (separate form / action) ─────────── */}
      <div className="rounded-md border border-border bg-panel-2 p-4">
        <p className="text-[12px] font-semibold text-text">Reset diagram colours &amp; labels</p>
        <p className="mt-0.5 text-[11px] text-text-dim">
          Clears all port colour, port label, and category colour overrides — restoring built-in defaults.
        </p>
        {resetState.error && (
          <p className="mt-2 text-[11px] text-red-400">{resetState.error}</p>
        )}
        <form action={resetAction} className="mt-3">
          <button
            type="submit"
            disabled={resetPending}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text-dim transition-colors hover:border-red-400/60 hover:text-red-400 disabled:opacity-50"
          >
            {resetPending ? "Resetting…" : "Reset to defaults"}
          </button>
        </form>
      </div>
    </div>
  );
}
