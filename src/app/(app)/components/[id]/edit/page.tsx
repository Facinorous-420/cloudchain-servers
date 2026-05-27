import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ComponentForm,
  type ComponentFormData,
} from "@/components/forms/component-form";
import { dateInput } from "@/lib/format";
import { updateComponent } from "../../actions";

export default async function EditComponentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [component, hosts] = await Promise.all([
    prisma.component.findUnique({ where: { id } }),
    prisma.asset.findMany({
      orderBy: { codename: "asc" },
      select: { id: true, codename: true },
    }),
  ]);

  if (!component) notFound();

  const data: ComponentFormData = {
    id: component.id,
    name: component.name,
    type: component.type,
    manufacturer: component.manufacturer ?? "",
    model: component.model ?? "",
    specs: component.specs ?? "",
    serialNumber: component.serialNumber ?? "",
    quantity: component.quantity.toString(),
    purchaseDate: dateInput(component.purchaseDate),
    purchasePrice: component.purchasePrice?.toString() ?? "",
    purchasedFrom: component.purchasedFrom ?? "",
    purchasedFromUrl: component.purchasedFromUrl ?? "",
    notes: component.notes ?? "",
    imagePath: component.imagePath ?? "",
    installedInId: component.installedInId ?? "",
    speedGHz: component.speedGHz?.toString() ?? "",
    cores: component.cores?.toString() ?? "",
    threads: component.threads?.toString() ?? "",
    socket: component.socket ?? "",
    tdpWatts: component.tdpWatts?.toString() ?? "",
    capacityGB: component.capacityGB?.toString() ?? "",
    speedMHz: component.speedMHz?.toString() ?? "",
    generation: component.generation ?? "",
    ecc: component.ecc ?? false,
    formFactor: component.formFactor ?? "",
    portCount: component.portCount?.toString() ?? "",
    portType: component.portType ?? "",
    portSpeed: component.portSpeed ?? "",
    cardInterface: component.cardInterface ?? "",
    wattsRating: component.wattsRating?.toString() ?? "",
    modular: component.modular ?? false,
    state: component.state,
    soldDate: dateInput(component.soldDate),
    soldPrice: component.soldPrice?.toString() ?? "",
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Edit component</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">{component.name}</p>
      </div>
      <ComponentForm
        action={updateComponent.bind(null, component.id)}
        component={data}
        hosts={hosts}
        submitLabel="Save changes"
      />
    </div>
  );
}
