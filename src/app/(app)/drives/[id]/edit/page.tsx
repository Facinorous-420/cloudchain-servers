import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DriveForm, type DriveFormData } from "@/components/forms/drive-form";
import { dateInput } from "@/lib/format";
import { updateDrive } from "../../actions";

export default async function EditDrivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [drive, assets] = await Promise.all([
    prisma.drive.findUnique({ where: { id } }),
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
            drives: { select: { id: true, bayNumber: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  ]);

  if (!drive) notFound();

  const hosts = assets.map((a) => ({
    id: a.id,
    codename: a.codename,
    bayZones: a.bayZones.map((z) => ({
      id: z.id,
      name: z.name,
      driveSize: z.driveSize,
      bayCount: z.bayCount,
      // exclude the drive we're editing so its current bay is selectable.
      occupiedBays: z.drives
        .filter((d) => d.id !== drive.id)
        .map((d) => d.bayNumber)
        .filter((n): n is number => n != null),
    })),
  }));

  const data: DriveFormData = {
    id: drive.id,
    name: drive.name,
    manufacturer: drive.manufacturer ?? "",
    model: drive.model ?? "",
    kind: drive.kind,
    size: drive.size,
    capacityGB: drive.capacityGB.toString(),
    serialNumber: drive.serialNumber ?? "",
    manufactureDate: dateInput(drive.manufactureDate),
    purchaseDate: dateInput(drive.purchaseDate),
    purchasePrice: drive.purchasePrice?.toString() ?? "",
    purchasedFrom: drive.purchasedFrom ?? "",
    purchasedFromUrl: drive.purchasedFromUrl ?? "",
    condition: drive.condition ?? "",
    assignedUse: drive.assignedUse ?? "",
    notes: drive.notes ?? "",
    imagePath: drive.imagePath ?? "",
    installedInId: drive.installedInId ?? "",
    bayZoneId: drive.bayZoneId ?? "",
    bayNumber: drive.bayNumber?.toString() ?? "",
    state: drive.state,
    soldDate: dateInput(drive.soldDate),
    soldPrice: drive.soldPrice?.toString() ?? "",
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Edit drive</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">{drive.name}</p>
      </div>
      <DriveForm
        action={updateDrive.bind(null, drive.id)}
        drive={data}
        hosts={hosts}
        submitLabel="Save changes"
      />
    </div>
  );
}
