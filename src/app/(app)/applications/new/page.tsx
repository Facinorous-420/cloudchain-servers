import { prisma } from "@/lib/prisma";
import { ApplicationForm } from "@/components/forms/application-form";
import { createApplication } from "../actions";

export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ hostId?: string }>;
}) {
  const { hostId } = await searchParams;
  const hosts = await prisma.asset.findMany({
    where: { category: { in: ["SERVER", "NUC", "SBC"] } },
    orderBy: { codename: "asc" },
    select: { id: true, codename: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">New application</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          Record a VM, container, or service running on a server.
        </p>
      </div>
      <ApplicationForm
        action={createApplication}
        application={
          hostId
            ? {
                id: "",
                name: "",
                type: "SERVICE",
                hostId,
                operatingSystem: "",
                status: "",
                notes: "",
                imagePath: "",
              }
            : undefined
        }
        hosts={hosts}
        submitLabel="Create application"
      />
    </div>
  );
}
