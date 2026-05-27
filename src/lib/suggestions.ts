import { prisma } from "@/lib/prisma";

function dedupAndSort(values: (string | null)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (v && v.trim() !== "") set.add(v.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

// Pulls distinct values that already exist for free-text fields so they can be
// surfaced as suggestions in the asset/rack/etc. forms. New entries typed by
// the user become future suggestions automatically.
export async function getSuggestions(): Promise<{
  manufacturers: string[];
  purchasedFroms: string[];
  conditions: string[];
}> {
  const [
    aMfg,
    aPF,
    aCond,
    rMfg,
    rPF,
    rCond,
    dMfg,
    dPF,
    dCond,
    cMfg,
    cPF,
    bMfg,
    bPF,
    csPF,
    lPF,
  ] = await Promise.all([
    prisma.asset.findMany({
      where: { manufacturer: { not: null } },
      select: { manufacturer: true },
      distinct: ["manufacturer"],
    }),
    prisma.asset.findMany({
      where: { purchasedFrom: { not: null } },
      select: { purchasedFrom: true },
      distinct: ["purchasedFrom"],
    }),
    prisma.asset.findMany({
      where: { condition: { not: null } },
      select: { condition: true },
      distinct: ["condition"],
    }),
    prisma.rack.findMany({
      where: { manufacturer: { not: null } },
      select: { manufacturer: true },
      distinct: ["manufacturer"],
    }),
    prisma.rack.findMany({
      where: { purchasedFrom: { not: null } },
      select: { purchasedFrom: true },
      distinct: ["purchasedFrom"],
    }),
    prisma.rack.findMany({
      where: { condition: { not: null } },
      select: { condition: true },
      distinct: ["condition"],
    }),
    prisma.drive.findMany({
      where: { manufacturer: { not: null } },
      select: { manufacturer: true },
      distinct: ["manufacturer"],
    }),
    prisma.drive.findMany({
      where: { purchasedFrom: { not: null } },
      select: { purchasedFrom: true },
      distinct: ["purchasedFrom"],
    }),
    prisma.drive.findMany({
      where: { condition: { not: null } },
      select: { condition: true },
      distinct: ["condition"],
    }),
    prisma.component.findMany({
      where: { manufacturer: { not: null } },
      select: { manufacturer: true },
      distinct: ["manufacturer"],
    }),
    prisma.component.findMany({
      where: { purchasedFrom: { not: null } },
      select: { purchasedFrom: true },
      distinct: ["purchasedFrom"],
    }),
    prisma.battery.findMany({
      where: { manufacturer: { not: null } },
      select: { manufacturer: true },
      distinct: ["manufacturer"],
    }),
    prisma.battery.findMany({
      where: { purchasedFrom: { not: null } },
      select: { purchasedFrom: true },
      distinct: ["purchasedFrom"],
    }),
    prisma.consumable.findMany({
      where: { purchasedFrom: { not: null } },
      select: { purchasedFrom: true },
      distinct: ["purchasedFrom"],
    }),
    prisma.license.findMany({
      where: { purchasedFrom: { not: null } },
      select: { purchasedFrom: true },
      distinct: ["purchasedFrom"],
    }),
  ]);

  return {
    manufacturers: dedupAndSort([
      ...aMfg.map((x) => x.manufacturer),
      ...rMfg.map((x) => x.manufacturer),
      ...dMfg.map((x) => x.manufacturer),
      ...cMfg.map((x) => x.manufacturer),
      ...bMfg.map((x) => x.manufacturer),
    ]),
    purchasedFroms: dedupAndSort([
      ...aPF.map((x) => x.purchasedFrom),
      ...rPF.map((x) => x.purchasedFrom),
      ...dPF.map((x) => x.purchasedFrom),
      ...cPF.map((x) => x.purchasedFrom),
      ...bPF.map((x) => x.purchasedFrom),
      ...csPF.map((x) => x.purchasedFrom),
      ...lPF.map((x) => x.purchasedFrom),
    ]),
    conditions: dedupAndSort([
      ...aCond.map((x) => x.condition),
      ...rCond.map((x) => x.condition),
      ...dCond.map((x) => x.condition),
    ]),
  };
}

export type Suggestions = Awaited<ReturnType<typeof getSuggestions>>;
