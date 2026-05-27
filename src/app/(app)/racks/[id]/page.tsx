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
import { setDefaultRack } from "../actions";

export default async function RackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rack = await prisma.rack.findUnique({
    where: { id },
    include: {
      assets: {
        orderBy: [{ startU: "desc" }, { codename: "asc" }],
        select: {
          id: true,
          codename: true,
          name: true,
          category: true,
          rackUnits: true,
          startU: true,
          state: true,
        },
      },
    },
  });
  if (!rack) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black">{rack.name}</h1>
            <Badge>
              {rack.totalU}U · {rack.columnCount} cols
            </Badge>
            {rack.isDefault && <Badge tone="success">Default</Badge>}
            {!rack.inUse && <Badge>Retired</Badge>}
          </div>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            {rack.assets.length} asset{rack.assets.length === 1 ? "" : "s"}{" "}
            placed
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/racks">Back</LinkButton>
          <LinkButton
            href={`/topology?rack=${rack.id}`}
            variant="secondary"
          >
            Open in topology
          </LinkButton>
          {!rack.isDefault && (
            <form action={setDefaultRack.bind(null, rack.id)}>
              <Button type="submit" variant="secondary">
                Set as default
              </Button>
            </form>
          )}
          <LinkButton href={`/racks/${rack.id}/edit`} variant="primary">
            Edit
          </LinkButton>
        </div>
      </div>

      {rack.imagePath && (
        <DetailSection title="Image">
          <EntityImage path={rack.imagePath} alt={rack.name} />
        </DetailSection>
      )}

      <DetailSection title="Rack">
        <DetailGrid>
          <DetailField label="Name" value={rack.name} />
          <DetailField label="Total U" value={rack.totalU} />
          <DetailField label="Columns" value={rack.columnCount} />
          <DetailField label="Manufacturer" value={rack.manufacturer} />
          <DetailField label="Model" value={rack.modelNumber} />
          <DetailField label="Serial number" value={rack.serialNumber} />
          <DetailField label="Condition" value={rack.condition} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Acquisition">
        <DetailGrid>
          <DetailField
            label="Purchase date"
            value={formatDate(rack.purchaseDate)}
          />
          <DetailField
            label="Purchase price"
            value={formatMoney(rack.purchasePrice)}
          />
          <DetailField label="Purchased from">
            {rack.purchasedFromUrl ? (
              <a
                href={rack.purchasedFromUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                {rack.purchasedFrom ?? rack.purchasedFromUrl}
              </a>
            ) : (
              rack.purchasedFrom
            )}
          </DetailField>
        </DetailGrid>
      </DetailSection>

      <DetailSection
        title="Assets in this rack"
        description={`${rack.assets.length} placed`}
      >
        {rack.assets.length === 0 ? (
          <p className="text-[13px] text-faint">
            No assets placed in this rack yet. Phase 8 brings the drag-to-place
            diagram.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rack.assets.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-panel-2 px-3 py-2 text-[13px]"
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`inline-block h-2 w-2 rounded-full ${
                      a.state === "IN_USE" ? "bg-status-green" : "bg-faint"
                    }`}
                  />
                  <Link
                    href={`/assets/${a.id}`}
                    className="font-bold text-accent hover:underline"
                  >
                    {a.codename}
                  </Link>
                  <Badge>{enumLabel(a.category)}</Badge>
                  <span className="text-text-dim">— {a.name}</span>
                </div>
                <span className="text-text-dim">
                  {a.rackUnits ? `${a.rackUnits}U` : "—"}
                  {a.startU != null ? ` @ U${a.startU}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {rack.notes && (
        <DetailSection title="Notes">
          <p className="whitespace-pre-wrap text-[13px] text-text">
            {rack.notes}
          </p>
        </DetailSection>
      )}
    </div>
  );
}
