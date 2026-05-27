"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";

// UniFi-style combobox. Free-text input with an attached dropdown of past
// values (the `suggestions` array). Replaces the native <datalist>, which
// styles inconsistently across browsers and renders off-position. The
// dropdown is dark-themed to match the panel tokens.
//
// Always uncontrolled from the parent's perspective — the underlying
// <input name=...> carries the value into form submissions. Internal state
// just tracks what's typed so the filter / hover state work.

const inputClasses =
  "w-full rounded-md border border-border bg-bg px-3 py-2 pr-8 text-sm text-text outline-none focus:border-accent";

export type ComboboxProps = InputHTMLAttributes<HTMLInputElement> & {
  suggestions: string[];
};

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  function Combobox(
    {
      suggestions,
      defaultValue,
      value: controlledValue,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      className = "",
      ...rest
    },
    forwardedRef,
  ) {
    const isControlled = controlledValue !== undefined;
    const initial =
      (isControlled ? controlledValue : defaultValue) ?? "";
    const [internal, setInternal] = useState(String(initial));
    const current = isControlled ? String(controlledValue ?? "") : internal;

    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const setInputRef = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const filtered = useMemo(() => {
      const q = current.trim().toLowerCase();
      if (!q) return suggestions;
      return suggestions.filter(
        (s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q,
      );
    }, [current, suggestions]);

    useEffect(() => {
      if (!open) return;
      const onDown = (e: MouseEvent) => {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
          setHighlight(-1);
        }
      };
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    function commit(next: string) {
      if (!isControlled) setInternal(next);
      // Always write the native input value so FormData picks it up on submit,
      // regardless of whether an onChange prop was passed.
      if (inputRef.current) {
        const proto = window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        setter?.call(inputRef.current, next);
        const event = new Event("input", { bubbles: true });
        inputRef.current.dispatchEvent(event);
      }
    }

    function pick(value: string) {
      commit(value);
      setOpen(false);
      setHighlight(-1);
      inputRef.current?.focus();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (e.key === "Escape") {
        if (open) {
          e.stopPropagation();
          setOpen(false);
          setHighlight(-1);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlight(0);
        } else if (filtered.length > 0) {
          setHighlight((i) =>
            i + 1 >= filtered.length ? 0 : i + 1,
          );
        }
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setHighlight(filtered.length - 1);
        } else if (filtered.length > 0) {
          setHighlight((i) =>
            i - 1 < 0 ? filtered.length - 1 : i - 1,
          );
        }
        return;
      }
      if (e.key === "Enter" && open && highlight >= 0 && filtered[highlight]) {
        e.preventDefault();
        pick(filtered[highlight]);
      }
    }

    return (
      <div ref={wrapperRef} className="relative">
        <input
          ref={setInputRef}
          {...rest}
          autoComplete="off"
          value={isControlled ? controlledValue : undefined}
          defaultValue={isControlled ? undefined : defaultValue}
          className={`${inputClasses} ${className}`}
          onChange={(e) => {
            if (!isControlled) setInternal(e.target.value);
            onChange?.(e);
            if (!open) setOpen(true);
            setHighlight(-1);
          }}
          onFocus={(e) => {
            setOpen(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            onBlur?.(e);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show suggestions"
          onMouseDown={(e) => {
            // Prevent the input from losing focus on chevron click.
            e.preventDefault();
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-text-dim hover:text-text"
        >
          <svg
            viewBox="0 0 12 12"
            width="10"
            height="10"
            aria-hidden
            fill="currentColor"
          >
            <path d={open ? "M2 8L6 4L10 8Z" : "M2 4L6 8L10 4Z"} />
          </svg>
        </button>
        {open && filtered.length > 0 && (
          <div
            role="listbox"
            className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-panel shadow-xl"
          >
            {filtered.map((s, i) => {
              const active = i === highlight;
              const selected =
                s.toLowerCase() === current.trim().toLowerCase();
              return (
                <button
                  type="button"
                  key={s}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    // Prevent blur before click registers.
                    e.preventDefault();
                  }}
                  onClick={() => pick(s)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] ${
                    active
                      ? "bg-accent/15 text-text"
                      : "text-text hover:bg-panel-2"
                  }`}
                >
                  <span>{s}</span>
                  {selected && (
                    <span aria-hidden className="text-accent">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);
