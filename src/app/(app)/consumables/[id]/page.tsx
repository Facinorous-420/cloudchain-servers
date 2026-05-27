import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import {
  DetailField,
  DetailGrid,
  DetailSection,
} from "@/components/ui/detail";
import { formatDate, formatMoney } from "@/lib/format";
import { EntityImage } from "@/components/ui/entity-image";

export default async function ConsumableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const consumable = await prisma.consumable.findUnique({ where: { id } });
  if (!consumable) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">{consumable.name}</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Qty {consumable.quantity}
            {consumable.type ? ` · ${consumable.type}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/consumables">Back</LinkButton>
          <LinkButton
            href={`/consumables/${consumable.id}/edit`}
            variant="primary"
          >
            Edit
          </LinkButton>
        </div>
      </div>

      {consumable.imagePath && (
        <DetailSection title="Image">
          <EntityImage path={consumable.imagePath} alt={consumable.name} />
        </DetailSection>
      )}

      <DetailSection title="Consumable">
        <DetailGrid>
          <DetailField label="Type" value={consumable.type} />
          <DetailField label="Quantity" value={consumable.quantity} />
          <DetailField label="Location" value={consumable.location} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Acquisition">
        <DetailGrid>
          <DetailField
            label="Purchase date"
            value={formatDate(consumable.purchaseDate)}
          />
          <DetailField
            label="Purchase price"
            value={formatMoney(consumable.purchasePrice)}
          />
          <DetailField
            label="Purchased from"
            value={consumable.purchasedFrom}
          />
        </DetailGrid>
      </DetailSection>

      {consumable.notes && (
        <DetailSection title="Notes">
          <p className="whitespace-pre-wrap text-[13px] text-text">
            {consumable.notes}
          </p>
        </DetailSection>
      )}
    </div>
  );
}
