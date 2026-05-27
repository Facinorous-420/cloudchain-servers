/**
 * Dev seed - populates a realistic homelab rack for UI testing.
 * Run with:  npm run db:dev-seed
 *
 * Idempotent: skips everything if HP-DL380-G9-SFF-1 already exists.
 * To reset:   delete that asset (or wipe the DB) then re-run.
 */

import "dotenv/config";
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  AssetCategory,
  AssetLocation,
  LifecycleState,
  FormFactor,
  ConnectionType,
  AppType,
  DriveKind,
  DriveSize,
  FaceSide,
  PortType,
  DeviceSide,
  RenewalPeriod,
  ComponentType,
  RackFace,
} from "../src/generated/prisma";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PRESETS_ROOT = path.join(process.cwd(), "presets", "system", "assets");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Copies a preset front.png into public/uploads and creates an AssetImage row.
async function seedPresetImage(assetId: string, presetFolder: string): Promise<void> {
  const src = path.join(PRESETS_ROOT, presetFolder, "images", "front.png");
  if (!existsSync(src)) return;
  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${randomUUID()}.png`;
  await copyFile(src, path.join(UPLOADS_DIR, filename));
  await prisma.assetImage.create({
    data: { assetId, path: `/uploads/${filename}`, sortOrder: 0, isMain: true },
  });
}

// â"€â"€â"€ helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function d(iso: string) {
  return new Date(iso);
}

// â"€â"€â"€ main â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

async function main() {
  const guard = await prisma.asset.findUnique({
    where: { codename: "HP-DL380-G9-SFF-1" },
  });
  if (guard) {
    console.log(
      "Dev data already present - skipping. Remove HP-DL380-G9-SFF-1 to re-seed.",
    );
    return;
  }

  // â"€â"€ 1. Rack â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const rack = await prisma.rack.findFirst();
  if (!rack) throw new Error("Run `npm run db:seed` first to create the rack.");

  // Make it the default so the topology page opens it immediately.
  await prisma.rack.update({ where: { id: rack.id }, data: { isDefault: true } });
  console.log(`Rack: ${rack.name}`);

  // Second rack — demos the multi-rack switcher in the topology view.
  const rackBExisting = await prisma.rack.findFirst({ where: { name: "Lab Rack B" } });
  const rackB = rackBExisting ?? (await prisma.rack.create({
    data: {
      name: "Lab Rack B",
      totalU: 14,
      columnCount: 6,
      notes: "Secondary 14U rack for overflow servers. DEMO: multi-rack topology switcher — verifies the rack-chip selector and that assets in different racks render correctly.",
    },
  }));
  console.log(`Rack B: ${rackB.name}`);

  // â"€â"€ 2. Storages â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const [storageCabinet, partsBin] = await Promise.all([
    prisma.storage.upsert({
      where: { name: "Server Room Cabinet" },
      update: {},
      create: { name: "Server Room Cabinet", notes: "Metal shelving unit beside the rack" },
    }),
    prisma.storage.upsert({
      where: { name: "Parts Bin" },
      update: {},
      create: { name: "Parts Bin", notes: "Stackable bins on the workbench for spare components" },
    }),
  ]);
  console.log("Storages ready");

  // â"€â"€ 3. Assets â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  // Rack layout (U1 = bottom):
  //  U1-4   APC Smart-UPS 1500 Tower  (4U, cols 0-2, on rack floor)
  //  U1-5   HP ProLiant ML350 Gen9    (5U, cols 3-5, on rack floor)
  //  U6-7   APC Smart-UPS 1500 Rack   (2U)
  //  U8     APC AP7800B PDU           (1U)
  //  U9     Blank Panel               (1U, front-face)
  //  U10    IOGEAR GCS1716 KVM        (1U)
  //  U11    UniFi USW-Pro-48-PoE      (1U)
  //  U12    UniFi Dream Machine SE    (1U)
  //  U13-14 HP DL380 G9 SFF #1        (2U)
  //  U15-16 HP DL380 G9 SFF #2        (2U)
  //  U17-18 Supermicro 6028U-TR4T+    (2U)
  //  U19-20 Dell PowerEdge R720xd     (2U)
  //  U21-22 Synology RS1221+ NAS      (2U)
  //  U23    24-Port Cat6 Patch Panel  (1U, front-face)
  //  U24    Blank Panel               (1U, front-face)
  //  U25    1U Cantilever Shelf       (1U, front-face) — holds NUC + RPi

  const rackedBase = {
    location: AssetLocation.RACKED,
    rackId: rack.id,
    state: LifecycleState.IN_USE,
    condition: "used",
  } as const;

  const [ups, pdu, blank1, kvm, sw, gw, srv1, srv2, srv3, srv4, nas, patchPanel, blank3, shelf, towerUps, towerServer] =
    await Promise.all([
      // â"€â"€ UPS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "APC-SUA1500",
          name: "Smart-UPS 1500",
          category: AssetCategory.UPS,
          manufacturer: "APC",
          modelNumber: "SUA1500",
          serialNumber: "AS1234567890",
          formFactor: FormFactor.RACK,
          rackUnits: 2,
          startU: 6,
          vaRating: 1500,
          wattsRating: 980,
          estimatedRuntimeMinutes: 18,
          purchaseDate: d("2021-03-15"),
          purchasePrice: 349.99,
          purchasedFrom: "eBay",
          maxPowerDrawWatts: 50,
          idlePowerWatts: 30,
          notes: "Replace battery by end of 2025. RBC7 cartridge.",
        },
      }),

      // â"€â"€ PDU â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "APC-AP7800B",
          name: "Rack PDU 2G, Metered, 1U",
          category: AssetCategory.PDU,
          manufacturer: "APC",
          modelNumber: "AP7800B",
          formFactor: FormFactor.RACK,
          rackUnits: 1,
          startU: 8,
          amperage: "15A",
          pduType: "metered",
          purchaseDate: d("2021-03-15"),
          purchasePrice: 179.0,
          purchasedFrom: "eBay",
        },
      }),

      // â"€â"€ Blank U4 â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "BLANK-09",
          name: "1U Blank Panel",
          category: AssetCategory.BLANK_PANEL,
          formFactor: FormFactor.RACK,
          rackUnits: 1,
          startU: 9,
          rackFace: RackFace.FRONT,
          purpose: "airflow",
        },
      }),

      // â"€â"€ KVM â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "IOGEAR-KVM-1",
          name: "GCS1716 16-Port KVM Switch",
          category: AssetCategory.KVM,
          manufacturer: "IOGEAR",
          modelNumber: "GCS1716",
          formFactor: FormFactor.RACK,
          rackUnits: 1,
          startU: 10,
          kvmChannelCount: 16,
          supportedProtocols: "VGA, PS/2, USB",
          purchaseDate: d("2020-08-10"),
          purchasePrice: 85.0,
          purchasedFrom: "Amazon",
        },
      }),

      // â"€â"€ Switch â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "UNIFI-SW-PRO48",
          name: "USW-Pro-48-PoE",
          category: AssetCategory.SWITCH,
          manufacturer: "Ubiquiti",
          modelNumber: "USW-Pro-48-PoE",
          formFactor: FormFactor.RACK,
          rackUnits: 1,
          startU: 11,
          managementType: "managed",
          poeBudgetWatts: 600,
          builtInEthernetCount: 48,
          builtInSfpCount: 4,
          purchaseDate: d("2022-01-20"),
          purchasePrice: 749.0,
          purchasedFrom: "UI Store",
          maxPowerDrawWatts: 120,
          idlePowerWatts: 45,
          firmwareVersion: "6.5.59",
        },
      }),

      // â"€â"€ Gateway â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "UNIFI-UDM-SE",
          name: "Dream Machine Pro SE",
          category: AssetCategory.GATEWAY,
          manufacturer: "Ubiquiti",
          modelNumber: "UDM-SE",
          formFactor: FormFactor.RACK,
          rackUnits: 1,
          startU: 12,
          builtInEthernetCount: 8,
          builtInSfpCount: 2,
          throughputGbps: 10.0,
          maxConcurrentConnections: 500000,
          purchaseDate: d("2022-01-20"),
          purchasePrice: 499.0,
          purchasedFrom: "UI Store",
          maxPowerDrawWatts: 65,
          idlePowerWatts: 25,
          firmwareVersion: "3.2.12",
        },
      }),

      // â"€â"€ Server 1: HP DL380 G9 SFF #1 â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "HP-DL380-G9-SFF-1",
          name: "ProLiant DL380 Gen9 SFF",
          category: AssetCategory.SERVER,
          manufacturer: "HP",
          modelNumber: "DL380 Gen9",
          serialNumber: "MXQ61900XY",
          formFactor: FormFactor.RACK,
          rackUnits: 2,
          startU: 13,
          chassis: "ProLiant DL380 Gen9 SFF 8-bay",
          mainboard: "HPE DL380 Gen9 System Board",
          raidController: "HP Smart Array P440ar",
          operatingSystem: "Unraid 6.12.6",
          psuCount: 2,
          builtInEthernetCount: 4,
          purchaseDate: d("2020-06-01"),
          purchasePrice: 420.0,
          purchasePriceBeforeShip: 380.0,
          purchasedFrom: "Kijiji",
          maxPowerDrawWatts: 350,
          idlePowerWatts: 120,
          notes: "Primary NAS/media server. Runs Unraid.",
        },
      }),

      // â"€â"€ Server 2: HP DL380 G9 SFF #2 â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "HP-DL380-G9-SFF-2",
          name: "ProLiant DL380 Gen9 SFF",
          category: AssetCategory.SERVER,
          manufacturer: "HP",
          modelNumber: "DL380 Gen9",
          serialNumber: "MXQ72401ZA",
          formFactor: FormFactor.RACK,
          rackUnits: 2,
          startU: 15,
          chassis: "ProLiant DL380 Gen9 SFF 8-bay",
          mainboard: "HPE DL380 Gen9 System Board",
          raidController: "HP Smart Array P440ar",
          operatingSystem: "Proxmox VE 8.2",
          psuCount: 2,
          builtInEthernetCount: 4,
          purchaseDate: d("2021-02-14"),
          purchasePrice: 460.0,
          purchasePriceBeforeShip: 420.0,
          purchasedFrom: "eBay",
          maxPowerDrawWatts: 320,
          idlePowerWatts: 100,
          notes: "Hypervisor. Runs Proxmox with several VMs.",
        },
      }),

      // â"€â"€ Server 3: Supermicro 6028U â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "SM-6028U-1",
          name: "SuperServer 6028U-TR4T+",
          category: AssetCategory.SERVER,
          manufacturer: "Supermicro",
          modelNumber: "6028U-TR4T+",
          serialNumber: "S12345ABC",
          formFactor: FormFactor.RACK,
          rackUnits: 2,
          startU: 17,
          chassis: "Supermicro CSE-826",
          mainboard: "Supermicro X10DRU-i+",
          raidController: "LSI MegaRAID SAS 9361-8i",
          operatingSystem: "TrueNAS SCALE 24.04",
          psuCount: 2,
          builtInEthernetCount: 2,
          builtInSfpCount: 2,
          purchaseDate: d("2022-09-05"),
          purchasePrice: 750.0,
          purchasedFrom: "eBay",
          maxPowerDrawWatts: 420,
          idlePowerWatts: 150,
          notes: "TrueNAS SCALE storage server. 12-bay LFF chassis.",
        },
      }),

      // â"€â"€ Server 4: Dell R720xd â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "DELL-R720XD-1",
          name: "PowerEdge R720xd",
          category: AssetCategory.SERVER,
          manufacturer: "Dell",
          modelNumber: "R720xd",
          serialNumber: "DLRACK12345",
          formFactor: FormFactor.RACK,
          rackUnits: 2,
          startU: 19,
          chassis: "Dell R720xd 12+2 bay",
          mainboard: "Dell 0GY1TD",
          raidController: "Dell PERC H710P",
          operatingSystem: "Proxmox VE 8.2",
          psuCount: 2,
          builtInEthernetCount: 4,
          purchaseDate: d("2021-11-20"),
          purchasePrice: 390.0,
          purchasePriceBeforeShip: 340.0,
          purchasedFrom: "eBay",
          maxPowerDrawWatts: 375,
          idlePowerWatts: 130,
          notes: "Secondary hypervisor / backup node.",
        },
      }),

      // â"€â"€ NAS: Synology RS1221+ â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "SYN-RS1221",
          name: "RackStation RS1221+",
          category: AssetCategory.SERVER,
          manufacturer: "Synology",
          modelNumber: "RS1221+",
          serialNumber: "SYN2021XY1234",
          formFactor: FormFactor.RACK,
          rackUnits: 2,
          startU: 21,
          operatingSystem: "DSM 7.2",
          psuCount: 1,
          builtInEthernetCount: 4,
          purchaseDate: d("2023-04-12"),
          purchasePrice: 899.0,
          purchasedFrom: "Amazon",
          maxPowerDrawWatts: 60,
          idlePowerWatts: 35,
          notes: "Off-site backup target and family photo NAS.",
        },
      }),

      // ── Patch panel U23 ──────────────────────────────────────────────────
      // DEMO: 24-port patch panel — demonstrates dual-connection per port.
      // Ports 1 & 2 are wired (front patch cable + rear permanent cable).
      // Ports 3-24 are empty so the diagram shows mixed green/gray squares.
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "PP-CAT6-24-1",
          name: "24-Port Cat6 Patch Panel",
          category: AssetCategory.PATCH_PANEL,
          patchPanelType: "KEYSTONE",
          manufacturer: "Tripp-Lite",
          modelNumber: "N252-024-BL",
          formFactor: FormFactor.RACK,
          rackUnits: 1,
          startU: 23,
          purchaseDate: d("2021-03-15"),
          purchasePrice: 45.0,
          purchasedFrom: "Amazon",
          notes: "DEMO: patch panel. Ports 1–2 have two connections each (front patch + rear permanent cable) to verify dual-connection port rendering.",
        },
      }),

      // â"€â"€ Blank U24 â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "BLANK-24",
          name: "1U Blank Panel",
          category: AssetCategory.BLANK_PANEL,
          formFactor: FormFactor.RACK,
          rackUnits: 1,
          startU: 24,
          rackFace: RackFace.FRONT,
          purpose: "airflow",
        },
      }),

      // ── 1U cantilever shelf at U25 — hosts RPi + NUC ──────────────────
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "SHELF-1U-1",
          name: "1U Cantilever Shelf",
          category: AssetCategory.SHELF,
          formFactor: FormFactor.RACK,
          rackUnits: 1,
          startU: 25,
          rackFace: RackFace.FRONT,
          notes: "Holds Raspberry Pi 4 and Intel NUC 11. Both units velcro'd down.",
        },
      }),

      // ── APC Smart-UPS 1500 tower at U1–4 cols 1–3 (rack floor) ────────
      // Tower UPS on the rack floor, left three columns.
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "APC-SUA1500-TWR",
          name: "Smart-UPS 1500 Tower",
          category: AssetCategory.UPS,
          manufacturer: "APC",
          modelNumber: "SUA1500",
          serialNumber: "AS9876543210",
          formFactor: FormFactor.TOWER,
          rackUnits: 4,
          startU: 1,
          gridColumn: 0,
          columnSpan: 3,
          requiresSupport: true,
          vaRating: 1500,
          wattsRating: 980,
          estimatedRuntimeMinutes: 22,
          purchaseDate: d("2023-06-15"),
          purchasePrice: 289.99,
          purchasedFrom: "eBay",
          notes: "Tower UPS. Sits in left rack floor space. Powers the tower server.",
        },
      }),

      // ── HP ProLiant ML350 Gen9 tower server at U1–5 cols 4–6 (rack floor) ─
      // Tower server on the rack floor, right three columns. CI/build workloads.
      prisma.asset.create({
        data: {
          ...rackedBase,
          codename: "HP-ML350-G9-1",
          name: "ProLiant ML350 Gen9",
          category: AssetCategory.SERVER,
          manufacturer: "HP",
          modelNumber: "ML350 Gen9",
          serialNumber: "MXQ71234AB",
          formFactor: FormFactor.TOWER,
          rackUnits: 5,
          startU: 1,
          gridColumn: 3,
          columnSpan: 3,
          requiresSupport: true,
          chassis: "HP ML350 Gen9 Tower",
          mainboard: "HPE ML350 Gen9 System Board",
          raidController: "HP Smart Array P440",
          operatingSystem: "Ubuntu Server 24.04 LTS",
          psuCount: 2,
          builtInEthernetCount: 2,
          purchaseDate: d("2023-02-10"),
          purchasePrice: 380.0,
          purchasedFrom: "eBay",
          maxPowerDrawWatts: 460,
          idlePowerWatts: 140,
          notes: "Build/CI server. Tower form factor, right rack floor space.",
        },
      }),
    ]);

  console.log("Racked assets created");

  // ── Second rack assets ─────────────────────────────────────────────────────
  // Two servers + a small switch in Lab Rack B. Each server has a distinctive
  // PCIe layout so the topology and inspector can be compared side-by-side.
  const rackedBBase = {
    location: AssetLocation.RACKED,
    rackId: rackB.id,
    state: LifecycleState.IN_USE,
    condition: "used",
  } as const;

  const [rackBSrv1, rackBSrv2, rackBSw] = await Promise.all([
    // Dell R640 at U1 — 1U, 10 SFF bays, 3 PCIe slots
    prisma.asset.create({
      data: {
        ...rackedBBase,
        codename: "DELL-R640-1",
        name: "PowerEdge R640",
        category: AssetCategory.SERVER,
        manufacturer: "Dell",
        modelNumber: "R640",
        formFactor: FormFactor.RACK,
        rackUnits: 1,
        startU: 1,
        psuCount: 2,
        builtInEthernetCount: 2,
        chassis: "Dell R640",
        mainboard: "Dell 0YJC3N",
        operatingSystem: "Proxmox VE 8.2",
        purchaseDate: d("2023-08-15"),
        purchasePrice: 680.0,
        purchasedFrom: "eBay",
        maxPowerDrawWatts: 550,
        idlePowerWatts: 160,
        notes: "DEMO: 1U dense-storage server with 10 SFF bays (4 populated, 6 empty). PCIe slot 0 (x16) has a 2-port 10G SFP+ NIC so the topology inspector shows PCIe NIC port buttons. Slots 1–2 are empty.",
      },
    }),

    // Dell R710 at U2–3 — 2U, 8 LFF front + 2 SFF rear, 6 PCIe slots
    prisma.asset.create({
      data: {
        ...rackedBBase,
        codename: "DELL-R710-1",
        name: "PowerEdge R710",
        category: AssetCategory.SERVER,
        manufacturer: "Dell",
        modelNumber: "R710",
        formFactor: FormFactor.RACK,
        rackUnits: 2,
        startU: 2,
        psuCount: 2,
        builtInEthernetCount: 4,
        chassis: "Dell R710",
        mainboard: "Dell 0M233H",
        operatingSystem: "Ubuntu Server 22.04 LTS",
        purchaseDate: d("2022-03-10"),
        purchasePrice: 220.0,
        purchasedFrom: "Kijiji",
        maxPowerDrawWatts: 450,
        idlePowerWatts: 130,
        notes: "DEMO: 2U server with mixed LFF front bays + SFF rear flex bays. 6 PCIe slots — slot 0 (x16) has a GPU, slot 2 (x8) has an 8-port RAID HBA, slots 1, 3–5 empty. Tests mixed occupied/empty PCIe slot rendering.",
      },
    }),

    // Cisco SG300-28 at U4 — 24-port managed switch
    prisma.asset.create({
      data: {
        ...rackedBBase,
        codename: "CISCO-SG300-1",
        name: "SG300-28 28-Port Switch",
        category: AssetCategory.SWITCH,
        manufacturer: "Cisco",
        modelNumber: "SG300-28",
        formFactor: FormFactor.RACK,
        rackUnits: 1,
        startU: 4,
        managementType: "managed",
        purchaseDate: d("2021-09-01"),
        purchasePrice: 95.0,
        purchasedFrom: "eBay",
        maxPowerDrawWatts: 25,
        notes: "DEMO: Switch in second rack. Tests port group rendering on a smaller-port-count switch and verifies multi-rack topology.",
      },
    }),
  ]);
  console.log("Second rack assets created");

  // â"€â"€ Stored / off-rack assets â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const [oldServer, nuc, pi, ap, soldServer] = await Promise.all([
    prisma.asset.create({
      data: {
        codename: "HP-DL360-G7-1",
        name: "ProLiant DL360 G7",
        category: AssetCategory.SERVER,
        manufacturer: "HP",
        modelNumber: "DL360 G7",
        serialNumber: "CZJ1234567",
        formFactor: FormFactor.RACK,
        rackUnits: 1,
        location: AssetLocation.STORAGE,
        storageId: storageCabinet.id,
        state: LifecycleState.STORED,
        condition: "used",
        psuCount: 2,
        builtInEthernetCount: 4,
        operatingSystem: "ESXi 6.7",
        purchaseDate: d("2019-05-10"),
        purchasePrice: 120.0,
        purchasedFrom: "Kijiji",
        notes: "Retired from active duty. Kept as emergency spare.",
      },
    }),

    // NUC sits on the 1U shelf in the rack — unpowered spare
    prisma.asset.create({
      data: {
        codename: "INTEL-NUC11-1",
        name: "NUC 11 Pro Kit",
        category: AssetCategory.NUC,
        manufacturer: "Intel",
        modelNumber: "NUC11TNHi5",
        formFactor: FormFactor.SHELF_ITEM,
        location: AssetLocation.ON_SHELF,
        parentAssetId: shelf.id,
        state: LifecycleState.STORED,
        condition: "used",
        builtInEthernetCount: 1,
        operatingSystem: "Ubuntu 22.04 LTS",
        purchaseDate: d("2022-07-18"),
        purchasePrice: 280.0,
        purchasedFrom: "Amazon",
        notes: "Spare homelab NUC. Currently unpowered on shelf.",
      },
    }),

    // RPi sits on the 1U shelf — active Pi-hole node
    prisma.asset.create({
      data: {
        codename: "RPI4-8GB-1",
        name: "Raspberry Pi 4 Model B 8GB",
        category: AssetCategory.SBC,
        manufacturer: "Raspberry Pi Foundation",
        modelNumber: "SC0195",
        formFactor: FormFactor.SHELF_ITEM,
        location: AssetLocation.ON_SHELF,
        parentAssetId: shelf.id,
        state: LifecycleState.IN_USE,
        condition: "new",
        builtInEthernetCount: 1,
        operatingSystem: "Raspberry Pi OS Lite (64-bit)",
        purchaseDate: d("2023-11-25"),
        purchasePrice: 85.0,
        purchasedFrom: "Adafruit",
        notes: "Running Pi-hole for network-wide ad blocking. Powered via PoE hat from switch.",
      },
    }),

    prisma.asset.create({
      data: {
        codename: "UNIFI-U6LR-1",
        name: "U6 Long-Range",
        category: AssetCategory.ACCESS_POINT,
        manufacturer: "Ubiquiti",
        modelNumber: "U6-LR",
        formFactor: FormFactor.NON_RACK,
        location: AssetLocation.OFFSITE,
        state: LifecycleState.IN_USE,
        condition: "used",
        wifiStandard: "Wi-Fi 6",
        bandSupport: "2.4,5",
        poeInputType: "bt",
        placement: "indoor",
        maxThroughputMbps: 3000,
        purchaseDate: d("2022-01-20"),
        purchasePrice: 199.0,
        purchasedFrom: "UI Store",
        firmwareVersion: "6.6.55",
        notes: "Mounted in the main living area. Covers ~2500 sq ft.",
      },
    }),

    prisma.asset.create({
      data: {
        codename: "HP-DL380-G8-SOLD",
        name: "ProLiant DL380 Gen8 SFF",
        category: AssetCategory.SERVER,
        manufacturer: "HP",
        modelNumber: "DL380 Gen8",
        formFactor: FormFactor.RACK,
        rackUnits: 2,
        location: AssetLocation.RETIRED,
        state: LifecycleState.SOLD,
        condition: "used",
        purchaseDate: d("2019-01-15"),
        purchasePrice: 190.0,
        purchasedFrom: "Kijiji",
        soldDate: d("2023-06-01"),
        soldPrice: 150.0,
        notes: "Sold - replaced by SM-6028U-1.",
      },
    }),
  ]);

  console.log("Stored/off-rack assets created");

  // 3.5. Preset images — copy each asset's front.png into public/uploads so
  // the app shows the image immediately after seeding, just like a preset apply.
  await Promise.all([
    seedPresetImage(ups.id,         "apc-smart-ups-1500rm2u"),
    seedPresetImage(pdu.id,         "apc-ap7930"),
    seedPresetImage(kvm.id,         "startech-sv831dusbau"),
    seedPresetImage(sw.id,          "unifi-usw-pro-48-poe"),
    seedPresetImage(gw.id,          "unifi-udm-se"),
    seedPresetImage(srv1.id,        "hp-proliant-dl380-gen9"),
    seedPresetImage(srv2.id,        "hp-proliant-dl380-gen9"),
    seedPresetImage(srv3.id,        "supermicro-6028r-tr"),
    seedPresetImage(srv4.id,        "dell-poweredge-r720"),
    seedPresetImage(towerUps.id,    "apc-smart-ups-1500rm2u"),
    seedPresetImage(towerServer.id, "hp-proliant-dl380-gen9"),
    seedPresetImage(nuc.id,         "intel-nuc-12-pro"),
    seedPresetImage(pi.id,          "raspberry-pi-4b"),
    seedPresetImage(ap.id,          "unifi-u6-long-range"),
    seedPresetImage(rackBSrv1.id,   "dell-poweredge-r640"),
    seedPresetImage(rackBSrv2.id,   "dell-poweredge-r710"),
    seedPresetImage(rackBSw.id,     "cisco-sg350x-48"),
  ]);
  console.log("Preset images copied to public/uploads");

  // â"€â"€ 4. Bay Zones â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const [
    srv1Front, srv1Interior,
    srv2Front, srv2Interior,
    srv3Front,
    srv4Front, srv4Rear,
    nasFront,
    oldServerFront,
    ml350Front,
  ] = await Promise.all([
    // srv1: HP DL380 G9 SFF #1
    prisma.bayZone.create({
      data: { assetId: srv1.id, name: "Front Bays (SFF)", faceSide: FaceSide.FRONT, driveSize: DriveSize.SFF, bayCount: 8, sortOrder: 0 },
    }),
    prisma.bayZone.create({
      data: { assetId: srv1.id, name: "Optical/Flex Bay", faceSide: FaceSide.INTERIOR, driveSize: DriveSize.SFF, bayCount: 2, sortOrder: 1 },
    }),

    // srv2: HP DL380 G9 SFF #2
    prisma.bayZone.create({
      data: { assetId: srv2.id, name: "Front Bays (SFF)", faceSide: FaceSide.FRONT, driveSize: DriveSize.SFF, bayCount: 8, sortOrder: 0 },
    }),
    prisma.bayZone.create({
      data: { assetId: srv2.id, name: "Optical/Flex Bay", faceSide: FaceSide.INTERIOR, driveSize: DriveSize.SFF, bayCount: 2, sortOrder: 1 },
    }),

    // srv3: Supermicro 6028U (12-bay LFF)
    prisma.bayZone.create({
      data: { assetId: srv3.id, name: "Front Bays (LFF)", faceSide: FaceSide.FRONT, driveSize: DriveSize.LFF, bayCount: 12, sortOrder: 0 },
    }),

    // srv4: Dell R720xd (12 LFF front + 2 SFF rear)
    prisma.bayZone.create({
      data: { assetId: srv4.id, name: "Front Bays (LFF)", faceSide: FaceSide.FRONT, driveSize: DriveSize.LFF, bayCount: 12, sortOrder: 0 },
    }),
    prisma.bayZone.create({
      data: { assetId: srv4.id, name: "Rear Flex Bays (SFF)", faceSide: FaceSide.REAR, driveSize: DriveSize.SFF, bayCount: 2, sortOrder: 1 },
    }),

    // nas: Synology RS1221+ (8-bay LFF)
    prisma.bayZone.create({
      data: { assetId: nas.id, name: "Drive Bays", faceSide: FaceSide.FRONT, driveSize: DriveSize.LFF, bayCount: 8, sortOrder: 0 },
    }),

    // oldServer: HP DL360 G7
    prisma.bayZone.create({
      data: { assetId: oldServer.id, name: "Front Bays (SFF)", faceSide: FaceSide.FRONT, driveSize: DriveSize.SFF, bayCount: 8, sortOrder: 0 },
    }),

    // towerServer: HP ML350 Gen9 (8-bay LFF tower)
    prisma.bayZone.create({
      data: { assetId: towerServer.id, name: "Drive Bays (LFF)", faceSide: FaceSide.FRONT, driveSize: DriveSize.LFF, bayCount: 8, sortOrder: 0 },
    }),
  ]);

  console.log("Bay zones created");

  // ── 4.5. Bay zones for second rack servers + PCIe slots for ALL servers ───

  const [rackBSrv1Front, rackBSrv2Front, rackBSrv2Rear] = await Promise.all([
    prisma.bayZone.create({
      data: { assetId: rackBSrv1.id, name: "Front Bays (SFF)", faceSide: FaceSide.FRONT, driveSize: DriveSize.SFF, bayCount: 10, sortOrder: 0 },
    }),
    prisma.bayZone.create({
      data: { assetId: rackBSrv2.id, name: "Front Bays (LFF)", faceSide: FaceSide.FRONT, driveSize: DriveSize.LFF, bayCount: 8, sortOrder: 0 },
    }),
    prisma.bayZone.create({
      data: { assetId: rackBSrv2.id, name: "Rear Flex (SFF)", faceSide: FaceSide.REAR, driveSize: DriveSize.SFF, bayCount: 2, sortOrder: 1 },
    }),
  ]);

  // PCIe slots — each server has a distinct layout to exercise different rendering paths.
  await Promise.all([
    // srv1: HP DL380 Gen9 #1 — 6 low-profile slots. Slot 0 will get a 2-port 10G NIC.
    prisma.pciSlot.createMany({ data: [
      { assetId: srv1.id, sortOrder: 0, size: "x16" },
      { assetId: srv1.id, sortOrder: 1, size: "x16" },
      { assetId: srv1.id, sortOrder: 2, size: "x8" },
      { assetId: srv1.id, sortOrder: 3, size: "x8" },
      { assetId: srv1.id, sortOrder: 4, size: "x8" },
      { assetId: srv1.id, sortOrder: 5, size: "x8" },
    ] }),
    // srv2: HP DL380 Gen9 #2 — 6 low-profile slots. Slot 0 gets GPU; slot 2 gets quad NIC.
    prisma.pciSlot.createMany({ data: [
      { assetId: srv2.id, sortOrder: 0, size: "x16" },
      { assetId: srv2.id, sortOrder: 1, size: "x16" },
      { assetId: srv2.id, sortOrder: 2, size: "x8" },
      { assetId: srv2.id, sortOrder: 3, size: "x8" },
      { assetId: srv2.id, sortOrder: 4, size: "x8" },
      { assetId: srv2.id, sortOrder: 5, size: "x8" },
    ] }),
    // srv3: Supermicro 6028U — 6 slots. Slot 0 gets an HBA.
    prisma.pciSlot.createMany({ data: [
      { assetId: srv3.id, sortOrder: 0, size: "x16" },
      { assetId: srv3.id, sortOrder: 1, size: "x16" },
      { assetId: srv3.id, sortOrder: 2, size: "x8" },
      { assetId: srv3.id, sortOrder: 3, size: "x8" },
      { assetId: srv3.id, sortOrder: 4, size: "x8" },
      { assetId: srv3.id, sortOrder: 5, size: "x8" },
    ] }),
    // srv4: Dell R720xd — 7 slots. Slot 0 gets a 2-port 10G NIC.
    prisma.pciSlot.createMany({ data: [
      { assetId: srv4.id, sortOrder: 0, size: "x16" },
      { assetId: srv4.id, sortOrder: 1, size: "x16" },
      { assetId: srv4.id, sortOrder: 2, size: "x8" },
      { assetId: srv4.id, sortOrder: 3, size: "x8" },
      { assetId: srv4.id, sortOrder: 4, size: "x8" },
      { assetId: srv4.id, sortOrder: 5, size: "x8" },
      { assetId: srv4.id, sortOrder: 6, size: "x8" },
    ] }),
    // nas: Synology RS1221+ — 2 M.2 expansion slots (internal)
    prisma.pciSlot.createMany({ data: [
      { assetId: nas.id, sortOrder: 0, size: "M.2 2280" },
      { assetId: nas.id, sortOrder: 1, size: "M.2 2280" },
    ] }),
    // towerServer: HP ML350 Gen9 — 7 full-height slots. Slot 0 gets a 2-port 10G NIC.
    prisma.pciSlot.createMany({ data: [
      { assetId: towerServer.id, sortOrder: 0, size: "x16" },
      { assetId: towerServer.id, sortOrder: 1, size: "x16" },
      { assetId: towerServer.id, sortOrder: 2, size: "x8" },
      { assetId: towerServer.id, sortOrder: 3, size: "x8" },
      { assetId: towerServer.id, sortOrder: 4, size: "x8" },
      { assetId: towerServer.id, sortOrder: 5, size: "x8" },
      { assetId: towerServer.id, sortOrder: 6, size: "x8" },
    ] }),
    // rackBSrv1: Dell R640 — 3 slots. Slot 0 gets a 2-port 10G NIC.
    prisma.pciSlot.createMany({ data: [
      { assetId: rackBSrv1.id, sortOrder: 0, size: "x16" },
      { assetId: rackBSrv1.id, sortOrder: 1, size: "x8" },
      { assetId: rackBSrv1.id, sortOrder: 2, size: "x8" },
    ] }),
    // rackBSrv2: Dell R710 — 6 full-height slots. Slot 0 gets GPU; slot 2 gets RAID HBA.
    prisma.pciSlot.createMany({ data: [
      { assetId: rackBSrv2.id, sortOrder: 0, size: "x16" },
      { assetId: rackBSrv2.id, sortOrder: 1, size: "x8" },
      { assetId: rackBSrv2.id, sortOrder: 2, size: "x8" },
      { assetId: rackBSrv2.id, sortOrder: 3, size: "x8" },
      { assetId: rackBSrv2.id, sortOrder: 4, size: "x16" },
      { assetId: rackBSrv2.id, sortOrder: 5, size: "x8" },
    ] }),
  ]);

  console.log("PCIe slots created");

  // â"€â"€ 5. Drives â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  await Promise.all([
    // srv1 front: 4x Samsung 870 EVO 4TB SSD + 4x Seagate Exos 2TB SAS
    ...([1, 2, 3, 4] as const).map((n) =>
      prisma.drive.create({
        data: {
          name: `Samsung 870 EVO 4TB #${n}`,
          manufacturer: "Samsung", model: "MZ-77E4T0", kind: DriveKind.SSD,
          size: DriveSize.SFF, capacityGB: 4000,
          serialNumber: `S4EVNX${String(n).padStart(6, "0")}`,
          purchaseDate: d("2022-03-10"), purchasePrice: 289.99, purchasedFrom: "Amazon",
          condition: "new", assignedUse: "Unraid array",
          state: LifecycleState.IN_USE,
          installedInId: srv1.id, bayZoneId: srv1Front.id, bayNumber: n,
        },
      })
    ),
    ...([5, 6, 7, 8] as const).map((n) =>
      prisma.drive.create({
        data: {
          name: `Seagate Exos 2TB SAS #${n - 4}`,
          manufacturer: "Seagate", model: "ST2000NX0463", kind: DriveKind.SAS,
          size: DriveSize.SFF, capacityGB: 2000,
          serialNumber: `WN${String(n).padStart(8, "0")}`,
          purchaseDate: d("2020-06-01"), purchasePrice: 65.0, purchasedFrom: "Kijiji",
          condition: "used", assignedUse: "Unraid array",
          state: LifecycleState.IN_USE,
          installedInId: srv1.id, bayZoneId: srv1Front.id, bayNumber: n,
        },
      })
    ),

    // srv2 front: 6x Samsung 870 EVO 2TB SSD (bays 1-6 filled, 7-8 empty)
    ...([1, 2, 3, 4, 5, 6] as const).map((n) =>
      prisma.drive.create({
        data: {
          name: `Samsung 870 EVO 2TB #${n}`,
          manufacturer: "Samsung", model: "MZ-77E2T0", kind: DriveKind.SSD,
          size: DriveSize.SFF, capacityGB: 2000,
          serialNumber: `S4EVNS${String(n).padStart(6, "0")}`,
          purchaseDate: d("2021-02-14"), purchasePrice: 149.99, purchasedFrom: "Amazon",
          condition: "used", assignedUse: "VM storage (Proxmox)",
          state: LifecycleState.IN_USE,
          installedInId: srv2.id, bayZoneId: srv2Front.id, bayNumber: n,
        },
      })
    ),

    // srv3 front: 8x Seagate Exos 12TB HDD (bays 1-8)
    ...([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) =>
      prisma.drive.create({
        data: {
          name: `Seagate Exos X16 12TB #${n}`,
          manufacturer: "Seagate", model: "ST12000NM001G", kind: DriveKind.HDD,
          size: DriveSize.LFF, capacityGB: 12000,
          serialNumber: `WK${String(n).padStart(8, "0")}`,
          purchaseDate: d("2022-09-05"), purchasePrice: 179.99, purchasedFrom: "Amazon",
          condition: "new", assignedUse: "TrueNAS SCALE pool",
          state: LifecycleState.IN_USE,
          installedInId: srv3.id, bayZoneId: srv3Front.id, bayNumber: n,
        },
      })
    ),

    // srv4 front: 10x Seagate Exos 6TB HDD
    ...([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((n) =>
      prisma.drive.create({
        data: {
          name: `Seagate Exos 6TB HDD #${n}`,
          manufacturer: "Seagate", model: "ST6000NM021A", kind: DriveKind.HDD,
          size: DriveSize.LFF, capacityGB: 6000,
          serialNumber: `ZN${String(n).padStart(8, "0")}`,
          purchaseDate: d("2021-11-20"), purchasePrice: 89.99, purchasedFrom: "Amazon",
          condition: "used", assignedUse: "Proxmox backup storage",
          state: LifecycleState.IN_USE,
          installedInId: srv4.id, bayZoneId: srv4Front.id, bayNumber: n,
        },
      })
    ),

    // srv4 rear: 2x Samsung 860 EVO 1TB SSD (OS mirrors)
    ...[1, 2].map((n) =>
      prisma.drive.create({
        data: {
          name: `Samsung 860 EVO 1TB #${n}`,
          manufacturer: "Samsung", model: "MZ-76E1T0", kind: DriveKind.SSD,
          size: DriveSize.SFF, capacityGB: 1000,
          serialNumber: `S4XBNX${String(n).padStart(5, "0")}`,
          purchaseDate: d("2021-11-20"), purchasePrice: 79.99, purchasedFrom: "Amazon",
          condition: "used", assignedUse: "Proxmox OS mirror",
          state: LifecycleState.IN_USE,
          installedInId: srv4.id, bayZoneId: srv4Rear.id, bayNumber: n,
        },
      })
    ),

    // nas: 6x WD Red Pro 8TB (bays 1-6, 2 empty)
    ...([1, 2, 3, 4, 5, 6] as const).map((n) =>
      prisma.drive.create({
        data: {
          name: `WD Red Pro 8TB #${n}`,
          manufacturer: "Western Digital", model: "WD8003FFBX", kind: DriveKind.HDD,
          size: DriveSize.LFF, capacityGB: 8000,
          serialNumber: `WD${String(n).padStart(8, "0")}`,
          purchaseDate: d("2023-04-12"), purchasePrice: 159.99, purchasedFrom: "Amazon",
          condition: "new", assignedUse: "DSM SHR-2 pool",
          state: LifecycleState.IN_USE,
          installedInId: nas.id, bayZoneId: nasFront.id, bayNumber: n,
        },
      })
    ),

    // Drives in storage (uninstalled)
    prisma.drive.create({
      data: {
        name: "WD Red Plus 4TB (spare)",
        manufacturer: "Western Digital", model: "WD40EFZX", kind: DriveKind.HDD,
        size: DriveSize.LFF, capacityGB: 4000,
        purchaseDate: d("2021-05-20"), purchasePrice: 79.99, purchasedFrom: "Newegg",
state: LifecycleState.STORED,
        notes: "Spare for NAS expansion.",
      },
    }),
    prisma.drive.create({
      data: {
        name: "WD Red Plus 4TB (spare #2)",
        manufacturer: "Western Digital", model: "WD40EFZX", kind: DriveKind.HDD,
        size: DriveSize.LFF, capacityGB: 4000,
        purchaseDate: d("2021-05-20"), purchasePrice: 79.99, purchasedFrom: "Newegg",
state: LifecycleState.STORED,
        notes: "Spare for NAS expansion.",
      },
    }),
    prisma.drive.create({
      data: {
        name: "Samsung 990 Pro 2TB NVMe",
        manufacturer: "Samsung", model: "MZ-V9P2T0B/AM", kind: DriveKind.NVME,
        size: DriveSize.M2, capacityGB: 2000,
        purchaseDate: d("2024-01-10"), purchasePrice: 149.99, purchasedFrom: "Amazon",
state: LifecycleState.STORED,
        notes: "Waiting for NVMe riser to arrive.",
      },
    }),
    prisma.drive.create({
      data: {
        name: "Seagate Barracuda 2TB (old)",
        manufacturer: "Seagate", model: "ST2000DM008", kind: DriveKind.HDD,
        size: DriveSize.LFF, capacityGB: 2000,
        purchaseDate: d("2018-03-01"), purchasePrice: 55.0, purchasedFrom: "Best Buy",
state: LifecycleState.STORED,
        notes: "Old desktop drive, keeping as emergency cold backup.",
      },
    }),
    prisma.drive.create({
      data: {
        name: "Seagate Exos 4TB SSD (sold)",
        manufacturer: "Seagate", model: "ST4000NX0433", kind: DriveKind.SSD,
        size: DriveSize.SFF, capacityGB: 4000,
        purchaseDate: d("2020-01-01"), purchasePrice: 200.0, purchasedFrom: "eBay",
state: LifecycleState.SOLD,
        soldDate: d("2024-02-15"), soldPrice: 75.0,
        notes: "Sold after upgrading srv1.",
      },
    }),

    // Tower server: 4x WD Gold 4TB HDD installed, 4 bays empty
    ...([1, 2, 3, 4] as const).map((n) =>
      prisma.drive.create({
        data: {
          name: `WD Gold 4TB #${n}`,
          manufacturer: "Western Digital", model: "WD4003FRYZ", kind: DriveKind.HDD,
          size: DriveSize.LFF, capacityGB: 4000,
          serialNumber: `WDGOLD4T${String(n).padStart(5, "0")}`,
          purchaseDate: d("2023-02-10"), purchasePrice: 115.0, purchasedFrom: "Amazon",
          condition: "new", assignedUse: "Ubuntu data volume (ZFS mirror)",
          state: LifecycleState.IN_USE,
          installedInId: towerServer.id, bayZoneId: ml350Front.id, bayNumber: n,
        },
      })
    ),
  ]);

  // Second rack drives
  await Promise.all([
    // rackBSrv1 (Dell R640): 4x Samsung 870 EVO 2TB SSD in front bays 1-4
    ...([1, 2, 3, 4] as const).map((n) =>
      prisma.drive.create({
        data: {
          name: `Samsung 870 EVO 2TB (R640) #${n}`,
          manufacturer: "Samsung", model: "MZ-77E2T0", kind: DriveKind.SSD,
          size: DriveSize.SFF, capacityGB: 2000,
          serialNumber: `R640S${String(n).padStart(5, "0")}`,
          purchaseDate: d("2023-08-15"), purchasePrice: 109.99, purchasedFrom: "Amazon",
          condition: "new", assignedUse: "Proxmox VM storage",
          state: LifecycleState.IN_USE,
          installedInId: rackBSrv1.id, bayZoneId: rackBSrv1Front.id, bayNumber: n,
        },
      })
    ),
    // rackBSrv2 (Dell R710): 4x Seagate Exos 8TB HDD in front bays 1-4 (4 empty)
    ...([1, 2, 3, 4] as const).map((n) =>
      prisma.drive.create({
        data: {
          name: `Seagate Exos 8TB (R710) #${n}`,
          manufacturer: "Seagate", model: "ST8000NM001G", kind: DriveKind.HDD,
          size: DriveSize.LFF, capacityGB: 8000,
          serialNumber: `R710H${String(n).padStart(5, "0")}`,
          purchaseDate: d("2022-03-10"), purchasePrice: 139.99, purchasedFrom: "Amazon",
          condition: "used", assignedUse: "Ubuntu ZFS mirror",
          state: LifecycleState.IN_USE,
          installedInId: rackBSrv2.id, bayZoneId: rackBSrv2Front.id, bayNumber: n,
        },
      })
    ),
  ]);

  console.log("Drives created");

  // â"€â"€ 6. Components â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  await Promise.all([
    // srv1: 2x Xeon E5-2680 v4 + 8x 16GB DDR4 ECC
    ...([1, 2] as const).map((n) =>
      prisma.component.create({
        data: {
          name: `Intel Xeon E5-2680 v4 #${n}`,
          type: ComponentType.CPU,
          manufacturer: "Intel", model: "E5-2680 v4",
          speedGHz: 2.4, cores: 14, threads: 28, socket: "LGA2011-3", tdpWatts: 120,
          purchaseDate: d("2020-06-01"), purchasePrice: 65.0, purchasedFrom: "Kijiji",
          state: LifecycleState.IN_USE,
          installedInId: srv1.id,
        },
      })
    ),
    ...([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) =>
      prisma.component.create({
        data: {
          name: `16GB DDR4-2133 ECC REG #${n}`,
          type: ComponentType.RAM,
          manufacturer: "Samsung", model: "M393A2G40DB0-CPB",
          capacityGB: 16, speedMHz: 2133, generation: "DDR4",
          ecc: true, formFactor: "RDIMM",
          purchaseDate: d("2020-06-01"), purchasePrice: 22.0, purchasedFrom: "Kijiji",
          state: LifecycleState.IN_USE,
          installedInId: srv1.id,
        },
      })
    ),

    // srv2: 2x Xeon E5-2690 v4 + 8x 16GB DDR4 ECC
    ...([1, 2] as const).map((n) =>
      prisma.component.create({
        data: {
          name: `Intel Xeon E5-2690 v4 #${n}`,
          type: ComponentType.CPU,
          manufacturer: "Intel", model: "E5-2690 v4",
          speedGHz: 2.6, cores: 14, threads: 28, socket: "LGA2011-3", tdpWatts: 135,
          purchaseDate: d("2021-02-14"), purchasePrice: 80.0, purchasedFrom: "eBay",
state: LifecycleState.IN_USE,
          installedInId: srv2.id,
        },
      })
    ),
    ...([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) =>
      prisma.component.create({
        data: {
          name: `16GB DDR4-2133 ECC REG #${n + 8}`,
          type: ComponentType.RAM,
          manufacturer: "Hynix", model: "HMA42GR7AFR4N-TF",
          capacityGB: 16, speedMHz: 2133, generation: "DDR4",
          ecc: true, formFactor: "RDIMM",
          purchaseDate: d("2021-02-14"), purchasePrice: 22.0, purchasedFrom: "eBay",
state: LifecycleState.IN_USE,
          installedInId: srv2.id,
        },
      })
    ),

    // srv3 Supermicro: 2x Xeon E5-2640 v4 + 4x 32GB + RAID card
    ...([1, 2] as const).map((n) =>
      prisma.component.create({
        data: {
          name: `Intel Xeon E5-2640 v4 #${n}`,
          type: ComponentType.CPU,
          manufacturer: "Intel", model: "E5-2640 v4",
          speedGHz: 2.4, cores: 10, threads: 20, socket: "LGA2011-3", tdpWatts: 90,
          purchaseDate: d("2022-09-05"), purchasePrice: 50.0, purchasedFrom: "eBay",
state: LifecycleState.IN_USE,
          installedInId: srv3.id,
        },
      })
    ),
    ...([1, 2, 3, 4] as const).map((n) =>
      prisma.component.create({
        data: {
          name: `32GB DDR4-2400 ECC REG #${n}`,
          type: ComponentType.RAM,
          manufacturer: "Micron", model: "MTA36ASF4G72PZ-2G3",
          capacityGB: 32, speedMHz: 2400, generation: "DDR4",
          ecc: true, formFactor: "RDIMM",
          purchaseDate: d("2022-09-05"), purchasePrice: 45.0, purchasedFrom: "eBay",
state: LifecycleState.IN_USE,
          installedInId: srv3.id,
        },
      })
    ),
    prisma.component.create({
      data: {
        name: "LSI MegaRAID SAS 9361-8i",
        type: ComponentType.RAID_CONTROLLER,
        manufacturer: "LSI", model: "9361-8i",
        specs: "8-port SAS/SATA 12Gb/s, 1GB cache, PCIe 3.0 x8",
        cardInterface: "PCIe 3.0 x8",
        purchaseDate: d("2022-09-05"), purchasePrice: 85.0, purchasedFrom: "eBay",
state: LifecycleState.IN_USE,
        installedInId: srv3.id,
      },
    }),

    // srv4 Dell R720xd: 2x Xeon E5-2640 v2 + 8x 8GB DDR3 + RAID card
    ...([1, 2] as const).map((n) =>
      prisma.component.create({
        data: {
          name: `Intel Xeon E5-2640 v2 #${n}`,
          type: ComponentType.CPU,
          manufacturer: "Intel", model: "E5-2640 v2",
          speedGHz: 2.0, cores: 8, threads: 16, socket: "LGA2011", tdpWatts: 95,
          purchaseDate: d("2021-11-20"), purchasePrice: 30.0, purchasedFrom: "eBay",
state: LifecycleState.IN_USE,
          installedInId: srv4.id,
        },
      })
    ),
    ...([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) =>
      prisma.component.create({
        data: {
          name: `8GB DDR3-1600 ECC REG #${n}`,
          type: ComponentType.RAM,
          manufacturer: "Samsung", model: "M393B1G70QH0-YK0",
          capacityGB: 8, speedMHz: 1600, generation: "DDR3",
          ecc: true, formFactor: "RDIMM",
          purchaseDate: d("2021-11-20"), purchasePrice: 10.0, purchasedFrom: "eBay",
state: LifecycleState.IN_USE,
          installedInId: srv4.id,
        },
      })
    ),
    prisma.component.create({
      data: {
        name: "Dell PERC H710P",
        type: ComponentType.RAID_CONTROLLER,
        manufacturer: "Dell", model: "H710P",
        specs: "6Gb/s SAS/SATA, 1GB NV cache, PCIe 2.0 x8",
        cardInterface: "PCIe 2.0 x8",
        purchaseDate: d("2021-11-20"), purchasePrice: 40.0, purchasedFrom: "eBay",
state: LifecycleState.IN_USE,
        installedInId: srv4.id,
      },
    }),

    // Spare components in Parts Bin
    prisma.component.create({
      data: {
        name: "Intel Xeon E5-2680 v3 (spare)",
        type: ComponentType.CPU,
        manufacturer: "Intel", model: "E5-2680 v3",
        speedGHz: 2.5, cores: 12, threads: 24, socket: "LGA2011-3", tdpWatts: 120,
        purchaseDate: d("2022-05-01"), purchasePrice: 40.0, purchasedFrom: "eBay",
state: LifecycleState.STORED,
        notes: "Spare for srv1/srv2. Slightly lower clock than installed CPUs.",
      },
    }),
    ...([1, 2, 3, 4] as const).map((n) =>
      prisma.component.create({
        data: {
          name: `16GB DDR4-2133 ECC REG (spare) #${n}`,
          type: ComponentType.RAM,
          manufacturer: "Samsung", model: "M393A2G40DB0-CPB",
          capacityGB: 16, speedMHz: 2133, generation: "DDR4",
          ecc: true, formFactor: "RDIMM",
          purchaseDate: d("2023-01-01"), purchasePrice: 15.0, purchasedFrom: "eBay",
state: LifecycleState.STORED,
        },
      })
    ),
    prisma.component.create({
      data: {
        name: "HP Ethernet 10Gb 2-port 560FLR-SFP+ Adapter",
        type: ComponentType.NIC_CARD,
        manufacturer: "HP", model: "665249-B21",
        portCount: 2, portType: PortType.SFP_PLUS, portSpeed: "10G",
        cardInterface: "PCIe 2.0 x8",
        purchaseDate: d("2022-01-01"), purchasePrice: 55.0, purchasedFrom: "eBay",
state: LifecycleState.STORED,
        notes: "Pulled from srv1 during cleanup. Can reinstall for 10G uplink.",
      },
    }),

    // Tower server: 2x Xeon E5-2620 v4 + 4x 16GB DDR4 ECC
    ...([1, 2] as const).map((n) =>
      prisma.component.create({
        data: {
          name: `Intel Xeon E5-2620 v4 #${n}`,
          type: ComponentType.CPU,
          manufacturer: "Intel", model: "E5-2620 v4",
          speedGHz: 2.1, cores: 8, threads: 16, socket: "LGA2011-3", tdpWatts: 85,
          purchaseDate: d("2023-02-10"), purchasePrice: 35.0, purchasedFrom: "eBay",
          state: LifecycleState.IN_USE,
          installedInId: towerServer.id,
        },
      })
    ),
    ...([1, 2, 3, 4] as const).map((n) =>
      prisma.component.create({
        data: {
          name: `16GB DDR4-2133 ECC REG (ML350) #${n}`,
          type: ComponentType.RAM,
          manufacturer: "Kingston", model: "KVR21R15D4/16",
          capacityGB: 16, speedMHz: 2133, generation: "DDR4",
          ecc: true, formFactor: "RDIMM",
          purchaseDate: d("2023-02-10"), purchasePrice: 20.0, purchasedFrom: "eBay",
          state: LifecycleState.IN_USE,
          installedInId: towerServer.id,
        },
      })
    ),
  ]);

  // ── 6.5. Second rack components + PCIe NIC/GPU installations ────────────────
  // Create NIC cards / GPUs / HBAs, install them in servers, then wire each
  // component to the corresponding PCIe slot via occupiedByComponentId.

  // Find the specific PCIe slots we want to occupy (by assetId + sortOrder).
  const [
    srv1Slot0, srv2Slot0, srv2Slot2, srv3Slot0,
    srv4Slot0, towerSlot0,
    rackBSrv1Slot0, rackBSrv2Slot0, rackBSrv2Slot2,
  ] = await Promise.all([
    prisma.pciSlot.findFirst({ where: { assetId: srv1.id, sortOrder: 0 } }),
    prisma.pciSlot.findFirst({ where: { assetId: srv2.id, sortOrder: 0 } }),
    prisma.pciSlot.findFirst({ where: { assetId: srv2.id, sortOrder: 2 } }),
    prisma.pciSlot.findFirst({ where: { assetId: srv3.id, sortOrder: 0 } }),
    prisma.pciSlot.findFirst({ where: { assetId: srv4.id, sortOrder: 0 } }),
    prisma.pciSlot.findFirst({ where: { assetId: towerServer.id, sortOrder: 0 } }),
    prisma.pciSlot.findFirst({ where: { assetId: rackBSrv1.id, sortOrder: 0 } }),
    prisma.pciSlot.findFirst({ where: { assetId: rackBSrv2.id, sortOrder: 0 } }),
    prisma.pciSlot.findFirst({ where: { assetId: rackBSrv2.id, sortOrder: 2 } }),
  ]);

  // Create the NIC/GPU/HBA components and install them in their servers.
  const [
    srv1Nic, srv2Gpu, srv2Nic4port, srv3Hba, srv4Nic,
    towerNic, rackBSrv1Nic, rackBSrv2Gpu, rackBSrv2Hba,
  ] = await Promise.all([
    // srv1: Intel X520-DA2 2-port 10G SFP+ in slot 0 (x16)
    prisma.component.create({ data: {
      name: "Intel X520-DA2 Dual-Port 10G SFP+",
      type: ComponentType.NIC_CARD, manufacturer: "Intel", model: "X520-DA2",
      portCount: 2, portType: PortType.SFP_PLUS, portSpeed: "10G",
      cardInterface: "PCIe 2.0 x8",
      purchaseDate: d("2020-06-01"), purchasePrice: 55.0, purchasedFrom: "eBay",
      state: LifecycleState.IN_USE, installedInId: srv1.id,
      notes: "10G SFP+ uplink for Unraid — used as the primary data NIC.",
    } }),
    // srv2: NVIDIA Quadro K4000 GPU in slot 0 (x16)
    prisma.component.create({ data: {
      name: "NVIDIA Quadro K4000 3GB",
      type: ComponentType.GPU, manufacturer: "NVIDIA", model: "Quadro K4000",
      cardInterface: "PCIe 3.0 x16",
      purchaseDate: d("2021-06-10"), purchasePrice: 60.0, purchasedFrom: "eBay",
      state: LifecycleState.IN_USE, installedInId: srv2.id,
      notes: "Passed through to the Windows Server 2022 VM for RDP hardware acceleration.",
    } }),
    // srv2: Intel X710-T4L quad-port 10G NIC in slot 2 (x8)
    prisma.component.create({ data: {
      name: "Intel X710-T4L Quad-Port 10GBase-T",
      type: ComponentType.NIC_CARD, manufacturer: "Intel", model: "X710-T4L",
      portCount: 4, portType: PortType.ETHERNET, portSpeed: "10G",
      cardInterface: "PCIe 3.0 x8",
      purchaseDate: d("2021-06-10"), purchasePrice: 175.0, purchasedFrom: "Amazon",
      state: LifecycleState.IN_USE, installedInId: srv2.id,
      notes: "Used for 10G VM networking on Proxmox. DEMO: 4-port NIC shows 4 port buttons in inspector.",
    } }),
    // srv3: LSI 9400-16i 16-port HBA in slot 0 (x16)
    prisma.component.create({ data: {
      name: "LSI 9400-16i 16-Port HBA",
      type: ComponentType.RAID_CONTROLLER, manufacturer: "LSI", model: "9400-16i",
      cardInterface: "PCIe 3.0 x8",
      purchaseDate: d("2022-09-05"), purchasePrice: 120.0, purchasedFrom: "eBay",
      state: LifecycleState.IN_USE, installedInId: srv3.id,
      notes: "IT mode — ZFS direct disk access on TrueNAS SCALE.",
    } }),
    // srv4: HP FlexFabric 2-port 10G NIC in slot 0 (x16)
    prisma.component.create({ data: {
      name: "HP FlexFabric 10Gb 2-port 536FLR-T",
      type: ComponentType.NIC_CARD, manufacturer: "HP", model: "536FLR-T",
      portCount: 2, portType: PortType.ETHERNET, portSpeed: "10G",
      cardInterface: "PCIe 2.0 x8",
      purchaseDate: d("2021-11-20"), purchasePrice: 45.0, purchasedFrom: "eBay",
      state: LifecycleState.IN_USE, installedInId: srv4.id,
      notes: "10G NIC on the Dell R720xd. DEMO: appears in topology NIC zone via PCIe slot.",
    } }),
    // towerServer: Intel X550-T2 2-port 10GBase-T NIC in slot 0 (x16)
    prisma.component.create({ data: {
      name: "Intel X550-T2 Dual-Port 10GBase-T",
      type: ComponentType.NIC_CARD, manufacturer: "Intel", model: "X550-T2",
      portCount: 2, portType: PortType.ETHERNET, portSpeed: "10G",
      cardInterface: "PCIe 3.0 x4",
      purchaseDate: d("2023-02-10"), purchasePrice: 95.0, purchasedFrom: "eBay",
      state: LifecycleState.IN_USE, installedInId: towerServer.id,
      notes: "10G uplink for Ubuntu CI/build workloads.",
    } }),
    // rackBSrv1 (Dell R640): Intel X710-DA2 2-port 10G SFP+ in slot 0 (x16)
    prisma.component.create({ data: {
      name: "Intel X710-DA2 Dual-Port 10G SFP+",
      type: ComponentType.NIC_CARD, manufacturer: "Intel", model: "X710-DA2",
      portCount: 2, portType: PortType.SFP_PLUS, portSpeed: "10G",
      cardInterface: "PCIe 3.0 x8",
      purchaseDate: d("2023-08-15"), purchasePrice: 75.0, purchasedFrom: "eBay",
      state: LifecycleState.IN_USE, installedInId: rackBSrv1.id,
      notes: "DEMO: NIC card in PCIe slot — primary test case for PCIe NIC port rendering in topology.",
    } }),
    // rackBSrv2 (Dell R710): NVIDIA Tesla M40 GPU in slot 0 (x16)
    prisma.component.create({ data: {
      name: "NVIDIA Tesla M40 24GB",
      type: ComponentType.GPU, manufacturer: "NVIDIA", model: "Tesla M40",
      cardInterface: "PCIe 3.0 x16",
      purchaseDate: d("2022-03-10"), purchasePrice: 180.0, purchasedFrom: "eBay",
      state: LifecycleState.IN_USE, installedInId: rackBSrv2.id,
      notes: "DEMO: GPU in PCIe slot. Tests that non-NIC cards show as 'occupied' in the slot list without adding NIC port buttons.",
    } }),
    // rackBSrv2 (Dell R710): Broadcom 9300-8i RAID HBA in slot 2 (x8)
    prisma.component.create({ data: {
      name: "Broadcom 9300-8i RAID Controller",
      type: ComponentType.RAID_CONTROLLER, manufacturer: "Broadcom", model: "9300-8i",
      cardInterface: "PCIe 3.0 x8",
      purchaseDate: d("2022-03-10"), purchasePrice: 65.0, purchasedFrom: "eBay",
      state: LifecycleState.IN_USE, installedInId: rackBSrv2.id,
    } }),
  ]);

  // Wire each component to its PCIe slot.
  await Promise.all([
    srv1Slot0   && prisma.pciSlot.update({ where: { id: srv1Slot0.id },   data: { occupiedByComponentId: srv1Nic.id } }),
    srv2Slot0   && prisma.pciSlot.update({ where: { id: srv2Slot0.id },   data: { occupiedByComponentId: srv2Gpu.id } }),
    srv2Slot2   && prisma.pciSlot.update({ where: { id: srv2Slot2.id },   data: { occupiedByComponentId: srv2Nic4port.id } }),
    srv3Slot0   && prisma.pciSlot.update({ where: { id: srv3Slot0.id },   data: { occupiedByComponentId: srv3Hba.id } }),
    srv4Slot0   && prisma.pciSlot.update({ where: { id: srv4Slot0.id },   data: { occupiedByComponentId: srv4Nic.id } }),
    towerSlot0  && prisma.pciSlot.update({ where: { id: towerSlot0.id },  data: { occupiedByComponentId: towerNic.id } }),
    rackBSrv1Slot0  && prisma.pciSlot.update({ where: { id: rackBSrv1Slot0.id },  data: { occupiedByComponentId: rackBSrv1Nic.id } }),
    rackBSrv2Slot0  && prisma.pciSlot.update({ where: { id: rackBSrv2Slot0.id },  data: { occupiedByComponentId: rackBSrv2Gpu.id } }),
    rackBSrv2Slot2  && prisma.pciSlot.update({ where: { id: rackBSrv2Slot2.id },  data: { occupiedByComponentId: rackBSrv2Hba.id } }),
  ].filter(Boolean));

  // Second rack server base components (CPUs + RAM)
  await Promise.all([
    // rackBSrv1 (Dell R640): 2x Xeon Gold 5118 + 6x 16GB DDR4 ECC
    ...([1, 2] as const).map((n) => prisma.component.create({ data: {
      name: `Intel Xeon Gold 5118 #${n}`, type: ComponentType.CPU,
      manufacturer: "Intel", model: "Gold 5118",
      speedGHz: 2.3, cores: 12, threads: 24, socket: "LGA3647", tdpWatts: 105,
      purchaseDate: d("2023-08-15"), purchasePrice: 90.0, purchasedFrom: "eBay",
      state: LifecycleState.IN_USE, installedInId: rackBSrv1.id,
    } })),
    ...([1, 2, 3, 4, 5, 6] as const).map((n) => prisma.component.create({ data: {
      name: `16GB DDR4-2666 ECC RDIMM (R640) #${n}`, type: ComponentType.RAM,
      manufacturer: "Samsung", model: "M393A2K43CB2-CTD",
      capacityGB: 16, speedMHz: 2666, generation: "DDR4", ecc: true, formFactor: "RDIMM",
      purchaseDate: d("2023-08-15"), purchasePrice: 20.0, purchasedFrom: "eBay",
      state: LifecycleState.IN_USE, installedInId: rackBSrv1.id,
    } })),
    // rackBSrv2 (Dell R710): 2x Xeon X5680 + 8x 8GB DDR3 ECC
    ...([1, 2] as const).map((n) => prisma.component.create({ data: {
      name: `Intel Xeon X5680 #${n}`, type: ComponentType.CPU,
      manufacturer: "Intel", model: "X5680",
      speedGHz: 3.33, cores: 6, threads: 12, socket: "LGA1366", tdpWatts: 130,
      purchaseDate: d("2022-03-10"), purchasePrice: 20.0, purchasedFrom: "Kijiji",
      state: LifecycleState.IN_USE, installedInId: rackBSrv2.id,
    } })),
    ...([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n) => prisma.component.create({ data: {
      name: `8GB DDR3-1333 ECC REG (R710) #${n}`, type: ComponentType.RAM,
      manufacturer: "Hynix", model: "HMT31GR7EFR4C-H9",
      capacityGB: 8, speedMHz: 1333, generation: "DDR3", ecc: true, formFactor: "RDIMM",
      purchaseDate: d("2022-03-10"), purchasePrice: 8.0, purchasedFrom: "Kijiji",
      state: LifecycleState.IN_USE, installedInId: rackBSrv2.id,
    } })),
  ]);

  console.log("PCIe slot occupations + second rack components done");

  console.log("Components created");

  // â"€â"€ 7. PSUs â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  await Promise.all([
    // srv1: 2x HP 500W Flex Slot
    ...[0, 1].map((n) =>
      prisma.psu.create({
        data: {
          assetId: srv1.id, sortOrder: n, side: DeviceSide.RIGHT,
          wattage: 500, portCount: 1, state: LifecycleState.IN_USE,
          manufacturer: "HP", model: "720478-B21",
          purchaseDate: d("2020-06-01"), purchasePrice: 35.0, purchasedFrom: "Kijiji",
        },
      })
    ),
    // srv2: 2x HP 500W Flex Slot
    ...[0, 1].map((n) =>
      prisma.psu.create({
        data: {
          assetId: srv2.id, sortOrder: n, side: DeviceSide.RIGHT,
          wattage: 500, portCount: 1, state: LifecycleState.IN_USE,
          manufacturer: "HP", model: "720478-B21",
          purchaseDate: d("2021-02-14"), purchasePrice: 35.0, purchasedFrom: "eBay",
        },
      })
    ),
    // srv3: 2x Supermicro 800W
    ...[0, 1].map((n) =>
      prisma.psu.create({
        data: {
          assetId: srv3.id, sortOrder: n, side: DeviceSide.RIGHT,
          wattage: 800, portCount: 1, state: LifecycleState.IN_USE,
          manufacturer: "Supermicro", model: "PWS-802A-1R",
          purchaseDate: d("2022-09-05"), purchasePrice: 60.0, purchasedFrom: "eBay",
        },
      })
    ),
    // srv4: 2x Dell 750W
    ...[0, 1].map((n) =>
      prisma.psu.create({
        data: {
          assetId: srv4.id, sortOrder: n, side: DeviceSide.RIGHT,
          wattage: 750, portCount: 1, state: LifecycleState.IN_USE,
          manufacturer: "Dell", model: "A750P-00",
          purchaseDate: d("2021-11-20"), purchasePrice: 25.0, purchasedFrom: "eBay",
        },
      })
    ),
    // nas: 1x Synology 150W
    prisma.psu.create({
      data: {
        assetId: nas.id, sortOrder: 0, side: DeviceSide.RIGHT,
        wattage: 150, portCount: 1, state: LifecycleState.IN_USE,
        manufacturer: "Synology",
      },
    }),
    // ups: internal PSU (not a field PSU)
    // kvm: no PSU fields needed

    // towerServer: 2x HP 460W redundant PSU
    ...[0, 1].map((n) =>
      prisma.psu.create({
        data: {
          assetId: towerServer.id, sortOrder: n, side: DeviceSide.RIGHT,
          wattage: 460, portCount: 1, state: LifecycleState.IN_USE,
          manufacturer: "HP", model: "503296-B21",
          purchaseDate: d("2023-02-10"), purchasePrice: 28.0, purchasedFrom: "eBay",
        },
      })
    ),
  ]);

  // PSUs for second rack servers
  await Promise.all([
    // rackBSrv1 (Dell R640): 2x Dell 550W
    ...[0, 1].map((n) => prisma.psu.create({ data: {
      assetId: rackBSrv1.id, sortOrder: n, side: DeviceSide.RIGHT,
      wattage: 550, portCount: 1, state: LifecycleState.IN_USE,
      manufacturer: "Dell", model: "H550EF-00",
      purchaseDate: d("2023-08-15"), purchasePrice: 35.0, purchasedFrom: "eBay",
    } })),
    // rackBSrv2 (Dell R710): 2x Dell 870W
    ...[0, 1].map((n) => prisma.psu.create({ data: {
      assetId: rackBSrv2.id, sortOrder: n, side: DeviceSide.RIGHT,
      wattage: 870, portCount: 1, state: LifecycleState.IN_USE,
      manufacturer: "Dell", model: "A870P-00",
      purchaseDate: d("2022-03-10"), purchasePrice: 30.0, purchasedFrom: "eBay",
    } })),
  ]);

  console.log("PSUs created");

  // â"€â"€ 8. Port Groups â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const [swAccessPorts, swUplinkPorts, gwLanPorts, gwSfpPorts, ml350EthPorts, ppPorts] = await Promise.all([
    // Switch: 48-port access (PoE) + 4-port SFP+
    prisma.portGroup.create({
      data: {
        assetId: sw.id, name: "Access (PoE)", portCount: 48,
        portType: PortType.ETHERNET, portSpeed: "1G",
        poePerPort: 15, side: DeviceSide.LEFT, sortOrder: 0,
      },
    }),
    prisma.portGroup.create({
      data: {
        assetId: sw.id, name: "Uplinks", portCount: 4,
        portType: PortType.SFP_PLUS, portSpeed: "10G",
        side: DeviceSide.RIGHT, sortOrder: 1,
      },
    }),
    // Gateway: 8-port LAN + 2-port SFP+
    prisma.portGroup.create({
      data: {
        assetId: gw.id, name: "LAN", portCount: 8,
        portType: PortType.ETHERNET, portSpeed: "1G",
        side: DeviceSide.LEFT, sortOrder: 0,
      },
    }),
    prisma.portGroup.create({
      data: {
        assetId: gw.id, name: "SFP+", portCount: 2,
        portType: PortType.SFP_PLUS, portSpeed: "10G",
        side: DeviceSide.RIGHT, sortOrder: 1,
      },
    }),
    // Tower server: 2-port built-in GbE
    prisma.portGroup.create({
      data: {
        assetId: towerServer.id, name: "LAN", portCount: 2,
        portType: PortType.ETHERNET, portSpeed: "1G",
        side: DeviceSide.LEFT, sortOrder: 0,
      },
    }),
    // Patch panel: 24-port Cat6 (passive — front and rear share the same group)
    prisma.portGroup.create({
      data: {
        assetId: patchPanel.id, name: "Cat6", portCount: 24,
        portType: PortType.ETHERNET, portSpeed: "1G",
        side: DeviceSide.LEFT, sortOrder: 0,
      },
    }),
  ]);

  // IPMI port groups — one per server that has a BMC/iLO/iDRAC management port.
  // These are distinct RJ45 ports that give out-of-band network access to the
  // server's management controller (iLO on HP, iDRAC on Dell, IPMI on Supermicro).
  const [srv1Ilo, srv2Ilo, srv3Ipmi, srv4Idrac, ml350Ilo] = await Promise.all([
    prisma.portGroup.create({
      data: { assetId: srv1.id, name: "iLO 4", portCount: 1, portType: PortType.IPMI, side: DeviceSide.CENTER, sortOrder: 0 },
    }),
    prisma.portGroup.create({
      data: { assetId: srv2.id, name: "iLO 4", portCount: 1, portType: PortType.IPMI, side: DeviceSide.CENTER, sortOrder: 0 },
    }),
    prisma.portGroup.create({
      data: { assetId: srv3.id, name: "IPMI", portCount: 1, portType: PortType.IPMI, side: DeviceSide.CENTER, sortOrder: 0 },
    }),
    prisma.portGroup.create({
      data: { assetId: srv4.id, name: "iDRAC 7", portCount: 1, portType: PortType.IPMI, side: DeviceSide.CENTER, sortOrder: 0 },
    }),
    prisma.portGroup.create({
      data: { assetId: towerServer.id, name: "iLO 4", portCount: 1, portType: PortType.IPMI, side: DeviceSide.CENTER, sortOrder: 1 },
    }),
  ]);

  // Port groups for second rack assets
  const [rackBSrv1Idrac, rackBSrv2Idrac, rackBSwAccess, rackBSwCombo] = await Promise.all([
    prisma.portGroup.create({
      data: { assetId: rackBSrv1.id, name: "iDRAC 9", portCount: 1, portType: PortType.IPMI, side: DeviceSide.CENTER, sortOrder: 0 },
    }),
    prisma.portGroup.create({
      data: { assetId: rackBSrv2.id, name: "iDRAC 6", portCount: 1, portType: PortType.IPMI, side: DeviceSide.CENTER, sortOrder: 0 },
    }),
    prisma.portGroup.create({
      data: { assetId: rackBSw.id, name: "Access", portCount: 24, portType: PortType.ETHERNET, portSpeed: "1G", side: DeviceSide.LEFT, sortOrder: 0 },
    }),
    prisma.portGroup.create({
      data: { assetId: rackBSw.id, name: "Combo (GbE/SFP)", portCount: 4, portType: PortType.SFP, portSpeed: "1G", side: DeviceSide.RIGHT, sortOrder: 1 },
    }),
  ]);

  console.log("Port groups created");

  // â"€â"€ 9. Outlet Groups â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const [upsBattBacked, upsSurge, pduOutlets, towerUpsBB, towerUpsSurge] = await Promise.all([
    prisma.outletGroup.create({
      data: {
        assetId: ups.id, name: "Battery Backup", outletCount: 8,
        outletType: "NEMA 5-15R", batteryBacked: true,
        surgeProtected: true, side: DeviceSide.LEFT, sortOrder: 0,
      },
    }),
    prisma.outletGroup.create({
      data: {
        assetId: ups.id, name: "Surge Only", outletCount: 4,
        outletType: "NEMA 5-15R", batteryBacked: false,
        surgeProtected: true, side: DeviceSide.RIGHT, sortOrder: 1,
      },
    }),
    prisma.outletGroup.create({
      data: {
        assetId: pdu.id, name: "Outlets", outletCount: 12,
        outletType: "C13", batteryBacked: false,
        surgeProtected: false, side: DeviceSide.CENTER, sortOrder: 0,
      },
    }),
    // Tower UPS — 6 battery-backed + 2 surge-only (NEMA 5-15R)
    prisma.outletGroup.create({
      data: {
        assetId: towerUps.id, name: "Battery Backup", outletCount: 6,
        outletType: "NEMA 5-15R", batteryBacked: true,
        surgeProtected: true, side: DeviceSide.LEFT, sortOrder: 0,
      },
    }),
    prisma.outletGroup.create({
      data: {
        assetId: towerUps.id, name: "Surge Only", outletCount: 2,
        outletType: "NEMA 5-15R", batteryBacked: false,
        surgeProtected: true, side: DeviceSide.RIGHT, sortOrder: 1,
      },
    }),
  ]);

  console.log("Outlet groups created");

  // â"€â"€ 10. Batteries â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  await prisma.battery.create({
    data: {
      name: "APC RBC7 Battery Cartridge",
      manufacturer: "APC", model: "RBC7",
      voltage: 48.0, capacityAh: 9.0, quantity: 1,
      installDate: d("2023-01-15"),
      purchaseDate: d("2023-01-10"), purchasePrice: 129.99, purchasedFrom: "Amazon",
      state: LifecycleState.IN_USE,
      installedInId: ups.id,
      notes: "Replace before end of 2026.",
    },
  });

  // Spare battery in cabinet
  await prisma.battery.create({
    data: {
      name: "APC RBC7 Spare",
      manufacturer: "APC", model: "RBC7",
      voltage: 48.0, capacityAh: 9.0, quantity: 1,
      purchaseDate: d("2024-02-01"), purchasePrice: 119.99, purchasedFrom: "Amazon",
      state: LifecycleState.STORED,
      storageId: storageCabinet.id,
      notes: "Bought ahead of time. Ready to swap.",
    },
  });

  // Battery inside the tower UPS
  await prisma.battery.create({
    data: {
      name: "APC SUA1500 Internal Battery",
      manufacturer: "APC", model: "RBC109",
      voltage: 24.0, capacityAh: 9.0, quantity: 1,
      installDate: d("2023-06-15"),
      purchaseDate: d("2023-06-15"), purchasePrice: 89.99, purchasedFrom: "Amazon",
      state: LifecycleState.IN_USE,
      installedInId: towerUps.id,
      notes: "Original battery. Plan to replace around 2026.",
    },
  });

  console.log("Batteries created");

  // â"€â"€ 11. Consumables â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  await prisma.consumable.createMany({
    data: [
      {
        name: "Cat6 Ethernet Patch Cables (0.5m)",
        type: "Cable", quantity: 20,
        location: "Server Room Cabinet",
        purchaseDate: d("2022-06-01"), purchasePrice: 15.99, purchasedFrom: "Amazon",
        state: LifecycleState.IN_USE,
      },
      {
        name: "Cat6a Ethernet Patch Cables (1m)",
        type: "Cable", quantity: 8,
        location: "Server Room Cabinet",
        purchaseDate: d("2022-06-01"), purchasePrice: 22.99, purchasedFrom: "Amazon",
        state: LifecycleState.IN_USE,
      },
      {
        name: "C13/C14 Power Cables (1.8m)",
        type: "Power Cable", quantity: 12,
        location: "Server Room Cabinet",
        purchaseDate: d("2021-05-01"), purchasePrice: 29.99, purchasedFrom: "Amazon",
        state: LifecycleState.IN_USE,
      },
      {
        name: "Noctua NT-H1 Thermal Paste",
        type: "Thermal Compound", quantity: 3,
        location: "Parts Bin",
        purchaseDate: d("2023-03-15"), purchasePrice: 8.99, purchasedFrom: "Amazon",
        state: LifecycleState.IN_USE,
      },
      {
        name: "Velcro Cable Ties",
        type: "Cable Management", quantity: 50,
        location: "Server Room Cabinet",
        purchaseDate: d("2022-01-01"), purchasePrice: 9.99, purchasedFrom: "Amazon",
        state: LifecycleState.IN_USE,
      },
      {
        name: "SFP+ DAC Cable 1m (10G)",
        type: "Cable", quantity: 4,
        location: "Server Room Cabinet",
        purchaseDate: d("2022-02-20"), purchasePrice: 14.99, purchasedFrom: "fs.com",
        state: LifecycleState.IN_USE,
      },
      {
        name: "SATA Cables",
        type: "Cable", quantity: 10,
        location: "Parts Bin",
        purchaseDate: d("2020-01-01"), purchasePrice: 12.99, purchasedFrom: "Amazon",
        state: LifecycleState.IN_USE,
      },
      {
        name: "Isopropyl Alcohol 99% (500mL)",
        type: "Cleaning", quantity: 1,
        location: "Parts Bin",
        purchaseDate: d("2023-05-10"), purchasePrice: 11.99, purchasedFrom: "Amazon",
        state: LifecycleState.IN_USE,
      },
    ],
  });

  console.log("Consumables created");

  // â"€â"€ 12. Licenses â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const [licUnraid, licWindows, licTruenas, licPlex, licTailscale] = await Promise.all([
    prisma.license.create({
      data: {
        name: "Unraid OS Pro",
        type: "OS",
        licenseKey: "UNRAID-PRO-XXXX-XXXX-XXXX",
        seats: 1,
        renewalPeriod: RenewalPeriod.PERPETUAL,
        purchaseDate: d("2020-06-01"),
        cost: 129.0,
        purchasedFrom: "Lime Technology",
        notes: "Unlimited drives. Tied to USB flash boot key on srv1.",
      },
    }),
    prisma.license.create({
      data: {
        name: "Windows Server 2022 Datacenter",
        type: "OS",
        licenseKey: "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
        seats: 2,
        renewalPeriod: RenewalPeriod.PERPETUAL,
        purchaseDate: d("2022-11-01"),
        cost: 499.0,
        purchasedFrom: "eBay (OEM)",
        notes: "Covers 2 VMs. Datacenter edition = unlimited VMs per licensed host.",
      },
    }),
    prisma.license.create({
      data: {
        name: "TrueNAS SCALE",
        type: "OS",
        seats: null,
        renewalPeriod: RenewalPeriod.PERPETUAL,
        purchaseDate: d("2022-09-05"),
        cost: 0.0,
        purchasedFrom: "iXsystems",
        notes: "Free, open source. No key required.",
      },
    }),
    prisma.license.create({
      data: {
        name: "Plex Pass (Lifetime)",
        type: "SOFTWARE",
        seats: 1,
        renewalPeriod: RenewalPeriod.PERPETUAL,
        purchaseDate: d("2021-11-30"),
        cost: 119.99,
        purchasedFrom: "Plex (Black Friday)",
        notes: "Lifetime pass - bought during sale.",
      },
    }),
    prisma.license.create({
      data: {
        name: "Tailscale Team",
        type: "SOFTWARE",
        seats: 5,
        renewalPeriod: RenewalPeriod.ANNUAL,
        renewalDate: d("2026-06-01"),
        purchaseDate: d("2025-06-01"),
        cost: 72.0,
        purchasedFrom: "Tailscale",
        notes: "VPN mesh for remote access. 3 seats currently in use.",
      },
    }),
  ]);

  // License â†' asset assignments
  await Promise.all([
    prisma.licenseAssignment.create({ data: { licenseId: licUnraid.id, assetId: srv1.id } }),
    prisma.licenseAssignment.create({ data: { licenseId: licWindows.id, assetId: srv4.id } }),
    prisma.licenseAssignment.create({ data: { licenseId: licTruenas.id, assetId: srv3.id } }),
    prisma.licenseAssignment.create({ data: { licenseId: licPlex.id, assetId: srv1.id } }),
    prisma.licenseAssignment.create({ data: { licenseId: licTailscale.id, assetId: gw.id } }),
  ]);

  console.log("Licenses created");

  // â"€â"€ 13. Applications â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  await Promise.all([
    // srv1 (Unraid)
    prisma.application.create({
      data: {
        hostId: srv1.id, name: "Plex Media Server", type: AppType.SERVICE,
        operatingSystem: "Unraid 6.12.6", status: "running",
        notes: "Primary media server. ~8TB media library.",
      },
    }),
    prisma.application.create({
      data: {
        hostId: srv1.id, name: "Pi-hole", type: AppType.CONTAINER,
        operatingSystem: "Docker on Unraid", status: "running",
        notes: "Network-wide ad blocker. Primary DNS resolver for the LAN.",
      },
    }),
    prisma.application.create({
      data: {
        hostId: srv1.id, name: "Home Assistant", type: AppType.CONTAINER,
        operatingSystem: "Docker on Unraid", status: "running",
        notes: "Smart home automation. Runs alongside Plex.",
      },
    }),
    prisma.application.create({
      data: {
        hostId: srv1.id, name: "Immich", type: AppType.CONTAINER,
        operatingSystem: "Docker on Unraid", status: "running",
        notes: "Self-hosted photo library. Replaces Google Photos.",
      },
    }),

    // srv2 (Proxmox)
    prisma.application.create({
      data: {
        hostId: srv2.id, name: "Proxmox VE", type: AppType.SERVICE,
        operatingSystem: "Proxmox VE 8.2", status: "running",
      },
    }),
    prisma.application.create({
      data: {
        hostId: srv2.id, name: "Ubuntu Server (Dev VM)", type: AppType.VM,
        operatingSystem: "Ubuntu 24.04 LTS", status: "running",
        notes: "Development and testing environment. 8 vCPUs, 32GB RAM.",
      },
    }),
    prisma.application.create({
      data: {
        hostId: srv2.id, name: "OPNsense (VM)", type: AppType.VM,
        operatingSystem: "OPNsense 24.7", status: "stopped",
        notes: "Testing firewall config before pushing to UDM-SE.",
      },
    }),

    // srv3 (TrueNAS)
    prisma.application.create({
      data: {
        hostId: srv3.id, name: "TrueNAS SCALE", type: AppType.SERVICE,
        operatingSystem: "TrueNAS SCALE 24.04", status: "running",
        notes: "96TB usable storage. ZFS RAIDZ2.",
      },
    }),
    prisma.application.create({
      data: {
        hostId: srv3.id, name: "MinIO", type: AppType.CONTAINER,
        operatingSystem: "TrueNAS App", status: "running",
        notes: "S3-compatible object storage for app backups.",
      },
    }),

    // srv4 (Proxmox)
    prisma.application.create({
      data: {
        hostId: srv4.id, name: "Proxmox VE", type: AppType.SERVICE,
        operatingSystem: "Proxmox VE 8.2", status: "running",
      },
    }),
    prisma.application.create({
      data: {
        hostId: srv4.id, name: "Windows Server 2022", type: AppType.VM,
        operatingSystem: "Windows Server 2022 Datacenter", status: "running",
        notes: "Active Directory + DHCP for the lab.",
      },
    }),
    prisma.application.create({
      data: {
        hostId: srv4.id, name: "Vaultwarden", type: AppType.CONTAINER,
        operatingSystem: "Docker on Proxmox LXC", status: "running",
        notes: "Self-hosted Bitwarden-compatible password vault.",
      },
    }),
  ]);

  console.log("Applications created");

  // â"€â"€ 14. Connections â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  await Promise.all([
    // Network: servers â†' switch
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 1",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 1,
        bEndAssetId: srv1.id, bEndLabel: "NIC Port 1",
        cableCategory: "Cat6", isPatch: false, speed: "1G",
        cableLengthFeet: 3,
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 2",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 2,
        bEndAssetId: srv2.id, bEndLabel: "NIC Port 1",
        cableCategory: "Cat6", isPatch: false, speed: "1G",
        cableLengthFeet: 3,
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 3",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 3,
        bEndAssetId: srv3.id, bEndLabel: "GbE Port 1",
        cableCategory: "Cat6", isPatch: false, speed: "1G",
        cableLengthFeet: 4,
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 4",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 4,
        bEndAssetId: srv4.id, bEndLabel: "NIC Port 1",
        cableCategory: "Cat6", isPatch: false, speed: "1G",
        cableLengthFeet: 4,
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 5",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 5,
        bEndAssetId: nas.id, bEndLabel: "LAN Port 1",
        cableCategory: "Cat6", isPatch: false, speed: "1G",
        cableLengthFeet: 5,
      },
    }),

    // Network: switch uplink â†' gateway
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "SFP+ Uplink 1",
        aEndPortGroupId: swUplinkPorts.id, aEndPortNumber: 1,
        bEndAssetId: gw.id, bEndLabel: "SFP+ Port 1",
        bEndPortGroupId: gwSfpPorts.id, bEndPortNumber: 1,
        cableCategory: "DAC SFP+", isPatch: true, speed: "10G",
        cableLengthFeet: 1,
      },
    }),

    // Patch panel demo — port 1: front patch cable (switch → PP) + rear permanent cable (PP → srv1 NIC 2)
    // DEMO: same port group + same port number appears in TWO connections.
    // Front face shows port 1 green; rear face also shows it green.
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 20",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 20,
        bEndAssetId: patchPanel.id, bEndLabel: "PP Port 1",
        bEndPortGroupId: ppPorts.id, bEndPortNumber: 1,
        cableCategory: "Cat6", isPatch: true, speed: "1G",
        cableLengthFeet: 3,
        notes: "Front patch cable — switch access port to patch panel port 1.",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: patchPanel.id, aEndLabel: "PP Port 1",
        aEndPortGroupId: ppPorts.id, aEndPortNumber: 1,
        bEndAssetId: srv1.id, bEndLabel: "NIC Port 2",
        cableCategory: "Cat6", isPatch: false, speed: "1G",
        cableLengthFeet: 6,
        notes: "DEMO dual-connection: rear permanent cable from patch panel port 1 to server NIC. Port 1 is intentionally in two connections (front patch + rear run).",
      },
    }),

    // Patch panel port 2: front (switch → PP) + rear (PP → srv2 NIC 2)
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 21",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 21,
        bEndAssetId: patchPanel.id, bEndLabel: "PP Port 2",
        bEndPortGroupId: ppPorts.id, bEndPortNumber: 2,
        cableCategory: "Cat6", isPatch: true, speed: "1G",
        cableLengthFeet: 3,
        notes: "Front patch cable — switch access port to patch panel port 2.",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: patchPanel.id, aEndLabel: "PP Port 2",
        aEndPortGroupId: ppPorts.id, aEndPortNumber: 2,
        bEndAssetId: srv2.id, bEndLabel: "NIC Port 2",
        cableCategory: "Cat6", isPatch: false, speed: "1G",
        cableLengthFeet: 6,
        notes: "Rear permanent cable — patch panel port 2 to srv2 NIC.",
      },
    }),

    // Power: UPS battery-backed â†' servers
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: ups.id, aEndLabel: "BB Outlet 1",
        aEndOutletGroupId: upsBattBacked.id, aEndOutletNumber: 1,
        bEndAssetId: srv1.id, bEndLabel: "PSU 1",
        cableCategory: "C13/C14",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: ups.id, aEndLabel: "BB Outlet 2",
        aEndOutletGroupId: upsBattBacked.id, aEndOutletNumber: 2,
        bEndAssetId: srv1.id, bEndLabel: "PSU 2",
        cableCategory: "C13/C14",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: ups.id, aEndLabel: "BB Outlet 3",
        aEndOutletGroupId: upsBattBacked.id, aEndOutletNumber: 3,
        bEndAssetId: srv2.id, bEndLabel: "PSU 1",
        cableCategory: "C13/C14",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: ups.id, aEndLabel: "BB Outlet 4",
        aEndOutletGroupId: upsBattBacked.id, aEndOutletNumber: 4,
        bEndAssetId: sw.id, bEndLabel: "Power",
        cableCategory: "C13/C14",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: ups.id, aEndLabel: "BB Outlet 5",
        aEndOutletGroupId: upsBattBacked.id, aEndOutletNumber: 5,
        bEndAssetId: gw.id, bEndLabel: "Power",
        cableCategory: "C13/C14",
      },
    }),

    // Power: PDU â†' remaining servers
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: pdu.id, aEndLabel: "Outlet 1",
        aEndOutletGroupId: pduOutlets.id, aEndOutletNumber: 1,
        bEndAssetId: srv3.id, bEndLabel: "PSU 1",
        cableCategory: "C13/C14",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: pdu.id, aEndLabel: "Outlet 2",
        aEndOutletGroupId: pduOutlets.id, aEndOutletNumber: 2,
        bEndAssetId: srv3.id, bEndLabel: "PSU 2",
        cableCategory: "C13/C14",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: pdu.id, aEndLabel: "Outlet 3",
        aEndOutletGroupId: pduOutlets.id, aEndOutletNumber: 3,
        bEndAssetId: srv4.id, bEndLabel: "PSU 1",
        cableCategory: "C13/C14",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: pdu.id, aEndLabel: "Outlet 4",
        aEndOutletGroupId: pduOutlets.id, aEndOutletNumber: 4,
        bEndAssetId: srv4.id, bEndLabel: "PSU 2",
        cableCategory: "C13/C14",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: pdu.id, aEndLabel: "Outlet 5",
        aEndOutletGroupId: pduOutlets.id, aEndOutletNumber: 5,
        bEndAssetId: nas.id, bEndLabel: "Power",
        cableCategory: "C13/C14",
      },
    }),

    // KVM: channels â†' servers
    prisma.connection.create({
      data: {
        type: ConnectionType.KVM,
        aEndAssetId: kvm.id, aEndLabel: "Channel 1",
        bEndAssetId: srv1.id, bEndLabel: "KVM",
        cableCategory: "KVM USB/VGA",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.KVM,
        aEndAssetId: kvm.id, aEndLabel: "Channel 2",
        bEndAssetId: srv2.id, bEndLabel: "KVM",
        cableCategory: "KVM USB/VGA",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.KVM,
        aEndAssetId: kvm.id, aEndLabel: "Channel 3",
        bEndAssetId: srv3.id, bEndLabel: "KVM",
        cableCategory: "KVM USB/VGA",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.KVM,
        aEndAssetId: kvm.id, aEndLabel: "Channel 4",
        bEndAssetId: srv4.id, bEndLabel: "KVM",
        cableCategory: "KVM USB/VGA",
      },
    }),

    // Console: gateway serial console
    prisma.connection.create({
      data: {
        type: ConnectionType.CONSOLE,
        aEndAssetId: srv1.id, aEndLabel: "USB-A",
        bEndAssetId: gw.id, bEndLabel: "Console",
        cableCategory: "RJ-45 Serial",
        notes: "Serial console via USB-to-RJ45 adapter on srv1.",
      },
    }),

    // Network: RPi Pi-hole → switch port 10 (PoE powers the Pi)
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 10",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 10,
        bEndAssetId: pi.id, bEndLabel: "Ethernet",
        cableCategory: "Cat6", isPatch: false, speed: "1G",
        cableLengthFeet: 2,
        notes: "PoE hat on the RPi — switch port provides both data and power.",
      },
    }),

    // Network: tower server → switch port 11
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 11",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 11,
        bEndAssetId: towerServer.id, bEndLabel: "LAN Port 1",
        bEndPortGroupId: ml350EthPorts.id, bEndPortNumber: 1,
        cableCategory: "Cat6", isPatch: false, speed: "1G",
        cableLengthFeet: 3,
      },
    }),

    // Power: tower UPS battery-backed → tower server PSU 1 + 2
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: towerUps.id, aEndLabel: "BB Outlet 1",
        aEndOutletGroupId: towerUpsBB.id, aEndOutletNumber: 1,
        bEndAssetId: towerServer.id, bEndLabel: "PSU 1",
        cableCategory: "NEMA 5-15 to C13",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.POWER,
        aEndAssetId: towerUps.id, aEndLabel: "BB Outlet 2",
        aEndOutletGroupId: towerUpsBB.id, aEndOutletNumber: 2,
        bEndAssetId: towerServer.id, bEndLabel: "PSU 2",
        cableCategory: "NEMA 5-15 to C13",
      },
    }),

    // IPMI / management network — each server BMC/iLO/iDRAC on its own switch port
    // (ports 12-16 on the 48-port access group, typically on a management VLAN)
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 12",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 12,
        bEndAssetId: srv1.id, bEndLabel: "iLO 4",
        bEndPortGroupId: srv1Ilo.id, bEndPortNumber: 1,
        cableCategory: "Cat6", isPatch: false, speed: "1G",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 13",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 13,
        bEndAssetId: srv2.id, bEndLabel: "iLO 4",
        bEndPortGroupId: srv2Ilo.id, bEndPortNumber: 1,
        cableCategory: "Cat6", isPatch: false, speed: "1G",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 14",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 14,
        bEndAssetId: srv3.id, bEndLabel: "IPMI",
        bEndPortGroupId: srv3Ipmi.id, bEndPortNumber: 1,
        cableCategory: "Cat6", isPatch: false, speed: "1G",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 15",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 15,
        bEndAssetId: srv4.id, bEndLabel: "iDRAC 7",
        bEndPortGroupId: srv4Idrac.id, bEndPortNumber: 1,
        cableCategory: "Cat6", isPatch: false, speed: "1G",
      },
    }),
    prisma.connection.create({
      data: {
        type: ConnectionType.NETWORK,
        aEndAssetId: sw.id, aEndLabel: "Port 16",
        aEndPortGroupId: swAccessPorts.id, aEndPortNumber: 16,
        bEndAssetId: towerServer.id, bEndLabel: "iLO 4",
        bEndPortGroupId: ml350Ilo.id, bEndPortNumber: 1,
        cableCategory: "Cat6", isPatch: false, speed: "1G",
      },
    }),
  ]);

  console.log("Connections created");
  console.log("\nDev seed complete!");
  console.log("  Rack A (Main, 25U): UPS, PDU, blank, KVM, 48-port switch, UDM-SE gateway");
  console.log("    Towers at rack floor: APC SUA1500 UPS (U1-4, cols 1-3), HP ML350 Gen9 (U1-5, cols 4-6)");
  console.log("    Servers: HP DL380 Gen9 x2, Supermicro 6028U, Dell R720xd, Synology RS1221+");
  console.log("    Patch panel at U23 (24-port Cat6) — ports 1-2 wired, 3-24 empty");
  console.log("    Shelf U25: RPi 4 (Pi-hole active), Intel NUC 11 (stored)");
  console.log("  Rack B (Lab Rack B, 14U): Dell R640 (1U), Dell R710 (2U), Cisco SG300 switch");
  console.log("  Stored: DL360 G7, U6-LR AP. Sold: DL380 Gen8");
  console.log("  PCIe slots: all 7 servers have defined slots; 9 NIC/GPU/HBA cards installed");
  console.log("  NIC cards in topology: srv1 (2-port SFP+), srv2 (GPU+quad NIC), srv3 (HBA)");
  console.log("    srv4 (2-port 10G), towerServer (2-port 10G), R640 (2-port SFP+)");
  console.log("  Drives: ~54 total (46 installed, 5 stored, 1 sold)");
  console.log("  Components: CPUs, RAM, NICs, GPUs, RAID cards, spare parts");
  console.log("  PSUs, port groups (incl. IPMI for 7 servers), outlet groups, batteries, consumables");
  console.log("  Licenses: Unraid, Windows Server, TrueNAS, Plex, Tailscale");
  console.log("  Applications: 12 across all servers");
  console.log("  Connections: 35 (incl. 4 patch panel dual-connections, 5 IPMI, power, KVM, console)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
