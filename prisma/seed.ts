import "dotenv/config";
import * as argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, type ComponentType, type PortType } from "../src/generated/prisma";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — cannot run the seed.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // One default admin user. The second user is added later via the admin panel.
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme";
  const passwordHash = await argon2.hash(password);

  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      username,
      passwordHash,
      displayName: "Administrator",
    },
    create: {
      username,
      passwordHash,
      displayName: "Administrator",
      role: Role.ADMIN,
      isInitialAdmin: true,
    },
  });
  console.log(`Admin user ready: ${admin.username} (${admin.role})`);

  // One rack — 25U, 6 columns. The app otherwise starts empty.
  const existingRack = await prisma.rack.findFirst();
  const rack =
    existingRack ??
    (await prisma.rack.create({
      data: { name: "Main Rack", totalU: 25, columnCount: 6 },
    }));
  console.log(
    `Rack ready: ${rack.name} (${rack.totalU}U, ${rack.columnCount} columns)`,
  );

  // A default storage container so new assets have somewhere to land.
  const storage = await prisma.storage.upsert({
    where: { name: "Storage" },
    update: {},
    create: { name: "Storage", notes: "Default off-rack container" },
  });
  console.log(`Storage ready: ${storage.name}`);

  // Singleton app settings row — created by the migration SQL but re-seeded
  // here so a fresh DB (migrate + seed in one go) also gets it.
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, accentColor: "#00a8c6", serviceLoopLengthInches: 12 },
  });
  console.log("AppSettings ready");

  // Demo data — only created on a fresh database (no existing assets).
  const existingAssetCount = await prisma.asset.count();
  if (existingAssetCount === 0) {
    console.log("Seeding demo assets...");
    await seedDemoData(prisma, rack.id, storage.id);
    console.log("Demo assets ready");
  }
}

