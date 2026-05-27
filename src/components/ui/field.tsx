import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Tooltip } from "./tooltip";
import { Combobox } from "./combobox";

export function FieldSet({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <legend className="px-1.5 text-[9px] font-black uppercase tracking-wider text-accent">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-dim">
        <span>
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-accent">
              *
            </span>
          )}
        </span>
        {hint && <Tooltip text={hint} />}
      </span>
      {children}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}

const controlClasses =
  "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent";

export function TextInput({
  className = "",
  suggestions,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { suggestions?: string[] }) {
  // When suggestions are provided, render the custom Combobox so the
  // dropdown matches the UniFi look. Without suggestions, fall back to a
  // plain text input — no need to ship the Combobox JS for fields that
  // don't autocomplete.
  if (suggestions && suggestions.length > 0) {
    return (
      <Combobox
        suggestions={suggestions}
        className={className}
        {...props}
      />
    );
  }
  return (
    <input className={`${controlClasses} ${className}`} {...props} />
  );
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      className={`${controlClasses} resize-y ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${controlClasses} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function CheckboxField({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-text">
      <input type="checkbox" className="ui-checkbox cursor-pointer" {...props} />
      <span className="flex items-center gap-1.5">
        {label}
        {hint && <Tooltip text={hint} />}
      </span>
    </div>
  );
}
