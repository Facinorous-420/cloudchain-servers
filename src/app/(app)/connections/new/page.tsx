import { CONNECTION_TYPES } from "@/lib/enums";
import {
  ConnectionForm,
  type ConnectionFormData,
} from "@/components/forms/connection-form";
import { createConnection } from "../actions";
import { loadEndpointAssets } from "../load-endpoint-assets";

export default async function NewConnectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    aEndAssetId?: string;
    aEndLabel?: string;
  }>;
}) {
  const sp = await searchParams;
  const defaultType =
    sp.type && (CONNECTION_TYPES as readonly string[]).includes(sp.type)
      ? sp.type
      : "NETWORK";

  const { assets, globalServiceLoopInches } = await loadEndpointAssets();

  // Optional A-end prefill (e.g. from the topology inspector's "Add connection"
  // button on a PCIe NIC port). The label is canonical and collision-proof.
  const prefill: ConnectionFormData | undefined = sp.aEndAssetId
    ? {
        id: "",
        type: defaultType,
        aEndAssetId: sp.aEndAssetId,
        aEndLabel: sp.aEndLabel ?? "",
        aEndPortGroupId: "",
        aEndPortNumber: "",
        aEndOutletGroupId: "",
        aEndOutletNumber: "",
        bEndAssetId: "",
        bEndLabel: "",
        bEndPortGroupId: "",
        bEndPortNumber: "",
        bEndOutletGroupId: "",
        bEndOutletNumber: "",
        cableType: "",
        cableCategory: "",
        isPatch: false,
        speed: "",
        cableLengthFeet: "",
        estimatedCableLengthFeet: "",
        serviceLoopLengthInches: "",
        notes: "",
      }
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">New connection</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          Pick the two endpoints and the form will estimate a cable length based
          on each device&apos;s rack position and port side.
        </p>
      </div>
      <ConnectionForm
        action={createConnection}
        connection={prefill}
        assets={assets}
        submitLabel="Create connection"
        defaultType={defaultType}
        globalServiceLoopInches={globalServiceLoopInches}
      />
    </div>
  );
}
