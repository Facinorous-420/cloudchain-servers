import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailSection } from "@/components/ui/detail";
import { enumLabel } from "@/lib/enums";
import { EntityImage } from "@/components/ui/entity-image";

export default async function StorageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [storage, batteries, consumablesInStorage] = await Promise.all([
    prisma.storage.findUnique({
      where: { id },
      include: {
        assets: {
          orderBy: { codename: "asc" },
          select: {
            id: true,
            codename: true,
            name: true,
            category: true,
            state: true,
          },
        },
        batteries: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, quantity: true, manufacturer: true },
        },
      },
    }),
    // separate query just in case include config needs it
    Promise.resolve(null),
    // consumables that list this storage as their location
    prisma.consumable.findMany({
      where: { location: { contains: "" } }, // fetched below
      select: { id: true, name: true, quantity: true, type: true },
      take: 0, // skip for now — consumables don't have a storageId FK
    }),
  ]);
  if (!storage) notFound();

  // Consumables use a free-text `location` field — find ones mentioning this storage name
  const consumableMatches = await prisma.consumable.findMany({
    where: {
      OR: [
        { location: { contains: storage.name, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, quantity: true, type: true },
    orderBy: { name: "asc" },
  });

  const totalItems =
    storage.assets.length +
    storage.batteries.length +
    consumableMatches.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">{storage.name}</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            {totalItems} item{totalItems === 1 ? "" : "s"} stored here
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/storages">Back</LinkButton>
          <LinkButton href={`/storages/${storage.id}/edit`} variant="primary">
            Edit
          </LinkButton>
        </div>
      </div>

      {storage.imagePath && (
        <DetailSection title="Image">
          <EntityImage path={storage.imagePath} alt={storage.name} />
        </DetailSection>
      )}

      {/* Assets */}
      <DetailSection
        title="Assets"
        description={`${storage.assets.length} asset${storage.assets.length === 1 ? "" : "s"}`}
      >
        {storage.assets.length === 0 ? (
          <p className="text-[13px] text-faint">
            No assets stored here.{" "}
            <Link href="/assets" className="text-accent hover:underline">
              Set an asset&apos;s storage to this location.
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {storage.assets.map((a) => (
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
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {/* Batteries */}
      {storage.batteries.length > 0 && (
        <DetailSection
          title="Spare batteries"
          description={`${storage.batteries.length} battery record${storage.batteries.length === 1 ? "" : "s"}`}
        >
          <ul className="flex flex-col gap-2">
            {storage.batteries.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-panel-2 px-3 py-2 text-[13px]"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/batteries/${b.id}`}
                    className="font-bold text-accent hover:underline"
                  >
                    {b.name}
                  </Link>
                  {b.manufacturer && (
                    <span className="text-text-dim">{b.manufacturer}</span>
                  )}
                </div>
                <Badge>{b.quantity}×</Badge>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {/* Consumables (by location name match) */}
      {consumableMatches.length > 0 && (
        <DetailSection
          title="Consumables"
          description={`${consumableMatches.length} consumable record${consumableMatches.length === 1 ? "" : "s"} with location containing "${storage.name}"`}
        >
          <ul className="flex flex-col gap-2">
            {consumableMatches.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-panel-2 px-3 py-2 text-[13px]"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/consumables/${c.id}`}
                    className="font-bold text-accent hover:underline"
                  >
                    {c.name}
                  </Link>
                  {c.type && <span className="text-text-dim">{c.type}</span>}
                </div>
                <Badge>qty {c.quantity}</Badge>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}

      {storage.notes && (
        <DetailSection title="Notes">
          <p className="whitespace-pre-wrap text-[13px] text-text">
            {storage.notes}
          </p>
        </DetailSection>
      )}
    </div>
  );
}
