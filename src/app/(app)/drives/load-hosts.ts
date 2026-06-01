import { prisma } from "@/lib/prisma";
import type { DriveHostOption } from "@/components/forms/drive-form";

type ZoneRow = {
  id: string;
  name: string;
  driveSize: string;
  bayCount: number;
  drives: { id: string; bayNumber: number | null }[];
};

function mapZones(
  zones: ZoneRow[],
  excludeDriveId?: string,
): DriveHostOption["bayZones"] {
  return zones.map((z) => ({
    id: z.id,
    name: z.name,
    driveSize: z.driveSize,
    bayCount: z.bayCount,
    occupiedBays: z.drives
      .filter((d) => d.id !== excludeDriveId)
      .map((d) => d.bayNumber)
      .filter((n): n is number => n != null),
  }));
}

const ZONE_SELECT = {
  id: true,
  name: true,
  driveSize: true,
  bayCount: true,
  drives: { select: { id: true, bayNumber: true } },
} as const;

// Mount targets for a drive: every asset with drive bays, plus every NVMe riser
// (which exposes its M.2 slots as a bay zone). The drive form keys placement by
// bay zone; the server derives the host asset from the chosen zone, so a riser's
// drives are attributed to whatever server the riser is installed in.
export async function loadDriveHosts(
  excludeDriveId?: string,
): Promise<DriveHostOption[]> {
  const [assets, risers] = await Promise.all([
    prisma.asset.findMany({
      orderBy: { codename: "asc" },
      select: {
        id: true,
        codename: true,
        bayZones: { select: ZONE_SELECT, orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.component.findMany({
      where: { type: "NVME_RISER", bayZones: { some: {} } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        installedIn: { select: { codename: true } },
        bayZones: { select: ZONE_SELECT, orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  const assetHosts: DriveHostOption[] = assets.map((a) => ({
    id: a.id,
    codename: a.codename,
    bayZones: mapZones(a.bayZones, excludeDriveId),
  }));

  const riserHosts: DriveHostOption[] = risers.map((r) => ({
    id: r.id,
    codename: `${r.name} · M.2 riser ${
      r.installedIn ? `(in ${r.installedIn.codename})` : "(in storage)"
    }`,
    bayZones: mapZones(r.bayZones, excludeDriveId),
  }));

  return [...assetHosts, ...riserHosts];
}
