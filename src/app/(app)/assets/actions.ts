"use server";

import { randomUUID } from "node:crypto";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PRESET_IMAGE_PREFIX } from "@/lib/presets";
import {
  Prisma,
  type ComponentType,
  type PortType,
  type DriveKind,
  type DriveSize,
  type LifecycleState,
} from "@/generated/prisma";
import type { PciNewComponentDraft } from "@/lib/schemas/inline-components";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import type { FormState, CascadeConfirmRequired } from "@/lib/form-state";
import {
  assetSchema,
  bayZonesSchema,
  type AssetFormValues,
  type BayZoneInput,
} from "@/lib/schemas/asset";
import {
  portGroupsSchema,
  type PortGroupInput,
} from "@/lib/schemas/port-group";
import {
  outletGroupsSchema,
  type OutletGroupInput,
} from "@/lib/schemas/outlet-group";
import {
  inlineCpusSchema,
  inlineRamsSchema,
  inlinePciSlotsSchema,
  inlinePsusSchema,
  type InlineCpuInput,
  type InlineRamInput,
  type InlinePciSlotInput,
  type InlinePsuInput,
} from "@/lib/schemas/inline-components";
import type { ImageEntry } from "@/components/ui/multi-image-upload";

function assetScalarData(v: AssetFormValues) {
  return {
    codename: v.codename,
    name: v.name,
    category: v.category,
    manufacturer: v.manufacturer,
    modelNumber: v.modelNumber,
    serialNumber: v.serialNumber,
    condition: v.condition,
    purchaseDate: v.purchaseDate,
    purchasePrice: v.purchasePrice,
    purchasePriceBeforeShip: v.purchasePriceBeforeShip,
    purchasedFrom: v.purchasedFrom,
    purchasedFromUrl: v.purchasedFromUrl,
    state: v.state,
    soldDate: v.soldDate,
    soldPrice: v.soldPrice,
    notes: v.notes,
    formFactor: v.formFactor,
    faceOrientation: v.faceOrientation,
    rackFace: v.rackFace ?? null,
    heightInches: v.heightInches,
    widthInches: v.widthInches,
    depthInches: v.depthInches,
    rackUnits: v.rackUnits,
    requiresSupport: v.requiresSupport,
    storageId: v.storageId,
    builtInEthernetCount: v.builtInEthernetCount,
    builtInSfpCount: v.builtInSfpCount,
    builtInPortsSide: v.builtInPortsSide,
    surgeProtectedEthernetCount: v.surgeProtectedEthernetCount,
    kvmChannelCount: v.kvmChannelCount,
    psuCount: v.psuCount,
    chassis: v.chassis,
    mainboard: v.mainboard,
    raidController: v.raidController,
    operatingSystem: v.operatingSystem,
    biosVersion: v.biosVersion,
    extras: v.extras,
    maxPowerDrawWatts: v.maxPowerDrawWatts,
    idlePowerWatts: v.idlePowerWatts,
    warrantyEndDate: v.warrantyEndDate,
    firmwareVersion: v.firmwareVersion,
    managementType: v.managementType,
    poeBudgetWatts: v.poeBudgetWatts,
    throughputGbps: v.throughputGbps,
    maxConcurrentConnections: v.maxConcurrentConnections,
    vaRating: v.vaRating,
    wattsRating: v.wattsRating,
    estimatedRuntimeMinutes: v.estimatedRuntimeMinutes,
    amperage: v.amperage,
    pduType: v.pduType,
    supportedProtocols: v.supportedProtocols,
    wifiStandard: v.wifiStandard,
    maxThroughputMbps: v.maxThroughputMbps,
    bandSupport: v.bandSupport,
    bandsLegacyText: v.bandsLegacyText,
    poeInputType: v.poeInputType,
    placement: v.placement,
    maxLoadLbs: v.maxLoadLbs,
    ventilated: v.ventilated,
    drawerType: v.drawerType,
    pulloutDepthInches: v.pulloutDepthInches,
    purpose: v.purpose,
    patchPanelType: v.patchPanelType ?? null,
  };
}

function bayZoneCreateData(zone: BayZoneInput) {
  return {
    name: zone.name,
    faceSide: zone.faceSide,
    driveSize: zone.driveSize,
    bayCount: zone.bayCount,
    sortOrder: zone.sortOrder,
  };
}

function portGroupCreateData(g: PortGroupInput) {
  return {
    name: g.name ?? null,
    portCount: g.portCount,
    portType: g.portType,
    portSpeed: g.portSpeed ?? null,
    poePerPort: g.poePerPort ?? null,
    side: g.side,
    sortOrder: g.sortOrder,
    face: g.face ?? null,
    rows: g.rows ?? null,
    columns: g.columns ?? null,
    hiddenPorts: g.hiddenPorts ?? undefined,
  };
}

