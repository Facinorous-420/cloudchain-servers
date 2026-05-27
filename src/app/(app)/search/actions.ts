"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export type SearchResult = {
  id: string;
  label: string;
  sub: string;
  href: string;
  kind: "asset" | "drive" | "component" | "license" | "battery";
};

export async function searchEntities(query: string): Promise<SearchResult[]> {
  await requireUser();
  const q = query.trim();
  if (q.length < 1) return [];

  const like = { contains: q, mode: "insensitive" as const };

  const [assets, drives, components, licenses, batteries] = await Promise.all([
    prisma.asset.findMany({
      where: {
        state: { notIn: ["SOLD", "JUNKED"] },
        OR: [{ codename: like }, { name: like }],
      },
      select: { id: true, codename: true, name: true, category: true },
      take: 5,
    }),
    prisma.drive.findMany({
      where: { state: { notIn: ["SOLD", "JUNKED"] }, name: like },
      select: { id: true, name: true, kind: true, capacityGB: true },
      take: 5,
    }),
    prisma.component.findMany({
      where: { state: { notIn: ["SOLD", "JUNKED"] }, name: like },
      select: { id: true, name: true, type: true },
      take: 4,
    }),
    prisma.license.findMany({
      where: { name: like },
      select: { id: true, name: true, type: true },
      take: 3,
    }),
    prisma.battery.findMany({
      where: { state: { notIn: ["SOLD", "JUNKED"] }, name: like },
      select: { id: true, name: true },
      take: 3,
    }),
  ]);

  const results: SearchResult[] = [];

  for (const a of assets) {
    results.push({
      id: a.id,
      label: a.codename,
      sub: `${a.category.replace(/_/g, " ")} · ${a.name}`,
      href: `/assets/${a.id}`,
      kind: "asset",
    });
  }
  for (const d of drives) {
    const cap =
      d.capacityGB >= 1000
        ? `${(d.capacityGB / 1000).toFixed(0)} TB`
        : `${d.capacityGB} GB`;
    results.push({
      id: d.id,
      label: d.name,
      sub: `Drive · ${d.kind} ${cap}`,
      href: `/drives/${d.id}`,
      kind: "drive",
    });
  }
  for (const c of components) {
    results.push({
      id: c.id,
      label: c.name,
      sub: `Component · ${c.type.replace(/_/g, " ")}`,
      href: `/components/${c.id}`,
      kind: "component",
    });
  }
  for (const l of licenses) {
    results.push({
      id: l.id,
      label: l.name,
      sub: `License${l.type ? ` · ${l.type}` : ""}`,
      href: `/licenses/${l.id}`,
      kind: "license",
    });
  }
  for (const b of batteries) {
    results.push({
      id: b.id,
      label: b.name,
      sub: "Battery",
      href: `/batteries/${b.id}`,
      kind: "battery",
    });
  }

  return results;
}
