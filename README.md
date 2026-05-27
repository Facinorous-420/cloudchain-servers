# Cloudchain Inventory

> **Vibe-coded project** — this app was built entirely with AI assistance in spare time.
> It works well for personal use, but it has not been audited for security, may contain
> bugs, and comes with no guarantees. Don't expose it to the internet, don't store
> sensitive credentials in it, and back up your database regularly. Use at your own risk.

---

<p align="center"><img src="./repo_images/Dashboard.png" width="49%" /><img src="./repo_images/Topology.png" width="49%" /></p>

A self-hosted web app for tracking homelab server hardware. It replaces a
spreadsheet — one record per physical thing, relationships stored as foreign keys,
and everything derived (rack diagram, financial totals, cable lengths) computed on
demand from that data.

**What it tracks:**

- **Assets** — servers, switches, gateways/firewalls, UPS units, PDUs, KVM switches,
  access points, NUCs, SBCs, patch panels, shelves, drawers, blank panels, and more.
  Each category has its own spec fields (switch PoE budget, UPS VA rating, AP Wi-Fi
  standard, patch panel type, etc.) plus lifecycle state (IN_USE / STORED / SOLD / JUNKED).
- **Drives** — HDDs, SSDs, SAS, NVMe; placed in named bay zones (Front / Rear / Interior).
- **Components** — RAM, CPUs, NIC cards, GPUs, RAID controllers, NVMe risers, PSUs,
  PCIe cards, and more. Cards can be installed in defined PCIe slots; the topology
  diagram and inspector automatically surface the installed card's ports.
- **PSUs** — each PSU is a first-class record with wattage, port count, side, and lifecycle.
- **Batteries** — for UPS units, with voltage and capacity for runtime estimates.
- **Consumables** — cables, thermal paste, misc supplies.
- **Licenses** — with renewal-date tracking and per-asset assignments.
- **Applications / VMs / containers** — running on a specific server asset.
- **Connections** — NETWORK, POWER, KVM, and CONSOLE cables between assets, with cable-
  length estimation from rack geometry and a configurable service-loop allowance (global
  default plus per-connection override).

**Key features:**

- **Interactive rack diagram** — front + rear views, drag-and-drop placement, port/outlet/
  bay/PSU/KVM/PCIe-NIC inspector pane, connection-state colouring, multiple rack support.
  Patch panels render correctly on both faces: KEYSTONE (punch-down rear) panels appear
  on both rack faces; COUPLER (ethernet both sides) panels appear on one face with two
  port sections.
- **Preset system** — ~70 built-in presets for common servers, switches, and UPS units,
  with thumbnail images; drop a JSON file in a folder to add your own.
- **PCIe slot management** — define slot layouts per server, install/remove add-in cards
  via the detail page; installed NIC cards automatically appear as port zones in the
  topology diagram.
- **Financial dashboard** — spend totals by category and source, active-fleet value,
  sold/recovered summary, Excel export.
- **Admin panel** — user management, accent colour, app name, cable service-loop length,
  and full diagram appearance customisation (port colours, category colours, port labels).
- **Search bar** in top nav (click to open command palette / Cmd+K) for instant
  navigation to any asset, drive, or component.

It is **not** a monitoring tool. It never polls servers or reads SMART data. Everything
is entered by hand.

---

## Tech stack

- **Next.js 16** (App Router) + TypeScript
- **PostgreSQL 18** + **Prisma 7** (via `@prisma/adapter-pg`)
- **Auth.js (NextAuth v5)** — credentials sign-in, JWT sessions
- **Tailwind CSS v4** — dark, UniFi-style theme
- **Vitest** + React Testing Library; **Playwright** for end-to-end tests
- **Docker Compose** for production (app + Postgres)

## Prerequisites

- **Node.js 22+**
- For native development — **PostgreSQL 18** running locally
- For production — **Docker** and Docker Compose

---

## Local development (native)

Development runs the app natively with `next dev`; PostgreSQL must be available.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env
```

Set in `.env`:

- `DATABASE_URL` — local Postgres connection string, e.g.
  `postgresql://postgres:PASSWORD@localhost:5432/cloudchain?schema=public`