function outletGroupCreateData(g: OutletGroupInput) {
  return {
    name: g.name ?? null,
    outletCount: g.outletCount,
    outletType: g.outletType ?? null,
    batteryBacked: g.batteryBacked,
    surgeProtected: g.surgeProtected,
    side: g.side,
    sortOrder: g.sortOrder,
    face: g.face ?? null,
    rows: g.rows ?? null,
    columns: g.columns ?? null,
    hiddenPorts: g.hiddenPorts ?? undefined,
  };
}

function cpuComponentData(c: InlineCpuInput) {
  return {
    type: "CPU" as const,
    name: c.name,
    manufacturer: c.manufacturer ?? null,
    model: c.model ?? null,
    quantity: c.quantity,
    speedGHz: c.speedGHz ?? null,
    cores: c.cores ?? null,
    threads: c.threads ?? null,
    socket: c.socket ?? null,
    tdpWatts: c.tdpWatts ?? null,
  };
}

function ramComponentData(r: InlineRamInput) {
  return {
    type: "RAM" as const,
    name: r.name,
    manufacturer: r.manufacturer ?? null,
    model: r.model ?? null,
    quantity: r.quantity,
    capacityGB: r.capacityGB ?? null,
    speedMHz: r.speedMHz ?? null,
    generation: r.generation ?? null,
    ecc: r.ecc ?? null,
    formFactor: r.formFactor ?? null,
  };
}

function parseJsonArray<T>(
  formData: FormData,
  field: string,
  schema: z.ZodType<T[]>,
): T[] | null {
  const raw = formData.get(field);
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

const PRESETS_ROOT = path.join(process.cwd(), "presets");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const PRESET_IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif"]);

// Gallery entries seeded from a preset point at /api/preset-image (a read-only
// file under presets/). Copy each into public/uploads so the saved asset owns a
// real, editable image like any user upload. Non-preset paths pass through
// unchanged; any entry that can't be copied is dropped rather than failing save.
async function materializePresetImages(gallery: ImageEntry[]): Promise<ImageEntry[]> {
  const out: ImageEntry[] = [];
  let madeDir = false;
  for (const entry of gallery) {
    if (!entry.path.startsWith(PRESET_IMAGE_PREFIX)) {
      out.push(entry);
      continue;
    }
    try {
      const src = decodeURIComponent(entry.path.slice(PRESET_IMAGE_PREFIX.length));
      const resolved = path.resolve(PRESETS_ROOT, src);
      if (
        resolved !== PRESETS_ROOT &&
        !resolved.startsWith(PRESETS_ROOT + path.sep)
      ) {
        continue; // path traversal — skip
      }
      const ext = path.extname(resolved).slice(1).toLowerCase();
      if (!PRESET_IMAGE_EXTS.has(ext)) continue;
      if (!madeDir) {
        await mkdir(UPLOADS_DIR, { recursive: true });
        madeDir = true;
      }
      const filename = `${randomUUID()}.${ext}`;
      await copyFile(resolved, path.join(UPLOADS_DIR, filename));
      out.push({ path: `/uploads/${filename}`, isMain: entry.isMain });
    } catch {
      // Source missing or unreadable — skip this image.
    }
  }
  return out;
}

// Create a component for a pending PCIe-slot install. For an NVMe riser this
// also creates its M.2 bay zone and any drives the user defined inline, mounting
// them into the riser's slots. Returns the new component id (to link the slot).
async function createPciComponentWithExtras(
  client: Prisma.TransactionClient,
  hostAssetId: string,
  nc: PciNewComponentDraft,
): Promise<string> {
  const isRiser = nc.type === "NVME_RISER";
  const newComp = await client.component.create({
    data: {
      name: nc.name,
      type: nc.type as ComponentType,
      manufacturer: nc.manufacturer ?? null,
      model: nc.model ?? null,
      portCount: nc.portCount ?? null,
      portType: (nc.portType ?? null) as PortType | null,
      portSpeed: nc.portSpeed ?? null,
      cardInterface: nc.cardInterface ?? null,
      cardSize: nc.cardSize ?? null,
      m2SlotCount: isRiser ? nc.m2SlotCount ?? null : null,
      installedInId: hostAssetId,
    },
  });

  if (isRiser && nc.m2SlotCount && nc.m2SlotCount > 0) {
    const zone = await client.bayZone.create({
      data: {
        componentId: newComp.id,
        name: nc.m2SlotSize ? `${nc.m2SlotSize} slots` : "M.2 slots",
        faceSide: "FRONT",
        driveSize: "M2",
        bayCount: nc.m2SlotCount,
        sortOrder: 0,
      },
    });
    const drives = (nc.drives ?? []).slice(0, nc.m2SlotCount);
    if (drives.length > 0) {
      await client.drive.createMany({
        data: drives.map((d, i) => ({
          name: d.name,
          kind: "NVME" as DriveKind,
          size: "M2" as DriveSize,
          capacityGB: d.capacityGB,
          state: "IN_USE" as LifecycleState,
          installedInId: hostAssetId,
          bayZoneId: zone.id,
          bayNumber: i + 1,
        })),
      });
    }
  }
  return newComp.id;
}

function isUniqueCodenameError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function parseImageGallery(formData: FormData): ImageEntry[] {
  const raw = formData.get("imageGallery");
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter(
      (e): e is ImageEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as Record<string, unknown>).path === "string" &&
        typeof (e as Record<string, unknown>).isMain === "boolean",
    );
  } catch {
    return [];
  }
}

