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
import { RENEWAL_PERIOD_LABELS } from "@/lib/enums";
import { EntityImage } from "@/components/ui/entity-image";

export default async function LicenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const license = await prisma.license.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { asset: { select: { id: true, codename: true, name: true } } },
        orderBy: { asset: { codename: "asc" } },
      },
    },
  });
  if (!license) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black">{license.name}</h1>
            {license.type && <Badge tone="accent">{license.type}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/licenses">Back</LinkButton>
          <LinkButton
            href={`/licenses/${license.id}/edit`}
            variant="primary"
          >
            Edit
          </LinkButton>
        </div>
      </div>

      {license.imagePath && (
        <DetailSection title="Image">
          <EntityImage path={license.imagePath} alt={license.name} />
        </DetailSection>
      )}

      <DetailSection title="License">
        <DetailGrid>
          <DetailField label="Type" value={license.type} />
          <DetailField label="Seats" value={license.seats} />
          <DetailField label="License key" value={license.licenseKey} />
          <DetailField
            label="Renewal period"
            value={
              license.renewalPeriod
                ? RENEWAL_PERIOD_LABELS[license.renewalPeriod]
                : null
            }
          />
          <DetailField
            label="Next renewal"
            value={formatDate(license.renewalDate)}
          />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Acquisition">
        <DetailGrid>
          <DetailField
            label="Purchase date"
            value={formatDate(license.purchaseDate)}
          />
          <DetailField label="Cost" value={formatMoney(license.cost)} />
          <DetailField label="Purchased from" value={license.purchasedFrom} />
        </DetailGrid>
      </DetailSection>

      <DetailSection
        title="Assignments"
        description={`${license.assignments.length} asset${license.assignments.length === 1 ? "" : "s"}`}
      >
        {license.assignments.length === 0 ? (
          <p className="text-[13px] text-faint">
            Not assigned to any assets yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {license.assignments.map((a) => (
              <li key={a.id} className="text-[13px]">
                <Link
                  href={`/assets/${a.asset.id}`}
                  className="text-accent hover:underline"
                >
                  {a.asset.codename}
                </Link>
                <span className="text-text-dim"> — {a.asset.name}</span>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {license.notes && (
        <DetailSection title="Notes">
          <p className="whitespace-pre-wrap text-[13px] text-text">
            {license.notes}
          </p>
        </DetailSection>
      )}
    </div>
  );
}