- `AUTH_SECRET` — generate with `npx auth secret`
- `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` — admin account created by the seed

### 3. Apply the schema and seed

```bash
npm run db:migrate     # applies prisma/migrations/0_init and generates the client
npm run db:seed        # creates the admin user + a 25U rack
```

### 4. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000> and sign in.

### Scripts

| Command               | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `npm run dev`         | Start the dev server (Webpack)                       |
| `npm run build`       | Production build (standalone Next.js output)         |
| `npm run lint`        | ESLint                                               |
| `npm run format`      | Prettier                                             |
| `npm test`            | Vitest unit suite                                    |
| `npm run e2e`         | Playwright suite (run `npx playwright install` once) |
| `npm run db:migrate`  | Apply migrations + regenerate the client             |
| `npm run db:generate` | Regenerate the Prisma client only                    |
| `npm run db:seed`     | Run the seed script (idempotent)                     |
| `npm run db:studio`   | Open Prisma Studio                                   |

---

## Production deployment (Docker)

Production runs as two containers — the Next.js app and PostgreSQL —
configured by `compose.yml`.

### Host directory layout

```
/project
├── compose.yml             # copy of compose.yml from project root
├── .env                    # secrets (gitignored)
├── app/                    # git clone of the master branch
└── data/
    └── app/
        └── presets/        # custom presets bind-mounted into the container
```

### First-time bring-up

```bash
# 1. Clone the repo.
sudo mkdir -p /project/app
cd /project/app
git clone -b master https://github.com/Facinorous-420/cloudchain-servers.git .

# 2. Copy the compose file and create .env.
cp compose.yml ../compose.yml
cp .env.example ../.env
# Edit .env — set strong values for POSTGRES_PASSWORD, AUTH_SECRET,
# SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD.

# 3. Bring the stack up. The first run builds the image, applies
#    the migration, and starts the server.
cd ..
docker compose up -d --build

# 4. Seed the admin user (one-time, idempotent).
docker compose exec app npx prisma db seed
```

The app is reachable at `http://<host>:3000` on the LAN.

### Updating production

```bash
cd /project/app
git pull origin master
cd ..
docker compose up -d --build
```

`prisma migrate deploy` runs automatically before the app starts, so migrations
land before new code is served.

---

## Preset system

Presets auto-fill the "New Asset" form from a library of known device models. Instead
of re-entering dimensions, port layouts, bay counts, and power specs for every identical
unit, pick a preset and only fill in instance-specific fields (codename, serial, acquisition
info).

### Directory structure

```
presets/
├── system/            # ~70 presets baked into the Docker image (read-only)
│   └── assets/
│       ├── dell-poweredge-r640/
│       │   ├── preset.json
│       │   └── images/
│       │       └── front.jpg
│       └── ...
└── custom/            # your presets — bind-mounted from data/app/presets/
    └── assets/
        └── my-device/
            ├── preset.json
            └── images/
                └── front.jpg
```

### Using a preset

On the **New Asset** page (`/assets/new`), a preset picker appears before the form.
Search by name, manufacturer, or tag, filter by category, then click a card. To start
from scratch instead, click "start from scratch" or go to `/assets/new?skip=1`.

### Adding images to a preset

1. Create an `images/` folder inside your preset directory.
2. Drop in a JPEG or PNG (e.g. `front.jpg`).
3. Reference it in `preset.json` with `"thumbnail": "images/front.jpg"`.

The thumbnail appears in the preset picker card. The `images/` folder name is a
convention — you can use any filename you like, just match the path in `thumbnail`.

### Adding a custom preset (manual)

Drop a folder into `data/app/presets/assets/<device-name>/` containing a `preset.json`.
The preset appears in the picker immediately on the next page load — no restart required.

See `presets/custom/assets/example-server/` for a fully-annotated example that uses
every available field.

### Saving an existing asset as a preset

On any asset detail page, click **Save as preset**. The preset JSON is written to
`presets/custom/assets/<slug>/` automatically.

