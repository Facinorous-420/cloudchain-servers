/**
 * Default colours and labels for the rack diagram.
 * Admin › Settings allows overriding these; overrides are stored as JSON in
 * AppSettings.portTypeColors / portTypeLabels / categoryColors and injected as
 * CSS custom-property overrides at the <html> element in the root layout.
 */

// Port type → CSS variable suffix (e.g. "port-ethernet" → --color-port-ethernet).
// Multiple port types can share a variable (e.g. SFP/SFP_PLUS/SFP28 → port-sfp).
export const PORT_CSS_VAR: Record<string, string> = {
  ETHERNET:      "port-ethernet",
  FAST_ETHERNET: "port-fast-ethernet",
  IPMI:          "port-ipmi",
  SFP:           "port-sfp",
  SFP_PLUS:      "port-sfp",
  SFP28:         "port-sfp",
  QSFP:          "port-qsfp",
  QSFP_PLUS:     "port-qsfp",
  QSFP28:        "port-qsfp",
  CONSOLE:       "port-console",
  USB:           "port-usb",
  SERIAL:        "port-serial",
  FIBER:         "port-fiber",
  THUNDERBOLT:   "port-thunderbolt",
};

// Unique CSS variable suffixes that appear in portTypeColors (one per color group).
export const PORT_COLOR_GROUPS: { key: string; label: string; types: string[] }[] = [
  { key: "port-ethernet",      label: "Ethernet (GbE)",        types: ["ETHERNET"] },
  { key: "port-fast-ethernet", label: "Fast Ethernet (FE)",     types: ["FAST_ETHERNET"] },
  { key: "port-ipmi",          label: "IPMI / BMC",             types: ["IPMI"] },
  { key: "port-sfp",           label: "SFP family (S / S+ / S++)", types: ["SFP", "SFP_PLUS", "SFP28"] },
  { key: "port-qsfp",          label: "QSFP family (Q / Q+ / Q++)", types: ["QSFP", "QSFP_PLUS", "QSFP28"] },
  { key: "port-console",       label: "Console",                types: ["CONSOLE"] },
  { key: "port-usb",           label: "USB",                    types: ["USB"] },
  { key: "port-serial",        label: "Serial",                 types: ["SERIAL"] },
  { key: "port-fiber",         label: "Fiber",                  types: ["FIBER"] },
  { key: "port-thunderbolt",   label: "Thunderbolt",            types: ["THUNDERBOLT"] },
];

// Default hex for each port color group variable.
export const DEFAULT_PORT_TYPE_COLORS: Record<string, string> = {
  "port-ethernet":      "#3fb950",
  "port-fast-ethernet": "#7bc47f",
  "port-ipmi":          "#c678dd",
  "port-sfp":           "#3b82f6",
  "port-qsfp":          "#3b82f6",
  "port-console":       "#e0823d",
  "port-usb":           "#f97316",
  "port-serial":        "#94a3b8",
  "port-fiber":         "#06b6d4",
  "port-thunderbolt":   "#8b5cf6",
};

// Short labels rendered inside port squares (≤4 chars).
export const DEFAULT_PORT_TYPE_LABELS: Record<string, string> = {
  ETHERNET:      "GbE",
  FAST_ETHERNET: "FE",
  IPMI:          "BMC",
  SFP:           "S",
  SFP_PLUS:      "S+",
  SFP28:         "S++",
  QSFP:          "Q",
  QSFP_PLUS:     "Q+",
  QSFP28:        "Q++",
  CONSOLE:       "CON",
  USB:           "USB",
  SERIAL:        "RS",
  FIBER:         "F",
  THUNDERBOLT:   "TB",
};

// All port types shown in the label editor.
export const PORT_LABEL_TYPES: { type: string; description: string }[] = [
  { type: "ETHERNET",      description: "Ethernet (1G/10G)" },
  { type: "FAST_ETHERNET", description: "Fast Ethernet (100M)" },
  { type: "IPMI",          description: "IPMI / BMC" },
  { type: "SFP",           description: "SFP" },
  { type: "SFP_PLUS",      description: "SFP+" },
  { type: "SFP28",         description: "SFP28" },
  { type: "QSFP",          description: "QSFP" },
  { type: "QSFP_PLUS",     description: "QSFP+" },
  { type: "QSFP28",        description: "QSFP28" },
  { type: "CONSOLE",       description: "Console" },
  { type: "USB",           description: "USB" },
  { type: "SERIAL",        description: "Serial" },
  { type: "FIBER",         description: "Fiber" },
  { type: "THUNDERBOLT",   description: "Thunderbolt" },
];

// Category color groups — maps the CSS variable suffix to the categories that use it.
export const CATEGORY_COLOR_GROUPS: { key: string; label: string; categories: string[] }[] = [
  { key: "cat-server",   label: "Server / NUC / SBC",           categories: ["SERVER", "NUC", "SBC"] },
  { key: "cat-switch",   label: "Switch / Patch Panel",         categories: ["SWITCH", "PATCH_PANEL"] },
  { key: "cat-firewall", label: "Gateway / Firewall",           categories: ["GATEWAY", "FIREWALL"] },
  { key: "cat-ups",      label: "UPS",                          categories: ["UPS"] },
  { key: "cat-pdu",      label: "PDU / Shelf / Drawer",         categories: ["PDU", "SHELF", "DRAWER"] },
  { key: "cat-kvm",      label: "KVM",                          categories: ["KVM"] },
];

// Default hex for each category color variable (must match globals.css).
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  "cat-server":   "#3fb950",
  "cat-switch":   "#3b82f6",
  "cat-firewall": "#c678dd",
  "cat-ups":      "#d9a441",
  "cat-pdu":      "#7c8794",
  "cat-kvm":      "#e0823d",
};

// Merge DB overrides with defaults, returning a Record of CSS-var-suffix → hex.
export function mergeColors(
  stored: unknown,
  defaults: Record<string, string>,
): Record<string, string> {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return defaults;
  const overrides = stored as Record<string, unknown>;
  const result = { ...defaults };
  for (const [k, v] of Object.entries(overrides)) {
    if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) && k in defaults) {
      result[k] = v;
    }
  }
  return result;
}

// Merge DB overrides with default labels.
export function mergeLabels(
  stored: unknown,
  defaults: Record<string, string>,
): Record<string, string> {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return defaults;
  const overrides = stored as Record<string, unknown>;
  const result = { ...defaults };
  for (const [k, v] of Object.entries(overrides)) {
    if (typeof v === "string" && v.length > 0 && v.length <= 4 && k in defaults) {
      result[k] = v;
    }
  }
  return result;
}

export type DiagramSettings = {
  portLabels: Record<string, string>;
};