export async function createAsset(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const parsed = assetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const zones = parseJsonArray<BayZoneInput>(formData, "bayZones", bayZonesSchema);
  if (zones === null) {
    return { fieldErrors: { bayZones: ["Drive bay data is invalid"] } };
  }
  const portGroups = parseJsonArray<PortGroupInput>(
    formData,
    "portGroups",
    portGroupsSchema,
  );
  if (portGroups === null) {
    return { fieldErrors: { portGroups: ["Port group data is invalid"] } };
  }
  const outletGroups = parseJsonArray<OutletGroupInput>(
    formData,
    "outletGroups",
    outletGroupsSchema,
  );
  if (outletGroups === null) {
    return { fieldErrors: { outletGroups: ["Outlet group data is invalid"] } };
  }
  const cpus = parseJsonArray<InlineCpuInput>(formData, "cpus", inlineCpusSchema);
  if (cpus === null) {
    return { fieldErrors: { cpus: ["CPU data is invalid"] } };
  }
  const rams = parseJsonArray<InlineRamInput>(formData, "rams", inlineRamsSchema);
  if (rams === null) {
    return { fieldErrors: { rams: ["RAM data is invalid"] } };
  }
  const pciSlots = parseJsonArray<InlinePciSlotInput>(formData, "pciSlots", inlinePciSlotsSchema);
  if (pciSlots === null) {
    return { fieldErrors: { pciSlots: ["PCIe slot data is invalid"] } };
  }
  const psus = parseJsonArray<InlinePsuInput>(formData, "psus", inlinePsusSchema);
  if (psus === null) {
    return { fieldErrors: { psus: ["PSU data is invalid"] } };
  }

  const values = parsed.data;
  const isServer = values.category === "SERVER";
  const isServerLike = isServer || values.category === "NUC";

  const componentsToCreate = isServerLike
    ? [...cpus.map(cpuComponentData), ...rams.map(ramComponentData)]
    : [];

  const imageGallery = await materializePresetImages(parseImageGallery(formData));
  const hasPendingPciInstalls =
    isServerLike &&
    pciSlots.some((s) => s.pendingExistingComponentId || s.pendingNewComponent);

  try {
    const created = await prisma.asset.create({
      data: {
        ...assetScalarData(values),
        bayZones:
          isServer && zones.length > 0
            ? { create: zones.map(bayZoneCreateData) }
            : undefined,
        portGroups:
          portGroups.length > 0
            ? { create: portGroups.map(portGroupCreateData) }
            : undefined,
        outletGroups:
          outletGroups.length > 0
            ? { create: outletGroups.map(outletGroupCreateData) }
            : undefined,
        components:
          componentsToCreate.length > 0
            ? { create: componentsToCreate }
            : undefined,
        pciSlots:
          isServerLike && pciSlots.length > 0
            ? { create: pciSlots.map((s, i) => ({ sortOrder: i, size: s.size })) }
            : undefined,
        psus:
          isServerLike && psus.length > 0
            ? {
                create: psus.map((p, i) => ({
                  sortOrder: i,
                  side: p.side,
                  wattage: p.wattage ?? null,
                  portCount: p.portCount,
                  state: p.state,
                  manufacturer: p.manufacturer ?? null,
                  model: p.model ?? null,
                })),
              }
            : undefined,
        images:
          imageGallery.length > 0
            ? {
                create: imageGallery.map((img, i) => ({
                  path: img.path,
                  isMain: img.isMain,
                  sortOrder: i,
                })),
              }
            : undefined,
      },
      select: { id: true },
    });

    // Handle pending PCIe card installs (existing inventory or newly created)
    if (hasPendingPciInstalls) {
      const dbSlots = await prisma.pciSlot.findMany({
        where: { assetId: created.id },
        select: { id: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      });
      for (const [i, slot] of pciSlots.entries()) {
        if (!slot.pendingExistingComponentId && !slot.pendingNewComponent) continue;
        const dbSlot = dbSlots.find((s) => s.sortOrder === i);
        if (!dbSlot) continue;

        if (slot.pendingExistingComponentId) {
          await prisma.$transaction([
            prisma.pciSlot.update({
              where: { id: dbSlot.id },
              data: { occupiedByComponentId: slot.pendingExistingComponentId },
            }),
            prisma.component.update({
              where: { id: slot.pendingExistingComponentId },
              data: { installedInId: created.id },
            }),
          ]);
        } else if (slot.pendingNewComponent) {
          const newCompId = await createPciComponentWithExtras(
            prisma,
            created.id,
            slot.pendingNewComponent,
          );
          await prisma.pciSlot.update({
            where: { id: dbSlot.id },
            data: { occupiedByComponentId: newCompId },
          });
        }
      }
    }
  } catch (error) {
    if (isUniqueCodenameError(error)) {
      return { fieldErrors: { codename: ["Codename is already in use"] } };
    }
    throw error;
  }

  revalidatePath("/assets");
  redirect("/assets");
}

export async function updateAsset(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();

  const parsed = assetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const zones = parseJsonArray<BayZoneInput>(formData, "bayZones", bayZonesSchema);
  if (zones === null) {
    return { fieldErrors: { bayZones: ["Drive bay data is invalid"] } };
  }
  const portGroups = parseJsonArray<PortGroupInput>(
    formData,
    "portGroups",
    portGroupsSchema,
  );
  if (portGroups === null) {
    return { fieldErrors: { portGroups: ["Port group data is invalid"] } };
  }
  const outletGroups = parseJsonArray<OutletGroupInput>(
    formData,
    "outletGroups",
    outletGroupsSchema,
  );
  if (outletGroups === null) {
    return { fieldErrors: { outletGroups: ["Outlet group data is invalid"] } };
  }
  const cpus = parseJsonArray<InlineCpuInput>(formData, "cpus", inlineCpusSchema);
  if (cpus === null) {
    return { fieldErrors: { cpus: ["CPU data is invalid"] } };
  }
  const rams = parseJsonArray<InlineRamInput>(formData, "rams", inlineRamsSchema);
  if (rams === null) {
    return { fieldErrors: { rams: ["RAM data is invalid"] } };
  }
  const pciSlots = parseJsonArray<InlinePciSlotInput>(formData, "pciSlots", inlinePciSlotsSchema);
  if (pciSlots === null) {
    return { fieldErrors: { pciSlots: ["PCIe slot data is invalid"] } };
  }
  const psus = parseJsonArray<InlinePsuInput>(formData, "psus", inlinePsusSchema);
  if (psus === null) {
    return { fieldErrors: { psus: ["PSU data is invalid"] } };
  }

  const values = parsed.data;
  const isServer = values.category === "SERVER";
  const isServerLike = isServer || values.category === "NUC";
  const imageGallery = await materializePresetImages(parseImageGallery(formData));

  // Cascade prompt: when marking SOLD/JUNKED for the first time in this
  // submit, check whether nested items need the same treatment.
  const cascadeChoice = formData.get("cascadeChoice"); // "same" | "keep" | absent
  const isSoldOrJunked = values.state === "SOLD" || values.state === "JUNKED";

  if (isSoldOrJunked && !cascadeChoice) {
    const [drivesCount, componentsCount, pciCardCount, batteriesCount] = await Promise.all([
      prisma.drive.count({
        where: { installedInId: id, state: { notIn: ["SOLD", "JUNKED"] } },
      }),
      prisma.component.count({
        where: { installedInId: id, state: { notIn: ["SOLD", "JUNKED"] } },
      }),
      prisma.component.count({
        where: {
          installedInId: id,
          state: { notIn: ["SOLD", "JUNKED"] },
          type: { in: ["NIC_CARD", "GPU", "PCIE_CARD", "RAID_CONTROLLER"] },
        },
      }),
      prisma.battery.count({
        where: { installedInId: id, state: { notIn: ["SOLD", "JUNKED"] } },
      }),
    ]);
    if (drivesCount + componentsCount + batteriesCount > 0) {
      return {
        confirmCascade: {
          assetId: id,
          newState: values.state as CascadeConfirmRequired["newState"],
          drivesCount,
          componentsCount,
          pciCardCount,
          batteriesCount,
        },
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id },
        data: assetScalarData(values),
      });

      // Apply cascade to nested items when the user confirmed it.
      if (isSoldOrJunked && cascadeChoice === "same") {
        await tx.drive.updateMany({
          where: { installedInId: id, state: { notIn: ["SOLD", "JUNKED"] } },
          data: { state: values.state },
        });
        await tx.component.updateMany({
          where: { installedInId: id, state: { notIn: ["SOLD", "JUNKED"] } },
          data: { state: values.state },
        });
        await tx.battery.updateMany({
          where: { installedInId: id, state: { notIn: ["SOLD", "JUNKED"] } },
          data: { state: values.state },
        });
      }

      // Image gallery — replace all existing rows with the submitted set.
      await tx.assetImage.deleteMany({ where: { assetId: id } });
      if (imageGallery.length > 0) {
        await tx.assetImage.createMany({
          data: imageGallery.map((img, i) => ({
            assetId: id,
            path: img.path,
            isMain: img.isMain,
            sortOrder: i,
          })),
        });
      }

      // Bay zones (servers only)
      if (!isServer) {
        await tx.bayZone.deleteMany({ where: { assetId: id } });
      } else {
        const keepIds = zones.flatMap((z) => (z.id ? [z.id] : []));
        await tx.bayZone.deleteMany({
          where: { assetId: id, id: { notIn: keepIds } },
        });
        for (const zone of zones) {
          if (zone.id) {
            await tx.bayZone.update({
              where: { id: zone.id },
              data: bayZoneCreateData(zone),
            });
          } else {
            await tx.bayZone.create({
              data: { assetId: id, ...bayZoneCreateData(zone) },
            });
          }
        }
      }

      // Port groups
      const keepPortIds = portGroups.flatMap((g) => (g.id ? [g.id] : []));
      await tx.portGroup.deleteMany({
        where: { assetId: id, id: { notIn: keepPortIds } },
      });
      for (const g of portGroups) {
        if (g.id) {
          await tx.portGroup.update({
            where: { id: g.id },
            data: portGroupCreateData(g),
          });
        } else {
          await tx.portGroup.create({
            data: { assetId: id, ...portGroupCreateData(g) },
          });
        }
      }

      // Outlet groups
      const keepOutletIds = outletGroups.flatMap((g) => (g.id ? [g.id] : []));
      await tx.outletGroup.deleteMany({
        where: { assetId: id, id: { notIn: keepOutletIds } },
      });
      for (const g of outletGroups) {
        if (g.id) {
          await tx.outletGroup.update({
            where: { id: g.id },
            data: outletGroupCreateData(g),
          });
        } else {
          await tx.outletGroup.create({
            data: { assetId: id, ...outletGroupCreateData(g) },
          });
        }
      }

      // CPU + RAM components (server-like only). For non-server-like categories
      // we leave any pre-existing CPU/RAM Components alone — the user can
      // manage them via /components.
      if (isServerLike) {
        const keepCpuIds = cpus.flatMap((c) => (c.id ? [c.id] : []));
        await tx.component.deleteMany({
          where: { installedInId: id, type: "CPU", id: { notIn: keepCpuIds } },
        });
        for (const cpu of cpus) {
          if (cpu.id) {
            await tx.component.update({
              where: { id: cpu.id },
              data: cpuComponentData(cpu),
            });
          } else {
            await tx.component.create({
              data: { installedInId: id, ...cpuComponentData(cpu) },
            });
          }
        }

        const keepRamIds = rams.flatMap((r) => (r.id ? [r.id] : []));
        await tx.component.deleteMany({
          where: { installedInId: id, type: "RAM", id: { notIn: keepRamIds } },
        });
        for (const ram of rams) {
          if (ram.id) {
            await tx.component.update({
              where: { id: ram.id },
              data: ramComponentData(ram),
            });
          } else {
            await tx.component.create({
              data: { installedInId: id, ...ramComponentData(ram) },
            });
          }
        }

        // PCIe slots
        const keepSlotIds = pciSlots.flatMap((s) => (s.id ? [s.id] : []));

        // Slots being removed from the form that are occupied: vacate them first
        const beingRemoved = await tx.pciSlot.findMany({
          where: { assetId: id, id: { notIn: keepSlotIds }, occupiedByComponentId: { not: null } },
          select: { id: true, occupiedByComponentId: true },
        });
        for (const s of beingRemoved) {
          // Delete connections for NIC/RAID card ports being removed
          const removedComp = await tx.component.findUnique({
            where: { id: s.occupiedByComponentId! },
            select: { name: true, type: true, portCount: true },
          });
          if (
            removedComp &&
            (removedComp.type === "NIC_CARD" || removedComp.type === "RAID_CONTROLLER") &&
            (removedComp.portCount ?? 0) > 0
          ) {
            const portLabels = Array.from(
              { length: removedComp.portCount! },
              (_, i) => `${removedComp.name} Port ${i + 1}`,
            );
            await tx.connection.deleteMany({
              where: {
                OR: [
                  { aEndAssetId: id, aEndLabel: { in: portLabels } },
                  { bEndAssetId: id, bEndLabel: { in: portLabels } },
                ],
              },
            });
          }
          await tx.pciSlot.update({ where: { id: s.id }, data: { occupiedByComponentId: null } });
          await tx.component.update({ where: { id: s.occupiedByComponentId! }, data: { installedInId: null } });
        }
        // Delete all non-kept slots (now all unoccupied after the vacates above)
        await tx.pciSlot.deleteMany({ where: { assetId: id, id: { notIn: keepSlotIds } } });

        for (const [i, slot] of pciSlots.entries()) {
          let slotId: string;
          if (slot.id) {
            await tx.pciSlot.update({ where: { id: slot.id }, data: { sortOrder: i, size: slot.size } });
            slotId = slot.id;
          } else {
            const created = await tx.pciSlot.create({ data: { assetId: id, sortOrder: i, size: slot.size } });
            slotId = created.id;
          }

          if (slot.pendingVacate && slot.occupiedByComponentId) {
            // Delete connections for NIC/RAID card ports being vacated
            const vacComp = await tx.component.findUnique({
              where: { id: slot.occupiedByComponentId },
              select: { name: true, type: true, portCount: true },
            });
            if (
              vacComp &&
              (vacComp.type === "NIC_CARD" || vacComp.type === "RAID_CONTROLLER") &&
              (vacComp.portCount ?? 0) > 0
            ) {
              const portLabels = Array.from(
                { length: vacComp.portCount! },
                (_, i) => `${vacComp.name} Port ${i + 1}`,
              );
              await tx.connection.deleteMany({
                where: {
                  OR: [
                    { aEndAssetId: id, aEndLabel: { in: portLabels } },
                    { bEndAssetId: id, bEndLabel: { in: portLabels } },
                  ],
                },
              });
            }
            // Remove the current occupant
            await tx.pciSlot.update({ where: { id: slotId }, data: { occupiedByComponentId: null } });
            await tx.component.update({ where: { id: slot.occupiedByComponentId }, data: { installedInId: null } });
          } else if (!slot.occupiedByComponentId) {
            // Slot is empty — apply pending install if any
            if (slot.pendingExistingComponentId) {
              await tx.pciSlot.update({
                where: { id: slotId },
                data: { occupiedByComponentId: slot.pendingExistingComponentId },
              });
              await tx.component.update({
                where: { id: slot.pendingExistingComponentId },
                data: { installedInId: id },
              });
            } else if (slot.pendingNewComponent) {
              const newCompId = await createPciComponentWithExtras(
                tx,
                id,
                slot.pendingNewComponent,
              );
              await tx.pciSlot.update({
                where: { id: slotId },
                data: { occupiedByComponentId: newCompId },
              });
            }
          }
        }

        // PSU records (server-like only)
        const keepPsuIds = psus.flatMap((p) => (p.id ? [p.id] : []));
        await tx.psu.deleteMany({
          where: { assetId: id, id: { notIn: keepPsuIds } },
        });
        for (const [i, psu] of psus.entries()) {
          if (psu.id) {
            await tx.psu.update({
              where: { id: psu.id },
              data: {
                sortOrder: i,
                side: psu.side,
                wattage: psu.wattage ?? null,
                portCount: psu.portCount,
                state: psu.state,
                manufacturer: psu.manufacturer ?? null,
                model: psu.model ?? null,
              },
            });
          } else {
            await tx.psu.create({
              data: {
                assetId: id,
                sortOrder: i,
                side: psu.side,
                wattage: psu.wattage ?? null,
                portCount: psu.portCount,
                state: psu.state,
                manufacturer: psu.manufacturer ?? null,
                model: psu.model ?? null,
              },
            });
          }
        }
      }
    });
  } catch (error) {
    if (isUniqueCodenameError(error)) {
      return { fieldErrors: { codename: ["Codename is already in use"] } };
    }
    throw error;
  }

  revalidatePath("/assets");
  redirect("/assets");
}