### `preset.json` field reference

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | **Required.** Display name |
| `category` | enum | **Required.** `SERVER` `SWITCH` `GATEWAY` `FIREWALL` `UPS` `PDU` `KVM` `ACCESS_POINT` `NUC` `SBC` `PATCH_PANEL` `SHELF` `DRAWER` `BLANK_PANEL` `OTHER` |
| `manufacturer` | string | Manufacturer name |
| `modelNumber` | string | Model number / SKU |
| `tags` | string[] | Search tags, e.g. `["server", "2u", "dell"]` |
| `thumbnail` | string | Relative path to thumbnail image, e.g. `images/front.jpg` |
| `formFactor` | enum | `RACK` `TOWER` `SHELF_ITEM` `NON_RACK` |
| `rackUnits` | int | U height (required for RACK/TOWER) |
| `heightInches` | number | Physical height |
| `widthInches` | number | Physical width |
| `depthInches` | number | Physical depth |
| `requiresSupport` | bool | `true` for towers / shelf gear |
| `psuCount` | int | Number of PSU bays |
| `builtInEthernetCount` | int | Built-in GbE ports |
| `builtInSfpCount` | int | Built-in SFP/SFP+ ports |
| `maxPowerDrawWatts` | int | Rated maximum draw |
| `idlePowerWatts` | int | Typical idle draw |
| `chassis` | string | Chassis model (server) |
| `mainboard` | string | Mainboard model (server) |
| `managementType` | string | `managed` / `lite` / `unmanaged` (switch) |
| `poeBudgetWatts` | int | PoE budget (switch) |
| `throughputGbps` | number | Throughput (gateway/firewall) |
| `vaRating` | int | VA rating (UPS) |
| `wattsRating` | int | Watt rating (UPS/PDU) |
| `estimatedRuntimeMinutes` | int | Runtime estimate (UPS) |
| `amperage` | string | Amperage (PDU), e.g. `"20A"` |
| `pduType` | string | `basic` / `switched` / `metered` |
| `kvmChannelCount` | int | Number of KVM channels |
| `supportedProtocols` | string | KVM protocols, e.g. `"USB, PS/2"` |
| `wifiStandard` | string | Wi-Fi 4 / 5 / 6 / 6E / 7 (AP) |
| `maxThroughputMbps` | int | Max wireless throughput (AP) |
| `poeInputType` | string | `af` / `at` / `bt` / `none` (AP) |
| `placement` | string | `indoor` / `outdoor` (AP) |
| `maxLoadLbs` | number | Max shelf load (shelf) |
| `patchPanelType` | string | `KEYSTONE` (punch-down permanent rear) / `COUPLER` (ethernet both sides) |
| `bayZones` | array | Drive bay layout — see below |
| `portGroups` | array | Port groups — see below |
| `outletGroups` | array | Outlet groups (UPS/PDU) — see below |
| `pciSlots` | array | PCIe slot layout — see below |

**`bayZones`** — each item:
`name` (string), `faceSide` (`FRONT`/`REAR`/`INTERIOR`), `driveSize` (`LFF`/`SFF`/`M2`), `bayCount` (int), `sortOrder` (int)

**`portGroups`** — each item:
`name` (string, optional), `portCount` (int), `portType` (`ETHERNET`/`FAST_ETHERNET`/`IPMI`/`SFP`/`SFP_PLUS`/`SFP28`/`QSFP`/`QSFP_PLUS`/`QSFP28`/`CONSOLE`/`USB`), `portSpeed` (string, optional, e.g. `"10G"`), `poePerPort` (int watts, optional), `side` (`LEFT`/`CENTER`/`RIGHT`), `sortOrder` (int)

**`outletGroups`** — each item:
`name` (string, optional), `outletCount` (int), `outletType` (string, optional, e.g. `"C13"`), `batteryBacked` (bool), `surgeProtected` (bool), `side` (`LEFT`/`CENTER`/`RIGHT`), `sortOrder` (int)

**`pciSlots`** — each item:
`sortOrder` (int), `size` (string, e.g. `"x16"` / `"x8"` / `"M.2 2280"` / `"OCP 3.0"`)

