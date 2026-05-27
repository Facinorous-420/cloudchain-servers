import { prisma } from "@/lib/prisma";
import { BatteryForm } from "@/components/forms/battery-form";
import { createBattery } from "../actions";

export default async function NewBatteryPage() {
  const [hosts, storages] = await Promise.all([
    prisma.asset.findMany({
      orderBy: { codename: "asc" },
      select: { id: true, codename: true },
    }),
    prisma.storage.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">New battery</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          Add a battery inside a UPS or track a spare in storage.
        </p>
      </div>
      <BatteryForm
        action={createBattery}
        hosts={hosts}
        storages={storages}
        submitLabel="Create battery"
      />
    </div>
  );
}