// ---------- Quick-manage server actions (asset detail page inline UI) ----------

export async function quickInstallComponent(
  assetId: string,
  componentId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const comp = await prisma.component.findUnique({
    where: { id: componentId },
    select: { installedInId: true },
  });
  if (!comp) return { ok: false, error: "Component not found." };
  if (comp.installedInId)
    return { ok: false, error: "Component is already installed elsewhere." };
  await prisma.component.update({
    where: { id: componentId },
    data: { installedInId: assetId },
  });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  return { ok: true };
}

export async function quickUninstallComponent(
  componentId: string,
  assetId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  await prisma.$transaction(async (tx) => {
    // Delete label-based connections for NIC/RAID card ports
    const comp = await tx.component.findUnique({
      where: { id: componentId },
      select: { name: true, type: true, portCount: true },
    });
    if (comp && (comp.type === "NIC_CARD" || comp.type === "RAID_CONTROLLER") && (comp.portCount ?? 0) > 0) {
      const portLabels = Array.from(
        { length: comp.portCount! },
        (_, i) => `${comp.name} Port ${i + 1}`,
      );
      await tx.connection.deleteMany({
        where: {
          OR: [
            { aEndAssetId: assetId, aEndLabel: { in: portLabels } },
            { bEndAssetId: assetId, bEndLabel: { in: portLabels } },
          ],
        },
      });
    }
    // Vacate any PCIe slot this component occupies.
    await tx.pciSlot.updateMany({
      where: { occupiedByComponentId: componentId },
      data: { occupiedByComponentId: null },
    });
    await tx.component.update({
      where: { id: componentId },
      data: { installedInId: null },
    });
  });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  return { ok: true };
}

