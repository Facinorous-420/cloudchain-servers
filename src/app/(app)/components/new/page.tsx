import { prisma } from "@/lib/prisma";
import { ComponentForm } from "@/components/forms/component-form";
import { dateInput, formatMoney } from "@/lib/format";
import { createComponent } from "../actions";

export default async function NewComponentPage({
  searchParams,
}: {
  searchParams: Promise<{ fromAssetId?: string; type?: string }>;
}) {
  const { fromAssetId, type } = await searchParams;

  const [hosts, fromAsset] = await Promise.all([
    prisma.asset.findMany({
      orderBy: { codename: "asc" },
      select: { id: true, codename: true },
    }),
    fromAssetId
      ? prisma.asset.findUnique({
          where: { id: fromAssetId },
          select: {
            id: true,
            codename: true,
            purchaseDate: true,
            purchasedFrom: true,
            purchasedFromUrl: true,
            purchasePrice: true,
          },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">New component</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          Add RAM, a caddy, a card, or another part.
          {fromAsset && (
            <span className="ml-1 text-accent">
              Installing into{" "}
              <span className="font-bold">{fromAsset.codename}</span> —
              purchase info pre-filled.
            </span>
          )}
        </p>
      </div>
      <ComponentForm
        action={createComponent}
        hosts={hosts}
        submitLabel="Create component"
        prefill={
          fromAsset
            ? {
                installedInId: fromAsset.id,
                type: type ?? "",
                purchaseDate: dateInput(fromAsset.purchaseDate),
                purchasedFrom: fromAsset.purchasedFrom ?? "",
                purchasedFromUrl: fromAsset.purchasedFromUrl ?? "",
                fromAssetPurchase: true,
                fromAssetLabel: `${fromAsset.codename}${fromAsset.purchaseDate ? ` (${dateInput(fromAsset.purchaseDate)})` : ""}`,
              }
            : type
              ? { type }
              : undefined
        }
      />
    </div>
  );
}
