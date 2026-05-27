import { prisma } from "@/lib/prisma";
import { LicenseForm } from "@/components/forms/license-form";
import { createLicense } from "../actions";

export default async function NewLicensePage() {
  const assets = await prisma.asset.findMany({
    orderBy: { codename: "asc" },
    select: { id: true, codename: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">New license</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          Add a software or service license.
        </p>
      </div>
      <LicenseForm
        action={createLicense}
        assets={assets}
        submitLabel="Create license"
      />
    </div>
  );
}
