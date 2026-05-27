import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ConnectionForm,
  type ConnectionFormData,
} from "@/components/forms/connection-form";
import { updateConnection } from "../../actions";
import { loadEndpointAssets } from "../../load-endpoint-assets";

export default async function EditConnectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [connection, { assets, globalServiceLoopInches }] = await Promise.all([
    prisma.connection.findUnique({ where: { id } }),
    loadEndpointAssets(),
  ]);
  if (!connection) notFound();

  const data: ConnectionFormData = {
    id: connection.id,
    type: connection.type,
    aEndAssetId: connection.aEndAssetId,
    aEndLabel: connection.aEndLabel,
    aEndPortGroupId: connection.aEndPortGroupId ?? "",
    aEndPortNumber: connection.aEndPortNumber?.toString() ?? "",
    aEndOutletGroupId: connection.aEndOutletGroupId ?? "",
    aEndOutletNumber: connection.aEndOutletNumber?.toString() ?? "",
    bEndAssetId: connection.bEndAssetId ?? "",
    bEndLabel: connection.bEndLabel ?? "",
    bEndPortGroupId: connection.bEndPortGroupId ?? "",
    bEndPortNumber: connection.bEndPortNumber?.toString() ?? "",
    bEndOutletGroupId: connection.bEndOutletGroupId ?? "",
    bEndOutletNumber: connection.bEndOutletNumber?.toString() ?? "",
    cableType: connection.cableType ?? "",
    cableCategory: connection.cableCategory ?? "",
    isPatch: connection.isPatch,
    speed: connection.speed ?? "",
    cableLengthFeet: connection.cableLengthFeet?.toString() ?? "",
    estimatedCableLengthFeet:
      connection.estimatedCableLengthFeet?.toString() ?? "",
    serviceLoopLengthInches: connection.serviceLoopLengthInches?.toString() ?? "",
    notes: connection.notes ?? "",
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Edit connection</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          {connection.aEndLabel}
          {connection.bEndLabel ? ` ↔ ${connection.bEndLabel}` : ""}
        </p>
      </div>
      <ConnectionForm
        action={updateConnection.bind(null, connection.id)}
        connection={data}
        assets={assets}
        submitLabel="Save changes"
        globalServiceLoopInches={globalServiceLoopInches}
      />
    </div>
  );
}
