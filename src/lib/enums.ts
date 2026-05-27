// Enum value lists mirroring the Prisma schema (CLAUDE.md §5). Kept as plain
// string consts so they can be shared by client forms and server code without
// importing the Prisma client into the browser bundle.

export const LIFECYCLE_STATES = [
  "IN_USE",
  "STORED",
  "SOLD",
  "JUNKED",
  "USED_UP",
] as const;

export const LIFECYCLE_STATE_LABELS: Record<
  (typeof LIFECYCLE_STATES)[number],
  string
> = {
  IN_USE: "In Use",
  STORED: "In Storage",
  SOLD: "Sold",
  JUNKED: "Junked",
  USED_UP: "Used Up",
};

export const ASSET_CATEGORIES = [
  "SERVER",
  "SWITCH",
  "PATCH_PANEL",
  "GATEWAY",
  "FIREWALL",
  "UPS",
  "PDU",
  "KVM",
  "ACCESS_POINT",
  "NUC",
  "SBC",
  "SHELF",
  "DRAWER",
  "BLANK_PANEL",
  "OTHER",
] as const;

export const FORM_FACTORS = ["RACK", "TOWER", "SHELF_ITEM", "NON_RACK"] as const;

export const ASSET_LOCATIONS = [
  "RACKED",
  "STORAGE",
  "ON_SHELF",
  "RETIRED",
  "OFFSITE",
] as const;

export const FACE_SIDES = ["FRONT", "REAR", "INTERIOR"] as const;

export const DRIVE_SIZES = ["LFF", "SFF", "M2"] as const;

export const DRIVE_KINDS = ["HDD", "SSD", "SAS", "NVME"] as const;

export const COMPONENT_TYPES = [
  "RAM",
  "CADDY",
  "RAID_CONTROLLER",
  "RAIL_KIT",
  "PCIE_CARD",
  "NIC_CARD",
  "GPU",
  "CPU",
  "POWER_SUPPLY",
  "BLANKING_PANEL",
  "ADAPTER",
  "NVME_RISER",
  "OTHER",
] as const;

export const PORT_TYPES = [
  "ETHERNET",
  "FAST_ETHERNET",
  "IPMI",
  "SFP",
  "SFP_PLUS",
  "SFP28",
  "QSFP",
  "QSFP_PLUS",
  "QSFP28",
  "CONSOLE",
  "USB",
] as const;

export const PORT_TYPE_LABELS: Record<(typeof PORT_TYPES)[number], string> = {
  ETHERNET: "Ethernet (RJ45)",
  FAST_ETHERNET: "Fast Ethernet (RJ45, 100Mbps)",
  IPMI: "IPMI / BMC (RJ45)",
  SFP: "SFP (1G)",
  SFP_PLUS: "SFP+ (10G)",
  SFP28: "SFP28 (25G)",
  QSFP: "QSFP (40G)",
  QSFP_PLUS: "QSFP+ (40G)",
  QSFP28: "QSFP28 (100G)",
  CONSOLE: "Console",
  USB: "USB",
};

export const APP_TYPES = ["VM", "CONTAINER", "SERVICE"] as const;

export const DEVICE_SIDES = ["LEFT", "CENTER", "RIGHT"] as const;

export const CONNECTION_TYPES = [
  "NETWORK",
  "POWER",
  "KVM",
  "CONSOLE",
] as const;

export const RENEWAL_PERIODS = [
  "DAILY",
  "WEEKLY",
  "BI_WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "BI_ANNUAL",
  "ANNUAL",
  "TWO_YEARS",
  "FIVE_YEARS",
  "TEN_YEARS",
  "PERPETUAL",
] as const;

export const RENEWAL_PERIOD_LABELS: Record<
  (typeof RENEWAL_PERIODS)[number],
  string
> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BI_WEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly (3 months)",
  BI_ANNUAL: "Bi-annual (6 months)",
  ANNUAL: "Annual",
  TWO_YEARS: "2 years",
  FIVE_YEARS: "5 years",
  TEN_YEARS: "10 years",
  PERPETUAL: "Perpetual",
};

// Display label for an enum value, e.g. "ACCESS_POINT" -> "ACCESS POINT".
export function enumLabel(value: string): string {
  return value.replace(/_/g, " ");
}
