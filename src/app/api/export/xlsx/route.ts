import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { computeFinancials } from "@/lib/financials";

// Renders a multi-sheet workbook with every entity + a financial summary.
// CLAUDE.md §10 forbids bulk *import* — export is allowed because the
// workbook is a generated read model, so the app stays the single source of
// truth. BUILD_PLAN Phase 7 wires this up.

export const dynamic = "force-dynamic";

function toDate(d: Date | null | undefined): Date | null {
  return d ? new Date(d) : null;
}

function toNum(v: { toString(): string } | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v.toString());
  return Number.isFinite(n) ? n : null;
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true };
  row.alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function setColumns(
  sheet: ExcelJS.Worksheet,
  columns: { header: string; key: string; width?: number }[],
) {
  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 18,
  }));
  styleHeader(sheet);
}

export async function GET() {
  await requireUser();

  const wb = new ExcelJS.Workbook();
  wb.creator = "Cloudchain Inventory";
  wb.created = new Date();

  // ---------- Financial summary (first so it opens on load) ----------
  const fin = await computeFinancials();
  const summary = wb.addWorksheet("Summary");
  setColumns(summary, [
    { header: "Metric", key: "metric", width: 32 },
    { header: "Value", key: "value", width: 18 },
  ]);
  summary.addRows([
    { metric: "Total spent", value: fin.spent },
    { metric: "Recovered (sold assets)", value: fin.recovered },
    { metric: "Net outlay", value: fin.net },
    { metric: "Active fleet value", value: fin.activeValue },
    { metric: "—", value: "" },
    { metric: "Spent — Assets", value: fin.totals.assets },
    { metric: "Spent — Racks", value: fin.totals.racks },
    { metric: "Spent — Drives", value: fin.totals.drives },
    { metric: "Spent — Components", value: fin.totals.components },
    { metric: "Spent — Batteries", value: fin.totals.batteries },
    { metric: "Spent — Consumables", value: fin.totals.consumables },
    { metric: "Spent — Licenses", value: fin.totals.licenses },
    { metric: "—", value: "" },
    { metric: "Count — Assets", value: fin.counts.assets },
    { metric: "Count — Racks", value: fin.counts.racks },
    { metric: "Count — Drives", value: fin.counts.drives },
    { metric: "Count — Components", value: fin.counts.components },
    { metric: "Count — Batteries", value: fin.counts.batteries },
    { metric: "Count — Consumables", value: fin.counts.consumables },
    { metric: "Count — Licenses", value: fin.counts.licenses },
  ]);
  // Format money cells as currency.
  for (let r = 2; r <= 5; r++) {
    summary.getCell(`B${r}`).numFmt = '"$"#,##0.00';
  }
  for (let r = 7; r <= 13; r++) {
    summary.getCell(`B${r}`).numFmt = '"$"#,##0.00';
  }

  // ---------- By category ----------
  const byCat = wb.addWorksheet("Spend by category");
  setColumns(byCat, [
    { header: "Category", key: "category" },
    { header: "Total spent", key: "amount", width: 18 },
  ]);
  byCat.addRows(fin.byCategory);
  byCat.getColumn("amount").numFmt = '"$"#,##0.00';

  // ---------- By source ----------
  const bySrc = wb.addWorksheet("Spend by source");
  setColumns(bySrc, [
    { header: "Source", key: "source", width: 32 },
    { header: "Total spent", key: "amount", width: 18 },
  ]);
  bySrc.addRows(fin.bySource);
  bySrc.getColumn("amount").numFmt = '"$"#,##0.00';

  // ---------- Assets ----------
  const assets = await prisma.asset.findMany({
    orderBy: { codename: "asc" },
    include: {
      storage: { select: { name: true } },
      rack: { select: { name: true } },
    },
  });
  const assetSheet = wb.addWorksheet("Assets");
  setColumns(assetSheet, [
    { header: "Codename", key: "codename", width: 28 },
    { header: "Name", key: "name", width: 28 },
    { header: "Category", key: "category" },
    { header: "Manufacturer", key: "manufacturer" },
    { header: "Model", key: "modelNumber" },
    { header: "Serial", key: "serialNumber" },
    { header: "Condition", key: "condition" },
    { header: "Form factor", key: "formFactor" },
    { header: "Rack units", key: "rackUnits", width: 10 },
    { header: "Location", key: "location" },
    { header: "Rack", key: "rack" },
    { header: "Storage", key: "storage" },
    { header: "Start U", key: "startU", width: 9 },
    { header: "State", key: "state", width: 10 },
    { header: "Purchase date", key: "purchaseDate" },
    { header: "Purchase price", key: "purchasePrice", width: 14 },
    { header: "Price before ship", key: "purchasePriceBeforeShip", width: 18 },
    { header: "Purchased from", key: "purchasedFrom" },
    { header: "Purchased from URL", key: "purchasedFromUrl", width: 36 },
    { header: "Sold date", key: "soldDate" },
    { header: "Sold price", key: "soldPrice", width: 12 },
    { header: "Max power (W)", key: "maxPowerDrawWatts", width: 12 },
    { header: "Idle power (W)", key: "idlePowerWatts", width: 12 },
    { header: "Warranty end", key: "warrantyEndDate" },
    { header: "Firmware", key: "firmwareVersion" },
    { header: "Notes", key: "notes", width: 36 },
  ]);
  assetSheet.addRows(
    assets.map((a) => ({
      codename: a.codename,
      name: a.name,
      category: a.category,
      manufacturer: a.manufacturer,
      modelNumber: a.modelNumber,
      serialNumber: a.serialNumber,
      condition: a.condition,
      formFactor: a.formFactor,
      rackUnits: a.rackUnits,
      location: a.location,
      rack: a.rack?.name ?? null,
      storage: a.storage?.name ?? null,
      startU: a.startU,
      state: a.state,
      purchaseDate: toDate(a.purchaseDate),
      purchasePrice: toNum(a.purchasePrice),
      purchasePriceBeforeShip: toNum(a.purchasePriceBeforeShip),
      purchasedFrom: a.purchasedFrom,
      purchasedFromUrl: a.purchasedFromUrl,
      soldDate: toDate(a.soldDate),
      soldPrice: toNum(a.soldPrice),
      maxPowerDrawWatts: a.maxPowerDrawWatts,
      idlePowerWatts: a.idlePowerWatts,
      warrantyEndDate: toDate(a.warrantyEndDate),
      firmwareVersion: a.firmwareVersion,
      notes: a.notes,
    })),
  );
  ["purchasePrice", "purchasePriceBeforeShip", "soldPrice"].forEach((k) => {
    assetSheet.getColumn(k).numFmt = '"$"#,##0.00';
  });
  ["purchaseDate", "soldDate", "warrantyEndDate"].forEach((k) => {
    assetSheet.getColumn(k).numFmt = "yyyy-mm-dd";
  });

  // ---------- Drives ----------
  const drives = await prisma.drive.findMany({
    orderBy: { name: "asc" },
    include: {
      installedIn: { select: { codename: true } },
      bayZone: { select: { name: true } },
    },
  });
  const driveSheet = wb.addWorksheet("Drives");
  setColumns(driveSheet, [
    { header: "Name", key: "name", width: 24 },
    { header: "Manufacturer", key: "manufacturer" },
    { header: "Model", key: "model" },
    { header: "Kind", key: "kind", width: 10 },
    { header: "Size", key: "size", width: 8 },
    { header: "Capacity (GB)", key: "capacityGB", width: 14 },
    { header: "Serial", key: "serialNumber" },
    { header: "Installed in", key: "installedIn" },
    { header: "Bay zone", key: "bayZone" },
    { header: "Bay number", key: "bayNumber", width: 10 },
    { header: "Assigned use", key: "assignedUse" },
    { header: "Condition", key: "condition" },
    { header: "Purchase date", key: "purchaseDate" },
    { header: "Purchase price", key: "purchasePrice", width: 14 },
    { header: "Purchased from", key: "purchasedFrom" },
    { header: "Notes", key: "notes", width: 36 },
  ]);
  driveSheet.addRows(
    drives.map((d) => ({
      name: d.name,
      manufacturer: d.manufacturer,
      model: d.model,
      kind: d.kind,
      size: d.size,
      capacityGB: d.capacityGB,
      serialNumber: d.serialNumber,
      installedIn: d.installedIn?.codename ?? null,
      bayZone: d.bayZone?.name ?? null,
      bayNumber: d.bayNumber,
      assignedUse: d.assignedUse,
      condition: d.condition,
      purchaseDate: toDate(d.purchaseDate),
      purchasePrice: toNum(d.purchasePrice),
      purchasedFrom: d.purchasedFrom,
      notes: d.notes,
    })),
  );
  driveSheet.getColumn("purchasePrice").numFmt = '"$"#,##0.00';
  driveSheet.getColumn("purchaseDate").numFmt = "yyyy-mm-dd";

  // ---------- Components ----------
  const components = await prisma.component.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: { installedIn: { select: { codename: true } } },
  });
  const compSheet = wb.addWorksheet("Components");
  setColumns(compSheet, [
    { header: "Name", key: "name", width: 24 },
    { header: "Type", key: "type", width: 14 },
    { header: "Manufacturer", key: "manufacturer" },
    { header: "Model", key: "model" },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Specs", key: "specs", width: 28 },
    { header: "Installed in", key: "installedIn" },
    { header: "Speed GHz", key: "speedGHz", width: 10 },
    { header: "Cores", key: "cores", width: 8 },
    { header: "Threads", key: "threads", width: 9 },
    { header: "TDP W", key: "tdpWatts", width: 8 },
    { header: "Socket", key: "socket" },
    { header: "Capacity GB", key: "capacityGB", width: 12 },
    { header: "Speed MHz", key: "speedMHz", width: 10 },
    { header: "Generation", key: "generation" },
    { header: "ECC", key: "ecc", width: 6 },
    { header: "Form factor", key: "formFactor" },
    { header: "Port count", key: "portCount", width: 10 },
    { header: "Port type", key: "portType" },
    { header: "Port speed", key: "portSpeed" },
    { header: "Card interface", key: "cardInterface" },
    { header: "Watts rating", key: "wattsRating", width: 12 },
    { header: "Modular", key: "modular", width: 9 },
    { header: "Serial", key: "serialNumber" },
    { header: "Purchase date", key: "purchaseDate" },
    { header: "Purchase price", key: "purchasePrice", width: 14 },
    { header: "Purchased from", key: "purchasedFrom" },
    { header: "Notes", key: "notes", width: 36 },
  ]);
  compSheet.addRows(
    components.map((c) => ({
      name: c.name,
      type: c.type,
      manufacturer: c.manufacturer,
      model: c.model,
      quantity: c.quantity,
      specs: c.specs,
      installedIn: c.installedIn?.codename ?? null,
      speedGHz: c.speedGHz,
      cores: c.cores,
      threads: c.threads,
      tdpWatts: c.tdpWatts,
      socket: c.socket,
      capacityGB: c.capacityGB,
      speedMHz: c.speedMHz,
      generation: c.generation,
      ecc: c.ecc,
      formFactor: c.formFactor,
      portCount: c.portCount,
      portType: c.portType,
      portSpeed: c.portSpeed,
      cardInterface: c.cardInterface,
      wattsRating: c.wattsRating,
      modular: c.modular,
      serialNumber: c.serialNumber,
      purchaseDate: toDate(c.purchaseDate),
      purchasePrice: toNum(c.purchasePrice),
      purchasedFrom: c.purchasedFrom,
      notes: c.notes,
    })),
  );
  compSheet.getColumn("purchasePrice").numFmt = '"$"#,##0.00';
  compSheet.getColumn("purchaseDate").numFmt = "yyyy-mm-dd";

  // ---------- Batteries ----------
  const batteries = await prisma.battery.findMany({
    orderBy: { name: "asc" },
    include: { installedIn: { select: { codename: true } } },
  });
  const batSheet = wb.addWorksheet("Batteries");
  setColumns(batSheet, [
    { header: "Name", key: "name", width: 24 },
    { header: "Manufacturer", key: "manufacturer" },
    { header: "Model", key: "model" },
    { header: "Voltage", key: "voltage", width: 10 },
    { header: "Capacity Ah", key: "capacityAh", width: 12 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Installed in", key: "installedIn" },
    { header: "Install date", key: "installDate" },
    { header: "Purchase date", key: "purchaseDate" },
    { header: "Purchase price", key: "purchasePrice", width: 14 },
    { header: "Purchased from", key: "purchasedFrom" },
    { header: "Notes", key: "notes", width: 36 },
  ]);
  batSheet.addRows(
    batteries.map((b) => ({
      name: b.name,
      manufacturer: b.manufacturer,
      model: b.model,
      voltage: b.voltage,
      capacityAh: b.capacityAh,
      quantity: b.quantity,
      installedIn: b.installedIn?.codename ?? null,
      installDate: toDate(b.installDate),
      purchaseDate: toDate(b.purchaseDate),
      purchasePrice: toNum(b.purchasePrice),
      purchasedFrom: b.purchasedFrom,
      notes: b.notes,
    })),
  );
  batSheet.getColumn("purchasePrice").numFmt = '"$"#,##0.00';
  ["installDate", "purchaseDate"].forEach((k) => {
    batSheet.getColumn(k).numFmt = "yyyy-mm-dd";
  });

  // ---------- Consumables ----------
  const consumables = await prisma.consumable.findMany({
    orderBy: { name: "asc" },
  });
  const conSheet = wb.addWorksheet("Consumables");
  setColumns(conSheet, [
    { header: "Name", key: "name", width: 24 },
    { header: "Type", key: "type" },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Location", key: "location" },
    { header: "Purchase date", key: "purchaseDate" },
    { header: "Purchase price", key: "purchasePrice", width: 14 },
    { header: "Purchased from", key: "purchasedFrom" },
    { header: "Notes", key: "notes", width: 36 },
  ]);
  conSheet.addRows(
    consumables.map((c) => ({
      name: c.name,
      type: c.type,
      quantity: c.quantity,
      location: c.location,
      purchaseDate: toDate(c.purchaseDate),
      purchasePrice: toNum(c.purchasePrice),
      purchasedFrom: c.purchasedFrom,
      notes: c.notes,
    })),
  );
  conSheet.getColumn("purchasePrice").numFmt = '"$"#,##0.00';
  conSheet.getColumn("purchaseDate").numFmt = "yyyy-mm-dd";

  // ---------- Licenses ----------
  const licenses = await prisma.license.findMany({
    orderBy: { name: "asc" },
    include: {
      assignments: {
        include: { asset: { select: { codename: true } } },
      },
    },
  });
  const licSheet = wb.addWorksheet("Licenses");
  setColumns(licSheet, [
    { header: "Name", key: "name", width: 28 },
    { header: "Type", key: "type" },
    { header: "License key", key: "licenseKey", width: 28 },
    { header: "Seats", key: "seats", width: 8 },
    { header: "Renewal period", key: "renewalPeriod" },
    { header: "Next renewal", key: "renewalDate" },
    { header: "Purchase date", key: "purchaseDate" },
    { header: "Cost", key: "cost", width: 12 },
    { header: "Purchased from", key: "purchasedFrom" },
    { header: "Assignments", key: "assignments", width: 36 },
    { header: "Notes", key: "notes", width: 36 },
  ]);
  licSheet.addRows(
    licenses.map((l) => ({
      name: l.name,
      type: l.type,
      licenseKey: l.licenseKey,
      seats: l.seats,
      renewalPeriod: l.renewalPeriod,
      renewalDate: toDate(l.renewalDate),
      purchaseDate: toDate(l.purchaseDate),
      cost: toNum(l.cost),
      purchasedFrom: l.purchasedFrom,
      assignments: l.assignments.map((a) => a.asset.codename).join(", "),
      notes: l.notes,
    })),
  );
  licSheet.getColumn("cost").numFmt = '"$"#,##0.00';
  ["renewalDate", "purchaseDate"].forEach((k) => {
    licSheet.getColumn(k).numFmt = "yyyy-mm-dd";
  });

  // ---------- Applications ----------
  const applications = await prisma.application.findMany({
    orderBy: { name: "asc" },
    include: { host: { select: { codename: true } } },
  });
  const appSheet = wb.addWorksheet("Applications");
  setColumns(appSheet, [
    { header: "Name", key: "name", width: 24 },
    { header: "Type", key: "type" },
    { header: "Host", key: "host" },
    { header: "Operating system", key: "operatingSystem" },
    { header: "Status", key: "status" },
    { header: "Notes", key: "notes", width: 36 },
  ]);
  appSheet.addRows(
    applications.map((a) => ({
      name: a.name,
      type: a.type,
      host: a.host.codename,
      operatingSystem: a.operatingSystem,
      status: a.status,
      notes: a.notes,
    })),
  );

  // ---------- Connections ----------
  const connections = await prisma.connection.findMany({
    orderBy: [{ type: "asc" }, { aEndAssetId: "asc" }],
    include: {
      aEnd: { select: { codename: true } },
      bEnd: { select: { codename: true } },
    },
  });
  const connSheet = wb.addWorksheet("Connections");
  setColumns(connSheet, [
    { header: "Type", key: "type" },
    { header: "A end", key: "aEnd" },
    { header: "A label", key: "aEndLabel" },
    { header: "B end", key: "bEnd" },
    { header: "B label", key: "bEndLabel" },
    { header: "Cable category", key: "cableCategory" },
    { header: "Patch", key: "isPatch", width: 8 },
    { header: "Actual length (ft)", key: "cableLengthFeet", width: 16 },
    { header: "Estimated length (ft)", key: "estimatedCableLengthFeet", width: 18 },
    { header: "Notes", key: "notes", width: 36 },
  ]);
  connSheet.addRows(
    connections.map((c) => ({
      type: c.type,
      aEnd: c.aEnd.codename,
      aEndLabel: c.aEndLabel,
      bEnd: c.bEnd?.codename ?? null,
      bEndLabel: c.bEndLabel,
      cableCategory: c.cableCategory,
      isPatch: c.isPatch,
      cableLengthFeet: c.cableLengthFeet,
      estimatedCableLengthFeet: c.estimatedCableLengthFeet,
      notes: c.notes,
    })),
  );

  // ---------- Racks ----------
  const racks = await prisma.rack.findMany({ orderBy: { name: "asc" } });
  const rackSheet = wb.addWorksheet("Racks");
  setColumns(rackSheet, [
    { header: "Name", key: "name", width: 28 },
    { header: "Total U", key: "totalU", width: 9 },
    { header: "Columns", key: "columnCount", width: 9 },
    { header: "Manufacturer", key: "manufacturer" },
    { header: "Model", key: "modelNumber" },
    { header: "Serial", key: "serialNumber" },
    { header: "Condition", key: "condition" },
    { header: "Purchase date", key: "purchaseDate" },
    { header: "Purchase price", key: "purchasePrice", width: 14 },
    { header: "Purchased from", key: "purchasedFrom" },
    { header: "In use", key: "inUse", width: 9 },
    { header: "Notes", key: "notes", width: 36 },
  ]);
  rackSheet.addRows(
    racks.map((r) => ({
      name: r.name,
      totalU: r.totalU,
      columnCount: r.columnCount,
      manufacturer: r.manufacturer,
      modelNumber: r.modelNumber,
      serialNumber: r.serialNumber,
      condition: r.condition,
      purchaseDate: toDate(r.purchaseDate),
      purchasePrice: toNum(r.purchasePrice),
      purchasedFrom: r.purchasedFrom,
      inUse: r.inUse,
      notes: r.notes,
    })),
  );
  rackSheet.getColumn("purchasePrice").numFmt = '"$"#,##0.00';
  rackSheet.getColumn("purchaseDate").numFmt = "yyyy-mm-dd";

  // ---------- Storages ----------
  const storages = await prisma.storage.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assets: true } } },
  });
  const storSheet = wb.addWorksheet("Storages");
  setColumns(storSheet, [
    { header: "Name", key: "name", width: 24 },
    { header: "Assets stored", key: "assetCount", width: 14 },
    { header: "Notes", key: "notes", width: 36 },
  ]);
  storSheet.addRows(
    storages.map((s) => ({
      name: s.name,
      assetCount: s._count.assets,
      notes: s.notes,
    })),
  );

  // ---------- Stream the workbook ----------
  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="cloudchain-inventory-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