### Full annotated preset example

The file at `presets/custom/assets/example-server/preset.json` demonstrates every
possible field. Here is the same file with explanations (JSON does not support comments —
these annotations are for documentation only):

```jsonc
{
  // ── Identity ───────────────────────────────────────────────────────────────
  "name": "Example Custom Server",       // required — shown in picker + form
  "category": "SERVER",                  // required — determines which fields appear
  "manufacturer": "Acme",
  "modelNumber": "AS-2024R",
  "tags": ["server", "2u", "acme"],      // used for picker search/filter
  "thumbnail": "images/front.jpg",       // relative path inside the preset folder

  // ── Physical form ──────────────────────────────────────────────────────────
  "formFactor": "RACK",                  // RACK | TOWER | SHELF_ITEM | NON_RACK
  "rackUnits": 2,                        // U height in the rack diagram
  "heightInches": 3.46,
  "widthInches": 17.2,
  "depthInches": 28.0,
  "requiresSupport": false,              // true for towers/shelf items

  // ── Power ──────────────────────────────────────────────────────────────────
  "psuCount": 2,                         // number of PSU bays (creates blank PSU records)
  "maxPowerDrawWatts": 750,
  "idlePowerWatts": 120,

  // ── Server spec ────────────────────────────────────────────────────────────
  "chassis": "AS-2024R",                 // chassis / platform name
  "mainboard": "AS-MB-2024",

  // ── Built-in ports ─────────────────────────────────────────────────────────
  "builtInEthernetCount": 2,             // rear-panel RJ-45 ports (no separate group needed)
  "builtInSfpCount": 0,

  // ── Drive bay zones ────────────────────────────────────────────────────────
  // Each zone becomes a BayZone row. Multiple zones are allowed.
  "bayZones": [
    {
      "name": "Front",
      "faceSide": "FRONT",               // FRONT | REAR | INTERIOR
      "driveSize": "LFF",                // LFF | SFF | M2
      "bayCount": 12,
      "sortOrder": 0
    },
    {
      "name": "Interior M.2",
      "faceSide": "INTERIOR",
      "driveSize": "M2",
      "bayCount": 2,
      "sortOrder": 1
    }
  ],

  // ── Named port groups ──────────────────────────────────────────────────────
  // Use portGroups when you want the rack diagram to show individually named
  // port strips (e.g. iDRAC, a 10G SFP+ uplink pair). Built-in 1G RJ-45 ports
  // that don't need a dedicated strip can go in builtInEthernetCount instead.
  "portGroups": [
    {
      "name": "iDRAC",
      "portCount": 1,
      "portType": "IPMI",                // out-of-band management port
      "side": "LEFT",                    // LEFT | CENTER | RIGHT
      "sortOrder": 0
    },
    {
      "name": "10G SFP+",
      "portCount": 2,
      "portType": "SFP_PLUS",
      "portSpeed": "10G",
      "side": "LEFT",
      "sortOrder": 1
    }
  ],

  // ── PCIe slots ─────────────────────────────────────────────────────────────
  // Defines physical slots. After asset creation, install cards via the detail
  // page. Installed NIC/RAID cards appear as extra port zones in the topology.
  "pciSlots": [
    { "sortOrder": 0, "size": "x16" },
    { "sortOrder": 1, "size": "x8" },
    { "sortOrder": 2, "size": "x8" },
    { "sortOrder": 3, "size": "M.2 2280" }
  ]
}
```

---

## Testing

- **Unit tests** — `npm test` (Vitest). Covers placement validation, cable-length
  estimation, license-renewal date math, and the asset Zod schema.
- **End-to-end** — `npm run e2e` (Playwright). Auth-gate smoke tests — anonymous
  requests redirect to `/login`, login form renders, bad credentials surface an error.
  Install browser binaries once with `npx playwright install`.

## Default account

The seed creates a single admin user from `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`
(default `admin` / `changeme`). **Change the password in `.env` before seeding in
production.** A second user can be added from the in-app admin panel.
