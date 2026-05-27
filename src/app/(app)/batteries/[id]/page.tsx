import Link from "next/link";
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

export default async function BatteryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const battery = await prisma.battery.findUnique({
    where: { id },
    include: { installedIn: { select: { id: true, codename: true } } },
  });
  if (!battery) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">{battery.name}</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Qty {battery.quantity}
            {battery.manufacturer ? ` · ${battery.manufacturer}` : ""}
            {battery.model ? ` ${battery.model}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/batteries">Back</LinkButton>
          <LinkButton
            href={`/batteries/${battery.id}/edit`}
            variant="primary"
          >
            Edit
          </LinkButton>
        </div>
      </div>

      {battery.imagePath && (
        <DetailSection title="Image">
          <EntityImage path={battery.imagePath} alt={battery.name} />
        </DetailSection>
      )}

      <DetailSection title="Battery">
        <DetailGrid>
          <DetailField label="Manufacturer" value={battery.manufacturer} />
          <DetailField label="Model" value={battery.model} />
          <DetailField label="Quantity" value={battery.quantity} />
          <DetailField
            label="Voltage"
            value={battery.voltage ? `${battery.voltage} V` : null}
          />
          <DetailField
            label="Capacity"
            value={battery.capacityAh ? `${battery.capacityAh} Ah` : null}
          />
          <DetailField
            label="Install date"
            value={formatDate(battery.installDate)}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Placement">
        <DetailGrid>
          <DetailField label="Installed in">
            {battery.installedIn ? (
              <Link
                href={`/assets/${battery.installedIn.id}`}
                className="text-accent hover:underline"
              >
                {battery.installedIn.codename}
              </Link>
            ) : (
              <span className="text-faint">In storage</span>
            )}
          </DetailField>
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Acquisition">
        <DetailGrid>
          <DetailField
            label="Purchase date"
            value={formatDate(battery.purchaseDate)}
          />
          <DetailField
            label="Purchase price"
            value={formatMoney(battery.purchasePrice)}
          />
          <DetailField label="Purchased from" value={battery.purchasedFrom} />
        </DetailGrid>
      </DetailSection>

      {battery.notes && (
        <DetailSection title="Notes">
          <p className="whitespace-pre-wrap text-[13px] text-text">
            {battery.notes}
          </p>
        </DetailSection>
      )}
    </div>
  );
}
