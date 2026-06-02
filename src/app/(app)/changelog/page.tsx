import { Panel } from "@/components/ui/panel";

// Change-type colour coding for each entry's dot:
//   ADD          → new feature / capability (green)
//   CHANGE_MAJOR → significant change to existing behaviour (orange)
//   CHANGE_MINOR → small change / fix / tweak (yellow)
//   REMOVE       → something removed (red)
type ChangeType = "ADD" | "CHANGE_MAJOR" | "CHANGE_MINOR" | "REMOVE";

const DOT_COLOR: Record<ChangeType, string> = {
  ADD: "#3fb950",
  CHANGE_MAJOR: "#e0823d",
  CHANGE_MINOR: "#d9a441",
  REMOVE: "#f85149",
};

const LEGEND: { type: ChangeType; label: string }[] = [
  { type: "ADD", label: "Added" },
  { type: "CHANGE_MAJOR", label: "Changed" },
  { type: "CHANGE_MINOR", label: "Minor / fix" },
  { type: "REMOVE", label: "Removed" },
];

type Entry = { text: string; type: ChangeType };

const CHANGELOG: { version: string; date: string; entries: Entry[] }[] = [
  {
    version: "v1.1.0",
    date: "2026-06-01",
    entries: [
      // ── Rack diagram ─────────────────────────────────────────────────────────
      { type: "ADD", text: "View filters on the topology page: hide names, hide ports, hide drive bays — saved per-user and carried across devices" },
      { type: "ADD", text: "Image-render mode: each asset can render a per-face image sized to its U-space (with a placeholder block when none is set); drag and inspect move to corner handles in this mode" },
      { type: "ADD", text: "Per-face rack-render image upload on the asset form, blocked until rack height is set, with a live preview of the image scaled into the item's U-space" },
      { type: "ADD", text: "Faceplate layout editor: set each port/outlet group's face, rows × columns, and show/hide individual ports, with a live faceplate preview that mirrors the diagram" },
      { type: "ADD", text: "Hide specific port types (Ethernet, SFP…), drive-bay types (LFF, SFF, NVMe), or outlet types across the whole rack from the topology view filters — saved per-user" },
      { type: "ADD", text: "Optionally keep the drag and inspect handles pinned to each item's top corners outside image mode, with an adjustable transparency" },
      { type: "ADD", text: "Rack UPS/PDU units now show a PWR INLET zone (their power feed) in addition to POWER OUT" },
      { type: "CHANGE_MINOR", text: "Narrow single-column rack items now show just a status dot (full name on hover / in the inspector) instead of a clipped letter" },
      { type: "CHANGE_MINOR", text: "Tower-form UPS units now show the battery indicator like rack UPS units do" },
      // ── Hardware tracking ────────────────────────────────────────────────────
      { type: "ADD", text: "NVMe risers: define a riser's M.2 slot count, then mount or create NVMe drives into its slots from the drive form, the topology inspector, or the riser's own detail page" },
      { type: "CHANGE_MAJOR", text: "Drive placement is now keyed by bay zone, so drives in a riser are correctly attributed to the server the riser is installed in" },
      { type: "CHANGE_MAJOR", text: "PCIe slot editor: the 'install from inventory' list and the create-new type/size options are now filtered to cards that physically fit the selected slot; changing a slot's size resets its pending card; creating an NVMe riser inline can define its M.2 slots and drives" },
      { type: "ADD", text: "Components carry a structured connector size (x1–x16, M.2 lengths) for slot-fit matching" },
      // ── Forms & UX ───────────────────────────────────────────────────────────
      { type: "ADD", text: "Item edit and detail pages are now organised into tabs (General, Size, Hardware, Rendering) to keep long pages manageable" },
      { type: "CHANGE_MINOR", text: "Editing any item: a validation error no longer wipes the other fields you changed — your entries are preserved" },
      { type: "CHANGE_MINOR", text: "Creating an asset from a preset now carries the preset's image into the new asset" },
      { type: "ADD", text: "Changelog entries are now colour-coded by change type (added / changed / minor / removed)" },
      { type: "CHANGE_MINOR", text: "Mobile: list pages fit the screen (secondary columns collapse) with no sideways scrolling" },
      { type: "CHANGE_MINOR", text: "Mobile topology: tap a device then tap a slot or storage box to move it — no more fiddly drag-and-drop on touch" },
      { type: "CHANGE_MINOR", text: "List-page multi-select checkboxes now match the app's dark theme" },
    ],
  },
  {
    version: "v1.0.0",
    date: "2026-05-29",
    entries: [
      // ── Assets ──────────────────────────────────────────────────────────────
      { type: "ADD", text: "Asset inventory with 15 categories: SERVER, SWITCH, GATEWAY, FIREWALL, UPS, PDU, KVM, ACCESS_POINT, NUC, SBC, SHELF, DRAWER, BLANK_PANEL, PATCH_PANEL, OTHER" },
      { type: "ADD", text: "Category-specific fields per asset type (switch PoE budget, UPS VA/watts rating, AP Wi-Fi standard + band support, patch panel type, etc.)" },
      { type: "ADD", text: "Lifecycle states for all items: IN_USE, STORED, SOLD, JUNKED" },
      { type: "ADD", text: "Image gallery per asset: upload multiple photos, reorder, designate a main thumbnail" },
      { type: "ADD", text: "Duplicate asset from detail page" },
      { type: "ADD", text: "Preset system: ~70 built-in presets for common servers, switches, UPS units, patch panels, and more — with thumbnail images; custom presets via JSON; 'Save as preset' from any asset" },

      // ── Hardware tracking ────────────────────────────────────────────────────
      { type: "ADD", text: "Drive inventory with bay-zone placement (LFF, SFF, M.2); bays assigned to specific zones (Front, Rear, Interior)" },
      { type: "ADD", text: "Component tracking: RAM, CPU, NIC cards, GPU, PCIe cards, RAID controllers, NVMe risers, power supplies, and more" },
      { type: "ADD", text: "PCIe slot management: define slots per server in the asset form; install/remove add-in cards via the detail page; slots sourced from presets for all major server models" },
      { type: "ADD", text: "PSUs as first-class items: each PSU has wattage, port count, side, serial, and its own lifecycle" },
      { type: "ADD", text: "Battery inventory (for UPS units) with voltage and capacity; spare batteries stored in named storage locations" },
      { type: "ADD", text: "Consumable inventory (cables, thermal paste, misc supplies)" },
      { type: "ADD", text: "License management with renewal tracking and per-asset assignments" },
      { type: "ADD", text: "Application / VM / container tracking per server" },

      // ── Rack diagram & topology ──────────────────────────────────────────────
      { type: "ADD", text: "Interactive rack diagram with front + rear views rendered side-by-side" },
      { type: "ADD", text: "Drag-and-drop rack placement with overlap detection and support validation" },
      { type: "ADD", text: "Storage areas and 'unboxed' pool for off-rack inventory in the topology view" },
      { type: "ADD", text: "Server rear: drive bay zones, named port groups, outlet groups, installed PCIe NIC card port zones, PSU indicators" },
      { type: "ADD", text: "Switch/gateway faceplates with visual port grids sized to the device height" },
      { type: "ADD", text: "Patch panel rendering: KEYSTONE panels appear on both rack faces (front ports on front, permanent/punch-down ports on rear); COUPLER panels appear on one face with both Front and Rear port sections; up to 48 ports in a 1U panel" },
      { type: "ADD", text: "UPS/PDU outlet group rendering with battery-backed vs surge-only distinctions" },
      { type: "ADD", text: "KVM channel buttons with connected-server indicators" },
      { type: "ADD", text: "Right-hand inspector pane for ports, outlets, bays, PSUs, KVM channels, PCIe NIC ports, and device details" },
      { type: "ADD", text: "Port/outlet connection-state colouring (green = connected) driven from the connection table" },
      { type: "ADD", text: "Patch panel inspector shows Front (patch-side) and Rear (permanent-side or ethernet-side) port rows separately" },
      { type: "ADD", text: "Backwards-facing device support (physical front faces rack rear)" },
      { type: "ADD", text: "Multiple rack support with rack switcher chips" },

      // ── Connections ──────────────────────────────────────────────────────────
      { type: "ADD", text: "Connection documentation: NETWORK, POWER, KVM, CONSOLE types" },
      { type: "ADD", text: "Two-step connection form with type-filtered endpoint fields and visual port picker" },
      { type: "ADD", text: "Cable-length estimation from rack geometry; global service-loop setting plus per-connection override" },
      { type: "ADD", text: "Structured port/outlet endpoints for accurate connection colouring in the diagram" },

      // ── Financials & data ────────────────────────────────────────────────────
      { type: "ADD", text: "Financial dashboard: spend totals, by-category and by-source breakdowns, active-fleet value, sold/recovered summary" },
      { type: "ADD", text: "Financials split across tabs: Overview / Assets / Drives / Licenses / Sold & Junked" },
      { type: "ADD", text: "Excel export of all inventory data" },

      // ── UI & admin ────────────────────────────────────────────────────────────
      { type: "ADD", text: "Admin dashboard: user management (create, edit, promote/demote), app-wide settings (name, description, accent colour, cable service loop)" },
      { type: "ADD", text: "Diagram appearance customisation in admin settings: per-port-type colours (Ethernet, SFP family, IPMI, Console, etc.), category accent colours (Server, Switch, Gateway, UPS, PDU, KVM), and short labels inside port squares — with a reset-to-defaults button" },
      { type: "ADD", text: "Search bar in top nav — click to open the command palette (Cmd+K) for instant navigation to any asset, drive, or component" },
      { type: "ADD", text: "Admin user shown with a shield icon next to their username in the top nav" },
      { type: "ADD", text: "Recent items dropdown in top bar" },
      { type: "ADD", text: "Filters and sorting on all inventory list pages (URL-backed, bookmarkable)" },
      { type: "ADD", text: "Toast notifications for mutations" },
      { type: "ADD", text: "Dark, dense UniFi-style theme with configurable accent colour" },
      { type: "ADD", text: "Auth.js credentials sign-in; JWT sessions; two-user setup (admin + member)" },
      { type: "ADD", text: "Docker Compose production deployment (app + Postgres containers)" },
    ],
  },
];

function Dot({ type }: { type: ChangeType }) {
  return (
    <span
      aria-hidden
      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: DOT_COLOR[type] }}
    />
  );
}

export default function ChangelogPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Changelog</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          What changed in each release.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {LEGEND.map((l) => (
            <span key={l.type} className="flex items-center gap-1.5 text-[11px] text-text-dim">
              <Dot type={l.type} />
              {l.label}
            </span>
          ))}
        </div>
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
                  <Dot type={entry.type} />
                  {entry.text}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
