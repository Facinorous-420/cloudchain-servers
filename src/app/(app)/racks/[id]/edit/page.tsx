import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RackForm, type RackFormData } from "@/components/forms/rack-form";
import { dateInput } from "@/lib/format";
import { getSuggestions } from "@/lib/suggestions";
import { updateRack } from "../../actions";

export default async function EditRackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [rack, suggestions] = await Promise.all([
    prisma.rack.findUnique({ where: { id } }),
    getSuggestions(),
  ]);

  if (!rack) notFound();

  const data: RackFormData = {
    id: rack.id,
    name: rack.name,
    totalU: rack.totalU.toString(),
    columnCount: rack.columnCount.toString(),
    manufacturer: rack.manufacturer ?? "",
    modelNumber: rack.modelNumber ?? "",
    serialNumber: rack.serialNumber ?? "",
    condition: rack.condition ?? "",
    purchaseDate: dateInput(rack.purchaseDate),
    purchasePrice: rack.purchasePrice?.toString() ?? "",
    purchasedFrom: rack.purchasedFrom ?? "",
    purchasedFromUrl: rack.purchasedFromUrl ?? "",
    inUse: rack.inUse,
    notes: rack.notes ?? "",
    imagePath: rack.imagePath ?? "",
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Edit rack</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">{rack.name}</p>
      </div>
      <RackForm
        action={updateRack.bind(null, rack.id)}
        rack={data}
        suggestions={suggestions}
        submitLabel="Save changes"
      />
    </div>
  );
}