async function seedDemoData(
  prisma: PrismaClient,
  rackId: string,
  storageId: string,
) {
  // ── Server 1: Dell PowerEdge R640 ─────────────────────────────────────────
  // 3 PCIe slots. Slot 1 (x16): dual-10G NIC. Slot 2 (x8): RAID controller. Slot 3: empty.
  const r640 = await prisma.asset.create({
    data: {
      codename: "DEMO-R640-1",
      name: "Dell PowerEdge R640",
      category: "SERVER",
      manufacturer: "Dell",
      modelNumber: "R640",
      condition: "used",
      purchasePrice: 850,
      purchasedFrom: "eBay",
      state: "IN_USE",
      formFactor: "RACK",
      rackUnits: 2,
      location: "RACKED",
      rackId,
      startU: 1,
      builtInEthernetCount: 2,
      builtInSfpCount: 0,
      psuCount: 2,
      chassis: "R640",
      mainboard: "Dell EMC",
      operatingSystem: "Proxmox VE 8",
      maxPowerDrawWatts: 550,
      idlePowerWatts: 180,
      bayZones: {
        create: [
          { name: "Front SFF", faceSide: "FRONT", driveSize: "SFF", bayCount: 10, sortOrder: 0 },
          { name: "Rear SFF", faceSide: "REAR", driveSize: "SFF", bayCount: 2, sortOrder: 1 },
        ],
      },
      components: {
        create: [
          {
            type: "CPU" as ComponentType,
            name: "Intel Xeon Gold 5120",
            manufacturer: "Intel",
            model: "Xeon Gold 5120",
            quantity: 2,
            cores: 14,
            threads: 28,
            speedGHz: 2.2,
            socket: "LGA3647",
            tdpWatts: 105,
          },
          {
            type: "RAM" as ComponentType,
            name: "16GB DDR4-2666 ECC RDIMM",
            manufacturer: "Samsung",
            quantity: 8,
            capacityGB: 16,
            speedMHz: 2666,
            generation: "DDR4",
            ecc: true,
            formFactor: "RDIMM",
          },
        ],
      },
      pciSlots: {
        create: [
          { sortOrder: 0, size: "x16" },
          { sortOrder: 1, size: "x8" },
          { sortOrder: 2, size: "x8" },
        ],
      },
    },
    include: { pciSlots: true },
  });

  // Install Intel X710-DA2 dual-port 10G SFP+ NIC in slot 1 (x16)
  const r640Nic = await prisma.component.create({
    data: {
      name: "Intel X710-DA2 Dual-Port 10G SFP+",
      type: "NIC_CARD" as ComponentType,
      manufacturer: "Intel",
      model: "X710-DA2",
      portCount: 2,
      portType: "SFP_PLUS" as PortType,
      portSpeed: "10G",
      cardInterface: "PCIe 3.0 x8",
      installedInId: r640.id,
    },
  });
  await prisma.pciSlot.update({
    where: { id: r640.pciSlots[0].id },
    data: { occupiedByComponentId: r640Nic.id },
  });

  // Install LSI 9300-8i RAID controller in slot 2 (x8)
  const r640Raid = await prisma.component.create({
    data: {
      name: "LSI 9300-8i RAID Controller",
      type: "RAID_CONTROLLER" as ComponentType,
      manufacturer: "LSI",
      model: "9300-8i",
      cardInterface: "PCIe 3.0 x8",
      installedInId: r640.id,
    },
  });
  await prisma.pciSlot.update({
    where: { id: r640.pciSlots[1].id },
    data: { occupiedByComponentId: r640Raid.id },
  });
  // Slot 3 left empty

  console.log(`  → ${r640.codename}: ${r640.name} (slots: ${r640.pciSlots.length})`);

  // ── Server 2: HP ProLiant DL380 Gen9 ──────────────────────────────────────
  // 6 PCIe slots. Slot 1 (x16): GPU. Slot 3 (x8): 4-port 10G NIC. Others empty.
  const dl380 = await prisma.asset.create({
    data: {
      codename: "DEMO-DL380-1",
      name: "HP ProLiant DL380 Gen9",
      category: "SERVER",
      manufacturer: "HP",
      modelNumber: "DL380 Gen9",
      condition: "used",
      purchasePrice: 650,
      purchasedFrom: "Kijiji",
      state: "IN_USE",
      formFactor: "RACK",
      rackUnits: 2,
      location: "RACKED",
      rackId,
      startU: 3,
      builtInEthernetCount: 4,
      builtInSfpCount: 0,
      psuCount: 2,
      chassis: "DL380 Gen9",
      mainboard: "HP",
      operatingSystem: "VMware ESXi 8",
      maxPowerDrawWatts: 800,
      idlePowerWatts: 220,
      bayZones: {
        create: [
          { name: "Front SFF", faceSide: "FRONT", driveSize: "SFF", bayCount: 25, sortOrder: 0 },
        ],
      },
      components: {
        create: [
          {
            type: "CPU" as ComponentType,
            name: "Intel Xeon E5-2680 v3",
            manufacturer: "Intel",
            model: "Xeon E5-2680 v3",
            quantity: 2,
            cores: 12,
            threads: 24,
            speedGHz: 2.5,
            socket: "LGA2011-v3",
            tdpWatts: 120,
          },
          {
            type: "RAM" as ComponentType,
            name: "16GB DDR4-2133 ECC RDIMM",
            manufacturer: "Micron",
            quantity: 12,
            capacityGB: 16,
            speedMHz: 2133,
            generation: "DDR4",
            ecc: true,
            formFactor: "RDIMM",
          },
        ],
      },
      pciSlots: {
        create: [
          { sortOrder: 0, size: "x16" },
          { sortOrder: 1, size: "x16" },
          { sortOrder: 2, size: "x8" },
          { sortOrder: 3, size: "x8" },
          { sortOrder: 4, size: "x8" },
          { sortOrder: 5, size: "x8" },
        ],
      },
    },
    include: { pciSlots: true },
  });

  // Install NVIDIA Quadro K2200 GPU in slot 1 (x16)
  const dl380Gpu = await prisma.component.create({
    data: {
      name: "NVIDIA Quadro K2200 4GB",
      type: "GPU" as ComponentType,
      manufacturer: "NVIDIA",
      model: "Quadro K2200",
      cardInterface: "PCIe 3.0 x16",
      installedInId: dl380.id,
    },
  });
  await prisma.pciSlot.update({
    where: { id: dl380.pciSlots[0].id },
    data: { occupiedByComponentId: dl380Gpu.id },
  });

  // Install Intel X710-T4L quad-port 10G NIC in slot 3 (x8)
  const dl380Nic = await prisma.component.create({
    data: {
      name: "Intel X710-T4L Quad-Port 10GBase-T",
      type: "NIC_CARD" as ComponentType,
      manufacturer: "Intel",
      model: "X710-T4L",
      portCount: 4,
      portType: "ETHERNET" as PortType,
      portSpeed: "10G",
      cardInterface: "PCIe 3.0 x8",
      installedInId: dl380.id,
    },
  });
  await prisma.pciSlot.update({
    where: { id: dl380.pciSlots[2].id },
    data: { occupiedByComponentId: dl380Nic.id },
  });
  // Slots 2, 4, 5, 6 left empty

  console.log(`  → ${dl380.codename}: ${dl380.name} (slots: ${dl380.pciSlots.length})`);

  // ── Server 3: HP ProLiant DL20 Gen9 ───────────────────────────────────────
  // 2 PCIe slots (x8, x4). Both empty — documenting the slots but no cards installed.
  const dl20 = await prisma.asset.create({
    data: {
      codename: "DEMO-DL20-1",
      name: "HP ProLiant DL20 Gen9",
      category: "SERVER",
      manufacturer: "HP",
      modelNumber: "DL20 Gen9",
      condition: "used",
      purchasePrice: 280,
      purchasedFrom: "eBay",
      state: "IN_USE",
      formFactor: "RACK",
      rackUnits: 1,
      location: "RACKED",
      rackId,
      startU: 5,
      builtInEthernetCount: 2,
      psuCount: 1,
      chassis: "DL20 Gen9",
      operatingSystem: "Ubuntu Server 24.04",
      maxPowerDrawWatts: 290,
      idlePowerWatts: 40,
      bayZones: {
        create: [
          { name: "Front LFF", faceSide: "FRONT", driveSize: "LFF", bayCount: 4, sortOrder: 0 },
        ],
      },
      components: {
        create: [
          {
            type: "CPU" as ComponentType,
            name: "Intel Xeon E3-1240 v5",
            manufacturer: "Intel",
            model: "Xeon E3-1240 v5",
            quantity: 1,
            cores: 4,
            threads: 8,
            speedGHz: 3.5,
            socket: "LGA1151",
            tdpWatts: 80,
          },
          {
            type: "RAM" as ComponentType,
            name: "8GB DDR4-2133 ECC UDIMM",
            manufacturer: "Kingston",
            quantity: 4,
            capacityGB: 8,
            speedMHz: 2133,
            generation: "DDR4",
            ecc: true,
            formFactor: "UDIMM",
          },
        ],
      },
      pciSlots: {
        create: [
          { sortOrder: 0, size: "x8" },  // low-profile
          { sortOrder: 1, size: "x4" },  // low-profile
        ],
      },
    },
  });
  console.log(`  → ${dl20.codename}: ${dl20.name} (slots: 2, none installed)`);

  // ── Server 4: Supermicro 1028R ─────────────────────────────────────────────
  // 2 PCIe slots. Both empty.
  const sm1028r = await prisma.asset.create({
    data: {
      codename: "DEMO-SM1028R-1",
      name: "Supermicro 1028R-WTRT",
      category: "SERVER",
      manufacturer: "Supermicro",
      modelNumber: "1028R-WTRT",
      condition: "used",
      purchasePrice: 420,
      purchasedFrom: "eBay",
      state: "IN_USE",
      formFactor: "RACK",
      rackUnits: 1,
      location: "RACKED",
      rackId,
      startU: 6,
      builtInEthernetCount: 4,
      psuCount: 2,
      chassis: "1028R-WTRT",
      operatingSystem: "TrueNAS SCALE",
      maxPowerDrawWatts: 400,
      idlePowerWatts: 90,
      bayZones: {
        create: [
          { name: "Front SFF", faceSide: "FRONT", driveSize: "SFF", bayCount: 10, sortOrder: 0 },
        ],
      },
      components: {
        create: [
          {
            type: "CPU" as ComponentType,
            name: "Intel Xeon E5-2620 v4",
            manufacturer: "Intel",
            model: "Xeon E5-2620 v4",
            quantity: 2,
            cores: 8,
            threads: 16,
            speedGHz: 2.1,
            socket: "LGA2011-v3",
            tdpWatts: 85,
          },
          {
            type: "RAM" as ComponentType,
            name: "8GB DDR4-2133 ECC RDIMM",
            manufacturer: "Samsung",
            quantity: 8,
            capacityGB: 8,
            speedMHz: 2133,
            generation: "DDR4",
            ecc: true,
            formFactor: "RDIMM",
          },
        ],
      },
      pciSlots: {
        create: [
          { sortOrder: 0, size: "x16" },
          { sortOrder: 1, size: "x8" },
        ],
      },
    },
  });
  console.log(`  → ${sm1028r.codename}: ${sm1028r.name} (slots: 2, none installed)`);

  // ── NUC: Intel NUC 12 Pro ─────────────────────────────────────────────────
  // M.2 2280 slot — empty.
  const nuc = await prisma.asset.create({
    data: {
      codename: "DEMO-NUC12-1",
      name: "Intel NUC 12 Pro",
      category: "NUC",
      manufacturer: "Intel",
      modelNumber: "NUC12WSHi7",
      condition: "new",
      purchasePrice: 499,
      purchasedFrom: "Amazon",
      state: "IN_USE",
      formFactor: "NON_RACK",
      rackUnits: 1,
      location: "STORAGE",
      storageId,
      builtInEthernetCount: 1,
      psuCount: 1,
      operatingSystem: "Windows 11 Pro",
      maxPowerDrawWatts: 65,
      components: {
        create: [
          {
            type: "CPU" as ComponentType,
            name: "Intel Core i7-1260P",
            manufacturer: "Intel",
            model: "Core i7-1260P",
            quantity: 1,
            cores: 12,
            threads: 16,
            speedGHz: 2.1,
            socket: "BGA",
            tdpWatts: 28,
          },
          {
            type: "RAM" as ComponentType,
            name: "16GB DDR4-3200 SO-DIMM",
            manufacturer: "Crucial",
            quantity: 2,
            capacityGB: 16,
            speedMHz: 3200,
            generation: "DDR4",
            ecc: false,
            formFactor: "SO-DIMM",
          },
        ],
      },
      pciSlots: {
        create: [{ sortOrder: 0, size: "M.2 2280" }],
      },
    },
  });
  console.log(`  → ${nuc.codename}: ${nuc.name} (M.2 slot empty)`);

  // ── Switch: Cisco Catalyst 2960X ──────────────────────────────────────────
  // No PCIe slots.
  const sw = await prisma.asset.create({
    data: {
      codename: "DEMO-SW-1",
      name: "Cisco Catalyst 2960X-48TS-L",
      category: "SWITCH",
      manufacturer: "Cisco",
      modelNumber: "2960X-48TS-L",
      condition: "used",
      purchasePrice: 320,
      purchasedFrom: "eBay",
      state: "IN_USE",
      formFactor: "RACK",
      rackUnits: 1,
      location: "RACKED",
      rackId,
      startU: 7,
      managementType: "managed",
      maxPowerDrawWatts: 37,
      portGroups: {
        create: [
          { name: "Access", portCount: 48, portType: "ETHERNET", portSpeed: "1G", poePerPort: null, side: "LEFT", sortOrder: 0 },
          { name: "Uplink", portCount: 4, portType: "SFP", portSpeed: "1G", poePerPort: null, side: "RIGHT", sortOrder: 1 },
        ],
      },
    },
  });
  console.log(`  → ${sw.codename}: ${sw.name} (no PCIe slots)`);

  // ── UPS: APC Smart-UPS 1500 ───────────────────────────────────────────────
  // No PCIe slots.
  const ups = await prisma.asset.create({
    data: {
      codename: "DEMO-UPS-1",
      name: "APC Smart-UPS 1500VA",
      category: "UPS",
      manufacturer: "APC",
      modelNumber: "SMT1500RM2U",
      condition: "used",
      purchasePrice: 180,
      purchasedFrom: "Kijiji",
      state: "IN_USE",
      formFactor: "RACK",
      rackUnits: 2,
      location: "RACKED",
      rackId,
      startU: 8,
      vaRating: 1500,
      wattsRating: 1000,
      estimatedRuntimeMinutes: 12,
      maxPowerDrawWatts: 50,
      outletGroups: {
        create: [
          { name: "Battery Backup", outletCount: 6, outletType: "NEMA 5-15R", batteryBacked: true, surgeProtected: true, side: "LEFT", sortOrder: 0 },
          { name: "Surge Only", outletCount: 2, outletType: "NEMA 5-15R", batteryBacked: false, surgeProtected: true, side: "RIGHT", sortOrder: 1 },
        ],
      },
    },
  });
  console.log(`  → ${ups.codename}: ${ups.name} (no PCIe slots)`);

  // ── Uninstalled PCIe inventory ────────────────────────────────────────────
  // Two cards in storage, available to install via the form or detail page.
  await prisma.component.createMany({
    data: [
      {
        name: "Intel X520-DA2 Dual-Port 10G SFP+",
        type: "NIC_CARD" as ComponentType,
        manufacturer: "Intel",
        model: "X520-DA2",
        portCount: 2,
        portType: "SFP_PLUS" as PortType,
        portSpeed: "10G",
        cardInterface: "PCIe 2.0 x8",
        state: "IN_USE",
      },
      {
        name: "ASUS GeForce GT 1030 2GB",
        type: "GPU" as ComponentType,
        manufacturer: "ASUS",
        model: "GT 1030",
        cardInterface: "PCIe 3.0 x16",
        state: "IN_USE",
      },
      {
        name: "LSI 9300-16i 16-Port RAID Controller",
        type: "RAID_CONTROLLER" as ComponentType,
        manufacturer: "LSI",
        model: "9300-16i",
        cardInterface: "PCIe 3.0 x8",
        state: "IN_USE",
      },
    ],
  });
  console.log("  → 3 uninstalled PCIe components added to inventory");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
