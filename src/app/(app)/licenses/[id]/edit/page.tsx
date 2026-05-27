import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  LicenseForm,
  type LicenseFormData,
} from "@/components/forms/license-form";
import { dateInput } from "@/lib/format";
import { updateLicense } from "../../actions";


export default async function EditLicensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [license, assets] = await Promise.all([
    prisma.license.findUnique({
      where: { id },
      include: { assignments: { select: { assetId: true } } },
    }),
    prisma.asset.findMany({
      orderBy: { codename: "asc" },
      select: { id: true, codename: true },
    }),
  ]);

  if (!license) notFound();

  const data: LicenseFormData = {
    id: license.id,
    name: license.name,
    type: license.type ?? "",
    licenseKey: license.licenseKey ?? "",
    seats: license.seats?.toString() ?? "",
    renewalPeriod: license.renewalPeriod ?? "",
    purchaseDate: dateInput(license.purchaseDate),
    cost: license.cost?.toString() ?? "",
    purchasedFrom: license.purchasedFrom ?? "",
    purchasedFromUrl: license.purchasedFromUrl ?? "",
    notes: license.notes ?? "",
    imagePath: license.imagePath ?? "",
    assignedAssetIds: license.assignments.map((a) => a.assetId),
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Edit license</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">{license.name}</p>
      </div>
      <LicenseForm
        action={updateLicense.bind(null, license.id)}
        license={data}
        assets={assets}
        submitLabel="Save changes"
      />
    </div>
  );
}
