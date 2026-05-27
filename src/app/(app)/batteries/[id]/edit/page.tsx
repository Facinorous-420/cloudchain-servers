import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  BatteryForm,
  type BatteryFormData,
} from "@/components/forms/battery-form";
import { dateInput } from "@/lib/format";
import { updateBattery } from "../../actions";

export default async function EditBatteryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [battery, hosts, storages] = await Promise.all([
    prisma.battery.findUnique({ where: { id } }),
    prisma.asset.findMany({
      orderBy: { codename: "asc" },
      select: { id: true, codename: true },
    }),
    prisma.storage.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!battery) notFound();

  const data: BatteryFormData = {
    id: battery.id,
    name: battery.name,
    manufacturer: battery.manufacturer ?? "",
    model: battery.model ?? "",
    voltage: battery.voltage?.toString() ?? "",
    capacityAh: battery.capacityAh?.toString() ?? "",
    quantity: battery.quantity.toString(),
    installDate: dateInput(battery.installDate),
    purchaseDate: dateInput(battery.purchaseDate),
    purchasePrice: battery.purchasePrice?.toString() ?? "",
    purchasedFrom: battery.purchasedFrom ?? "",
    purchasedFromUrl: battery.purchasedFromUrl ?? "",
    notes: battery.notes ?? "",
    imagePath: battery.imagePath ?? "",
    installedInId: battery.installedInId ?? "",
    storageId: battery.storageId ?? "",
    state: battery.state,
    soldDate: dateInput(battery.soldDate),
    soldPrice: battery.soldPrice?.toString() ?? "",
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Edit battery</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">{battery.name}</p>
      </div>
      <BatteryForm
        action={updateBattery.bind(null, battery.id)}
        battery={data}
        hosts={hosts}
        storages={storages}
        submitLabel="Save changes"
      />
    </div>
  );
}
