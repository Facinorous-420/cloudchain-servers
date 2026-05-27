import { Panel } from "@/components/ui/panel";

const CHANGELOG: { version: string; date: string; entries: string[] }[] = [
  {
    version: "v1.0.0",
    date: "2026-05-29",
    entries: [
      // ── Assets ──────────────────────────────────────────────────────────────
      "Asset inventory with 15 categories: SERVER, SWITCH, GATEWAY, FIREWALL, UPS, PDU, KVM, ACCESS_POINT, NUC, SBC, SHELF, DRAWER, BLANK_PANEL, PATCH_PANEL, OTHER",
      "Category-specific fields per asset type (switch PoE budget, UPS VA/watts rating, AP Wi-Fi standard + band support, patch panel type, etc.)",
      "Lifecycle states for all items: IN_USE, STORED, SOLD, JUNKED",
      "Image gallery per asset: upload multiple photos, reorder, designate a main thumbnail",
      "Duplicate asset from detail page",
      "Preset system: ~70 built-in presets for common servers, switches, UPS units, patch panels, and more — with thumbnail images; custom presets via JSON; 'Save as preset' from any asset",

      // ── Hardware tracking ────────────────────────────────────────────────────
      "Drive inventory with bay-zone placement (LFF, SFF, M.2); bays assigned to specific zones (Front, Rear, Interior)",
      "Component tracking: RAM, CPU, NIC cards, GPU, PCIe cards, RAID controllers, NVMe risers, power supplies, and more",
      "PCIe slot management: define slots per server in the asset form; install/remove add-in cards via the detail page; slots sourced from presets for all major server models",
      "PSUs as first-class items: each PSU has wattage, port count, side, serial, and its own lifecycle",
      "Battery inventory (for UPS units) with voltage and capacity; spare batteries stored in named storage locations",
      "Consumable inventory (cables, thermal paste, misc supplies)",
      "License management with renewal tracking and per-asset assignments",
      "Application / VM / container tracking per server",

      // ── Rack diagram & topology ──────────────────────────────────────────────
      "Interactive rack diagram with front + rear views rendered side-by-side",
      "Drag-and-drop rack placement with overlap detection and support validation",
      "Storage areas and 'unboxed' pool for off-rack inventory in the topology view",
      "Server rear: drive bay zones, named port groups, outlet groups, installed PCIe NIC card port zones, PSU indicators",
      "Switch/gateway faceplates with visual port grids sized to the device height",
      "Patch panel rendering: KEYSTONE panels appear on both rack faces (front ports on front, permanent/punch-down ports on rear); COUPLER panels appear on one face with both Front and Rear port sections; up to 48 ports in a 1U panel",
      "UPS/PDU outlet group rendering with battery-backed vs surge-only distinctions",
      "KVM channel buttons with connected-server indicators",
      "Right-hand inspector pane for ports, outlets, bays, PSUs, KVM channels, PCIe NIC ports, and device details",
      "Port/outlet connection-state colouring (green = connected) driven from the connection table",
      "Patch panel inspector shows Front (patch-side) and Rear (permanent-side or ethernet-side) port rows separately",
      "Backwards-facing device support (physical front faces rack rear)",
      "Multiple rack support with rack switcher chips",

      // ── Connections ──────────────────────────────────────────────────────────
      "Connection documentation: NETWORK, POWER, KVM, CONSOLE types",
      "Two-step connection form with type-filtered endpoint fields and visual port picker",
      "Cable-length estimation from rack geometry; global service-loop setting plus per-connection override",
      "Structured port/outlet endpoints for accurate connection colouring in the diagram",

      // ── Financials & data ────────────────────────────────────────────────────
      "Financial dashboard: spend totals, by-category and by-source breakdowns, active-fleet value, sold/recovered summary",
      "Financials split across tabs: Overview / Assets / Drives / Licenses / Sold & Junked",
      "Excel export of all inventory data",

      // ── UI & admin ───────────────────────────────────────────────────────────
      "Admin dashboard: user management (create, edit, promote/demote), app-wide settings (name, description, accent colour, cable service loop)",
      "Diagram appearance customisation in admin settings: per-port-type colours (Ethernet, SFP family, IPMI, Console, etc.), category accent colours (Server, Switch, Gateway, UPS, PDU, KVM), and short labels inside port squares — with a reset-to-defaults button",
      "Search bar in top nav — click to open the command palette (Cmd+K) for instant navigation to any asset, drive, or component",
      "Admin user shown with a shield icon next to their username in the top nav",
      "Recent items dropdown in top bar",
      "Filters and sorting on all inventory list pages (URL-backed, bookmarkable)",
      "Toast notifications for mutations",
      "Dark, dense UniFi-style theme with configurable accent colour",
      "Auth.js credentials sign-in; JWT sessions; two-user setup (admin + member)",
      "Docker Compose production deployment (app + Postgres containers)",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Changelog</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          What changed in each release.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {CHANGELOG.map((release) => (
          <Panel key={release.version} className="p-5">
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-black text-accent">{release.version}</h2>
              <span className="text-[11px] text-text-dim">{release.date}</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {release.entries.map((entry, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-text">
                  <span className="mt-0.75 shrink-0 text-[8px] text-accent">
                    ▸
                  </span>
                  {entry}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