export async function quickUninstallDrive(
  driveId: string,
  assetId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  await prisma.drive.update({
    where: { id: driveId },
    data: { installedInId: null, bayZoneId: null, bayNumber: null },
  });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  return { ok: true };
}

export async function quickOccupyPciSlot(
  slotId: string,
  componentId: string,
  assetId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const slot = await prisma.pciSlot.findUnique({
    where: { id: slotId },
    select: { occupiedByComponentId: true, assetId: true },
  });
  if (!slot) return { ok: false, error: "Slot not found." };
  if (slot.occupiedByComponentId)
    return { ok: false, error: "Slot is already occupied." };
  await prisma.$transaction([
    prisma.pciSlot.update({
      where: { id: slotId },
      data: { occupiedByComponentId: componentId },
    }),
    prisma.component.update({
      where: { id: componentId },
      data: { installedInId: assetId },
    }),
  ]);
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  return { ok: true };
}

export async function quickVacatePciSlot(
  slotId: string,
  componentId: string,
  assetId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  await prisma.$transaction(async (tx) => {
    // Delete label-based connections for NIC/RAID card ports
    const comp = await tx.component.findUnique({
      where: { id: componentId },
      select: { name: true, type: true, portCount: true },
    });
    if (comp && (comp.type === "NIC_CARD" || comp.type === "RAID_CONTROLLER") && (comp.portCount ?? 0) > 0) {
      const portLabels = Array.from(
        { length: comp.portCount! },
        (_, i) => `${comp.name} Port ${i + 1}`,
      );
      await tx.connection.deleteMany({
        where: {
          OR: [
            { aEndAssetId: assetId, aEndLabel: { in: portLabels } },
            { bEndAssetId: assetId, bEndLabel: { in: portLabels } },
          ],
        },
      });
    }
    await tx.pciSlot.update({
      where: { id: slotId },
      data: { occupiedByComponentId: null },
    });
    await tx.component.update({
      where: { id: componentId },
      data: { installedInId: null },
    });
  });
  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/assets");
  return { ok: true };
}

