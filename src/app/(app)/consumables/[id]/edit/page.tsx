import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ConsumableForm,
  type ConsumableFormData,
} from "@/components/forms/consumable-form";
import { dateInput } from "@/lib/format";
import { updateConsumable } from "../../actions";

export default async function EditConsumablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const consumable = await prisma.consumable.findUnique({ where: { id } });
  if (!consumable) notFound();

  const data: ConsumableFormData = {
    id: consumable.id,
    name: consumable.name,
    type: consumable.type ?? "",
    quantity: consumable.quantity.toString(),
    location: consumable.location ?? "",
    purchaseDate: dateInput(consumable.purchaseDate),
    purchasePrice: consumable.purchasePrice?.toString() ?? "",
    purchasedFrom: consumable.purchasedFrom ?? "",
    purchasedFromUrl: consumable.purchasedFromUrl ?? "",
    notes: consumable.notes ?? "",
    imagePath: consumable.imagePath ?? "",
    state: consumable.state,
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Edit consumable</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">{consumable.name}</p>
      </div>
      <ConsumableForm
        action={updateConsumable.bind(null, consumable.id)}
        consumable={data}
        submitLabel="Save changes"
      />
    </div>
  );
}
