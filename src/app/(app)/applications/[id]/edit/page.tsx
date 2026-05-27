import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ApplicationForm,
  type ApplicationFormData,
} from "@/components/forms/application-form";
import { updateApplication } from "../../actions";

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [app, hosts] = await Promise.all([
    prisma.application.findUnique({ where: { id } }),
    prisma.asset.findMany({
      where: { category: { in: ["SERVER", "NUC", "SBC"] } },
      orderBy: { codename: "asc" },
      select: { id: true, codename: true },
    }),
  ]);

  if (!app) notFound();

  const data: ApplicationFormData = {
    id: app.id,
    name: app.name,
    type: app.type,
    hostId: app.hostId,
    operatingSystem: app.operatingSystem ?? "",
    status: app.status ?? "",
    notes: app.notes ?? "",
    imagePath: app.imagePath ?? "",
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Edit application</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">{app.name}</p>
      </div>
      <ApplicationForm
        action={updateApplication.bind(null, app.id)}
        application={data}
        hosts={hosts}
        submitLabel="Save changes"
      />
    </div>
  );
}
