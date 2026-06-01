import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DetailField,
  DetailGrid,
  DetailSection,
} from "@/components/ui/detail";
import { formatDate, formatMoney } from "@/lib/format";
import { enumLabel, PORT_TYPE_LABELS } from "@/lib/enums";
import { EntityImage } from "@/components/ui/entity-image";
import { RiserSlots } from "./riser-slots";

export default async function ComponentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const component = await prisma.component.findUnique({
    where: { id },
    include: {
      installedIn: { select: { id: true, codename: true } },
      bayZones: {
        orderBy: { sortOrder: "asc" },
        include: {
          drives: { select: { id: true, name: true, bayNumber: true } },
        },
      },
    },
  });
  if (!component) notFound();

  const isRiser = component.type === "NVME_RISER";
  const riserZone = isRiser ? component.bayZones[0] : null;
  // In-storage M.2 drives available to drop into a free riser slot.
  const availableM2Drives = riserZone
    ? await prisma.drive.findMany({
        where: {
          size: "M2",
          installedInId: null,
          bayZoneId: null,
          state: { notIn: ["SOLD", "JUNKED"] },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, capacityGB: true },
      })
    : [];

  const isCpu = component.type === "CPU";
  const isRam = component.type === "RAM";
  const isNic = component.type === "NIC_CARD";
  const isCard =
    component.type === "RAID_CONTROLLER" ||
    component.type === "PCIE_CARD" ||
    component.type === "NIC_CARD";
  const isPsu = component.type === "POWER_SUPPLY";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black">{component.name}</h1>
            <Badge tone="accent">{enumLabel(component.type)}</Badge>
          </div>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            Qty {component.quantity}
            {component.manufacturer ? ` · ${component.manufacturer}` : ""}
            {component.model ? ` ${component.model}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/components">Back</LinkButton>
          <LinkButton
            href={`/components/${component.id}/edit`}
            variant="primary"
          >
            Edit
          </LinkButton>
        </div>
      </div>

      {component.imagePath && (
        <DetailSection title="Image">
          <EntityImage path={component.imagePath} alt={component.name} />
        </DetailSection>
      )}

      <DetailSection title="Identification">
        <DetailGrid>
          <DetailField label="Type" value={enumLabel(component.type)} />
          <DetailField label="Manufacturer" value={component.manufacturer} />
          <DetailField label="Model" value={component.model} />
          <DetailField label="Serial number" value={component.serialNumber} />
          <DetailField label="Quantity" value={component.quantity} />
          <DetailField label="Specs" value={component.specs} />
        </DetailGrid>
      </DetailSection>

      {isCpu && (
        <DetailSection title="CPU specs">
          <DetailGrid>
            <DetailField
              label="Speed"
              value={component.speedGHz ? `${component.speedGHz} GHz` : null}
            />
            <DetailField label="Cores" value={component.cores} />
            <DetailField label="Threads" value={component.threads} />
            <DetailField label="Socket" value={component.socket} />
            <DetailField
              label="TDP"
              value={component.tdpWatts ? `${component.tdpWatts} W` : null}
            />
          </DetailGrid>
        </DetailSection>
      )}

      {isRam && (
        <DetailSection title="RAM specs">
          <DetailGrid>
            <DetailField
              label="Capacity"
              value={
                component.capacityGB ? `${component.capacityGB} GB` : null
              }
            />
            <DetailField
              label="Speed"
              value={component.speedMHz ? `${component.speedMHz} MHz` : null}
            />
            <DetailField label="Generation" value={component.generation} />
            <DetailField
              label="ECC"
              value={component.ecc == null ? null : component.ecc ? "Yes" : "No"}
            />
            <DetailField label="Form factor" value={component.formFactor} />
          </DetailGrid>
        </DetailSection>
      )}

      {isNic && (
        <DetailSection title="NIC specs">
          <DetailGrid>
            <DetailField label="Port count" value={component.portCount} />
            <DetailField
              label="Port type"
              value={
                component.portType ? PORT_TYPE_LABELS[component.portType] : null
              }
            />
            <DetailField label="Port speed" value={component.portSpeed} />
          </DetailGrid>
        </DetailSection>
      )}

      {isCard && (
        <DetailSection title="Card">
          <DetailGrid>
            <DetailField label="Interface" value={component.cardInterface} />
          </DetailGrid>
        </DetailSection>
      )}

      {isRiser && (
        <DetailSection title="M.2 slots">
          {riserZone ? (
            <RiserSlots
              bayZoneId={riserZone.id}
              bayCount={riserZone.bayCount}
              occupants={Object.fromEntries(
                riserZone.drives
                  .filter((d) => d.bayNumber != null)
                  .map((d) => [d.bayNumber as number, { id: d.id, name: d.name }]),
              )}
              available={availableM2Drives}
            />
          ) : (
            <p className="text-[12px] text-faint">
              Set this riser&apos;s M.2 slot count on its edit page to mount
              drives.
            </p>
          )}
        </DetailSection>
      )}

      {isPsu && (
        <DetailSection title="Power supply">
          <DetailGrid>
            <DetailField
              label="Wattage"
              value={
                component.wattsRating ? `${component.wattsRating} W` : null
              }
            />
            <DetailField
              label="Modular"
              value={
                component.modular == null
                  ? null
                  : component.modular
                    ? "Yes"
                    : "No"
              }
            />
          </DetailGrid>
        </DetailSection>
      )}

      <DetailSection title="Placement">
        <DetailGrid>
          <DetailField label="Installed in">
            {component.installedIn ? (
              <Link
                href={`/assets/${component.installedIn.id}`}
                className="text-accent hover:underline"
              >
                {component.installedIn.codename}
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
            value={formatDate(component.purchaseDate)}
          />
          <DetailField
            label="Purchase price"
            value={formatMoney(component.purchasePrice)}
          />
          <DetailField label="Purchased from" value={component.purchasedFrom} />
        </DetailGrid>
      </DetailSection>

      {component.notes && (
        <DetailSection title="Notes">
          <p className="whitespace-pre-wrap text-[13px] text-text">
            {component.notes}
          </p>
        </DetailSection>
      )}
    </div>
  );
}