// ---------- Save as preset ----------

export async function saveAsPreset(
  assetId: string,
  name: string,
  tagsRaw: string,
): Promise<{ ok: boolean; error?: string; slug?: string }> {
  await requireUser();

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      bayZones: { orderBy: { sortOrder: "asc" } },
      portGroups: { orderBy: { sortOrder: "asc" } },
      outletGroups: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!asset) return { ok: false, error: "Asset not found." };

  const trimmedName = name.trim();
  if (!trimmedName) return { ok: false, error: "Name is required." };

  const slug = trimmedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const preset: Record<string, any> = {
    name: trimmedName,
    category: asset.category,
    ...(asset.manufacturer && { manufacturer: asset.manufacturer }),
    ...(asset.modelNumber && { modelNumber: asset.modelNumber }),
    ...(tags.length > 0 && { tags }),
    thumbnail: "images/front.jpg",
    formFactor: asset.formFactor,
    ...(asset.heightInches != null && { heightInches: asset.heightInches }),
    ...(asset.widthInches != null && { widthInches: asset.widthInches }),
    ...(asset.depthInches != null && { depthInches: asset.depthInches }),
    ...(asset.rackUnits != null && { rackUnits: asset.rackUnits }),
    requiresSupport: asset.requiresSupport,
    ...(asset.psuCount != null && { psuCount: asset.psuCount }),
    ...(asset.builtInEthernetCount != null && { builtInEthernetCount: asset.builtInEthernetCount }),
    ...(asset.builtInSfpCount != null && { builtInSfpCount: asset.builtInSfpCount }),
    ...(asset.builtInPortsSide && { builtInPortsSide: asset.builtInPortsSide }),
    ...(asset.surgeProtectedEthernetCount != null && { surgeProtectedEthernetCount: asset.surgeProtectedEthernetCount }),
    ...(asset.kvmChannelCount != null && { kvmChannelCount: asset.kvmChannelCount }),
    ...(asset.maxPowerDrawWatts != null && { maxPowerDrawWatts: asset.maxPowerDrawWatts }),
    ...(asset.idlePowerWatts != null && { idlePowerWatts: asset.idlePowerWatts }),
    ...(asset.chassis && { chassis: asset.chassis }),
    ...(asset.mainboard && { mainboard: asset.mainboard }),
    ...(asset.raidController && { raidController: asset.raidController }),
    ...(asset.operatingSystem && { operatingSystem: asset.operatingSystem }),
    ...(asset.extras && { extras: asset.extras }),
    ...(asset.managementType && { managementType: asset.managementType }),
    ...(asset.poeBudgetWatts != null && { poeBudgetWatts: asset.poeBudgetWatts }),
    ...(asset.throughputGbps != null && { throughputGbps: Number(asset.throughputGbps) }),
    ...(asset.maxConcurrentConnections != null && { maxConcurrentConnections: asset.maxConcurrentConnections }),
    ...(asset.vaRating != null && { vaRating: asset.vaRating }),
    ...(asset.wattsRating != null && { wattsRating: asset.wattsRating }),
    ...(asset.estimatedRuntimeMinutes != null && { estimatedRuntimeMinutes: asset.estimatedRuntimeMinutes }),
    ...(asset.amperage && { amperage: asset.amperage }),
    ...(asset.pduType && { pduType: asset.pduType }),
    ...(asset.supportedProtocols && { supportedProtocols: asset.supportedProtocols }),
    ...(asset.wifiStandard && { wifiStandard: asset.wifiStandard }),
    ...(asset.maxThroughputMbps != null && { maxThroughputMbps: asset.maxThroughputMbps }),
    ...(asset.bandSupport && { bandSupport: asset.bandSupport }),
    ...(asset.poeInputType && { poeInputType: asset.poeInputType }),
    ...(asset.placement && { placement: asset.placement }),
    ...(asset.maxLoadLbs != null && { maxLoadLbs: Number(asset.maxLoadLbs) }),
    ventilated: asset.ventilated,
    ...(asset.drawerType && { drawerType: asset.drawerType }),
    ...(asset.pulloutDepthInches != null && { pulloutDepthInches: Number(asset.pulloutDepthInches) }),
    ...(asset.purpose && { purpose: asset.purpose }),
  };

  if (asset.bayZones.length > 0) {
    preset.bayZones = asset.bayZones.map((z) => ({
      name: z.name,
      faceSide: z.faceSide,
      driveSize: z.driveSize,
      bayCount: z.bayCount,
      sortOrder: z.sortOrder,
    }));
  }
  if (asset.portGroups.length > 0) {
    preset.portGroups = asset.portGroups.map((g) => ({
      ...(g.name && { name: g.name }),
      portCount: g.portCount,
      portType: g.portType,
      ...(g.portSpeed && { portSpeed: g.portSpeed }),
      ...(g.poePerPort != null && { poePerPort: g.poePerPort }),
      side: g.side,
      sortOrder: g.sortOrder,
    }));
  }
  if (asset.outletGroups.length > 0) {
    preset.outletGroups = asset.outletGroups.map((g) => ({
      ...(g.name && { name: g.name }),
      outletCount: g.outletCount,
      ...(g.outletType && { outletType: g.outletType }),
      batteryBacked: g.batteryBacked,
      surgeProtected: g.surgeProtected,
      side: g.side,
      sortOrder: g.sortOrder,
    }));
  }

  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const CUSTOM_BASE = path.join(process.cwd(), "presets", "custom", "assets");
  const dir = path.join(CUSTOM_BASE, slug);

  await mkdir(path.join(dir, "images"), { recursive: true });
  await writeFile(path.join(dir, "preset.json"), JSON.stringify(preset, null, 2), "utf-8");

  return { ok: true, slug };
}

export async function deleteAsset(id: string): Promise<void> {
  await requireUser();

  // Clear the placement triplet on any installed drives before the asset (and
  // its bay zones) are removed — see the drive placement rule in CLAUDE.md §5.
  await prisma.$transaction([
    prisma.drive.updateMany({
      where: { installedInId: id },
      data: { installedInId: null, bayZoneId: null, bayNumber: null },
    }),
    prisma.asset.delete({ where: { id } }),
  ]);

  revalidatePath("/assets");
}
