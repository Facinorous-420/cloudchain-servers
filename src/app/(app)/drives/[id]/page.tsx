import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DetailField,
  DetailGrid,
  DetailSection,
} from "@/components/ui/detail";
import { formatDate, formatMoney } from "@/lib/format";
import { enumLabel } from "@/lib/enums";
import { EntityImage } from "@/components/ui/entity-image";
import { removeDriveFromBay } from "../actions";

export default async function DriveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drive = await prisma.drive.findUnique({
    where: { id },
    include: {
      installedIn: { select: { id: true, codename: true, name: true } },
      bayZone: { select: { id: true, name: true } },
    },
  });
  if (!drive) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black">{drive.name}</h1>
            <Badge tone="accent">{enumLabel(drive.kind)}</Badge>
            <Badge>{enumLabel(drive.size)}</Badge>
          </div>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            {drive.capacityGB} GB
            {drive.manufacturer ? ` · ${drive.manufacturer}` : ""}
            {drive.model ? ` ${drive.model}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/drives">Back</LinkButton>
          {drive.installedInId && (
            <form action={removeDriveFromBay.bind(null, drive.id)}>
              <Button type="submit" variant="secondary">
                Remove from bay
              </Button>
            </form>
          )}
          <LinkButton
            href={`/drives/new?fromId=${drive.id}`}
            variant="secondary"
          >
            Duplicate
          </LinkButton>
          <LinkButton href={`/drives/${drive.id}/edit`} variant="primary">
            Edit
          </LinkButton>
        </div>
      </div>

      {drive.imagePath && (
        <DetailSection title="Image">
          <EntityImage path={drive.imagePath} alt={drive.name} />
        </DetailSection>
      )}

      <DetailSection title="Identification">
        <DetailGrid>
          <DetailField label="Manufacturer" value={drive.manufacturer} />
          <DetailField label="Model" value={drive.model} />
          <DetailField label="Serial number" value={drive.serialNumber} />
          <DetailField label="Kind" value={enumLabel(drive.kind)} />
          <DetailField label="Size" value={enumLabel(drive.size)} />
          <DetailField label="Capacity" value={`${drive.capacityGB} GB`} />
          <DetailField label="Condition" value={drive.condition} />
          <DetailField
            label="Manufactured"
            value={formatDate(drive.manufactureDate)}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Placement">
        <DetailGrid>
          <DetailField label="Installed in">
            {drive.installedIn ? (
              <Link
                href={`/assets/${drive.installedIn.id}`}
                className="text-accent hover:underline"
              >
                {drive.installedIn.codename}
              </Link>
            ) : (
              <span className="text-faint">In storage</span>
            )}
          </DetailField>
          <DetailField label="Bay zone" value={drive.bayZone?.name} />
          <DetailField label="Bay number" value={drive.bayNumber} />
          <DetailField label="Assigned use" value={drive.assignedUse} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Acquisition">
        <DetailGrid>
          <DetailField
            label="Purchase date"
            value={formatDate(drive.purchaseDate)}
          />
          <DetailField
            label="Purchase price"
            value={formatMoney(drive.purchasePrice)}
          />
          <DetailField label="Purchased from" value={drive.purchasedFrom} />
        </DetailGrid>
      </DetailSection>

      {drive.notes && (
        <DetailSection title="Notes">
          <p className="whitespace-pre-wrap text-[13px] text-text">
            {drive.notes}
          </p>
        </DetailSection>
      )}
    </div>
  );
}
