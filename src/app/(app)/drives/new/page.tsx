import { prisma } from "@/lib/prisma";
import { DriveForm, type DriveFormData } from "@/components/forms/drive-form";
import { DRIVE_KINDS, DRIVE_SIZES } from "@/lib/enums";
import { dateInput } from "@/lib/format";
import { createDrive } from "../actions";

export default async function NewDrivePage({
  searchParams,
}: {
  searchParams: Promise<{
    installedInId?: string;
    bayZoneId?: string;
    bayNumber?: string;
    size?: string;
    fromId?: string;
    // "fromAssetId" — pre-fill purchase info from this asset
    fromAssetId?: string;
  }>;
}) {
  const params = await searchParams;

  const [assets, source, fromAsset] = await Promise.all([
    prisma.asset.findMany({
      orderBy: { codename: "asc" },
      select: {
        id: true,
        codename: true,
        bayZones: {
          select: {
            id: true,
            name: true,
            driveSize: true,
            bayCount: true,
            drives: { select: { bayNumber: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    params.fromId
      ? prisma.drive.findUnique({ where: { id: params.fromId } })
      : Promise.resolve(null),
    params.fromAssetId
      ? prisma.asset.findUnique({
          where: { id: params.fromAssetId },
          select: {
            id: true,
            codename: true,
            purchaseDate: true,
            purchasedFrom: true,
            purchasedFromUrl: true,
          },
        })
      : Promise.resolve(null),
  ]);
  const hosts = assets.map((a) => ({
    id: a.id,
    codename: a.codename,
    bayZones: a.bayZones.map((z) => ({
      id: z.id,
      name: z.name,
      driveSize: z.driveSize,
      bayCount: z.bayCount,
      occupiedBays: z.drives
        .map((d) => d.bayNumber)
        .filter((n): n is number => n != null),
    })),
  }));

  // Build the prefilled form data. Two routes feed into this:
  // - Empty-bay click → installedInId/bayZoneId/bayNumber/size in query
  // - Duplicate button → fromId in query
  // Both can coexist; query-param placement wins over the source drive's.
  const hasBayPrefill = Boolean(
    params.installedInId || params.bayZoneId || params.bayNumber || params.size,
  );
  const isDuplicating = Boolean(source);

  let prefill: DriveFormData | undefined;
  if (source) {
    prefill = {
      id: "",
      name: source.name,
      manufacturer: source.manufacturer ?? "",
      model: source.model ?? "",
      kind: source.kind,
      size: source.size,
      capacityGB: source.capacityGB.toString(),
      // Unique per drive — start blank so the user fills it in.
      serialNumber: "",
      manufactureDate: "",
      // Acquisition info is shared across a batch buy — keep it.
      purchaseDate: dateInput(source.purchaseDate),
      purchasePrice: source.purchasePrice?.toString() ?? "",
      purchasedFrom: source.purchasedFrom ?? "",
      purchasedFromUrl: source.purchasedFromUrl ?? "",
      condition: source.condition ?? "",
      assignedUse: source.assignedUse ?? "",
      notes: source.notes ?? "",
      imagePath: source.imagePath ?? "",
      // Placement is always unique — duplicate starts in storage unless the
      // user also passed bay query params.
      installedInId: params.installedInId ?? "",
      bayZoneId: params.bayZoneId ?? "",
      bayNumber: params.bayNumber ?? "",
      state: "IN_USE",
      soldDate: "",
      soldPrice: "",
    };
  } else if (hasBayPrefill) {
    const sizeOk =
      params.size &&
      (DRIVE_SIZES as readonly string[]).includes(params.size)
        ? params.size
        : "SFF";
    prefill = {
      id: "",
      name: "",
      manufacturer: "",
      model: "",
      kind: DRIVE_KINDS[0],
      size: sizeOk,
      capacityGB: "",
      serialNumber: "",
      manufactureDate: "",
      purchaseDate: "",
      purchasePrice: "",
      purchasedFrom: "",
      purchasedFromUrl: "",
      condition: "",
      assignedUse: "",
      notes: "",
      imagePath: "",
      installedInId: params.installedInId ?? "",
      bayZoneId: params.bayZoneId ?? "",
      bayNumber: params.bayNumber ?? "",
      state: "IN_USE",
      soldDate: "",
      soldPrice: "",
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">
          {isDuplicating ? "Duplicate drive" : "New drive"}
        </h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          {isDuplicating ? (
            <>
              Copied from{" "}
              <span className="font-bold text-text">{source?.name}</span>.
              Serial number, manufacture date, and bay placement start blank
              — fill them in for the new unit.
            </>
          ) : (
            <>
              Add a hard drive or SSD.
              {hasBayPrefill && (
                <span className="ml-1 text-accent">
                  Pre-filled from the bay you clicked.
                </span>
              )}
            </>
          )}
        </p>
      </div>
      <DriveForm
        action={createDrive}
        drive={prefill}
        hosts={hosts}
        submitLabel={isDuplicating ? "Create duplicate" : "Create drive"}
        prefill={
          fromAsset && !isDuplicating
            ? {
                purchaseDate: dateInput(fromAsset.purchaseDate),
                purchasedFrom: fromAsset.purchasedFrom ?? undefined,
                purchasedFromUrl: fromAsset.purchasedFromUrl ?? undefined,
                fromAssetLabel: fromAsset.codename,
              }
            : undefined
        }
      />
    </div>
  );
}
