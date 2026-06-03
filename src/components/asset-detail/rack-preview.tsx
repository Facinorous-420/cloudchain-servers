"use client";

import { useState } from "react";
import type { DiagramAsset } from "@/app/(app)/topology/rack-diagram";
import { AssetFaceContent } from "@/app/(app)/topology/topology-view";
import { RACK_FACE_INCHES } from "@/lib/faceplate";

// Matches the topology diagram's 1U height in pixels.
const PREVIEW_U = 40;
const U_IN = 1.75;
const PREVIEW_PPI = PREVIEW_U / U_IN; // ≈ 22.857 px/inch

const CATEGORY_STRIPE: Record<string, string> = {
  SERVER: "var(--color-cat-server)",
  SWITCH: "var(--color-cat-switch)",
  PATCH_PANEL: "var(--color-cat-switch)",
  GATEWAY: "var(--color-cat-firewall)",
  FIREWALL: "var(--color-cat-firewall)",
  UPS: "var(--color-cat-ups)",
  PDU: "var(--color-cat-pdu)",
  KVM: "var(--color-cat-kvm)",
  ACCESS_POINT: "var(--color-accent)",
  NUC: "var(--color-cat-server)",
  SBC: "var(--color-cat-server)",
  SHELF: "var(--color-cat-pdu)",
  DRAWER: "var(--color-cat-pdu)",
  BLANK_PANEL: "var(--color-faint)",
  OTHER: "var(--color-faint)",
};

// Renders one face in the same rack-strip style as the faceplate designer's
// "Preview in rack" section: U-number column on the left, dark rack cell, the
// asset sitting at the bottom of a 1U-taller context strip.
function FacePreview({
  asset,
  face,
  rackUnits,
  faceWidthInches,
  imageMode,
}: {
  asset: DiagramAsset;
  face: "FRONT" | "REAR";
  rackUnits: number;
  faceWidthInches: number;
  imageMode: boolean;
}) {
  const totalU = rackUnits + 1;
  const innerWidth = Math.round(faceWidthInches * PREVIEW_PPI);
  const assetHeight = rackUnits * PREVIEW_U;

  const imgPath =
    face === "REAR"
      ? (asset.rackRenderRearPath ?? asset.rackRenderFrontPath)
      : (asset.rackRenderFrontPath ?? asset.rackRenderRearPath);

  const stripe = CATEGORY_STRIPE[asset.category] ?? CATEGORY_STRIPE.OTHER;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] font-bold uppercase tracking-wide text-text-dim">
        {face}
      </p>
      <div className="flex">
        {/* U-number scale */}
        <div
          className="grid w-6 shrink-0 text-[8px] text-faint"
          style={{ gridTemplateRows: `repeat(${totalU}, ${PREVIEW_U}px)` }}
        >
          {Array.from({ length: totalU }, (_, i) => {
            const u = totalU - i;
            return (
              <div
                key={u}
                className="flex items-start justify-end pr-1 pt-0.5 leading-none"
              >
                U{u}
              </div>
            );
          })}
        </div>

        {/* Rack slot */}
        <div
          className="relative rounded-[3px] border border-[#04070b] bg-[#0a0d12]"
          style={{
            width: innerWidth,
            height: totalU * PREVIEW_U,
            backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${PREVIEW_U - 1}px, rgba(255,255,255,0.05) ${PREVIEW_U - 1}px, rgba(255,255,255,0.05) ${PREVIEW_U}px)`,
          }}
        >
          {/* Asset cell pinned to the bottom of the slot */}
          <div
            className="absolute inset-x-0 bottom-0 overflow-hidden rounded border border-border/80 bg-linear-to-b from-[#272e37] to-[#1d232b]"
            style={{ height: assetHeight }}
          >
            {/* Left category stripe */}
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 z-10 w-0.75"
              style={{ background: stripe }}
            />

            {imageMode ? (
              imgPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgPath}
                  alt={asset.codename}
                  draggable={false}
                  className="h-full w-full object-fill"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-center">
                  <span
                    aria-hidden
                    className={`mb-0.5 inline-block h-1.5 w-1.5 rounded-full ${asset.state === "IN_USE" ? "bg-status-green" : "bg-faint"}`}
                  />
                  <span className="truncate text-[11px] font-black">
                    {asset.codename}
                  </span>
                  <span className="text-[8px] text-faint">no render image</span>
                </div>
              )
            ) : (
              <div className="flex h-full w-full items-stretch gap-0 overflow-hidden">
                {/* Nameplate column — mirrors DraggableAssetCell */}
                <div className={`flex shrink-0 flex-col justify-center border-r border-border/80 bg-bg/30 pl-2.5 pr-2 ${rackUnits <= 1 ? "" : "py-1"} w-22.5 min-w-10`}>
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${asset.state === "IN_USE" ? "bg-status-green shadow-[0_0_5px_var(--color-status-green)]" : "bg-faint"}`} />
                    <span className="truncate text-[11px] font-black leading-tight">{asset.codename}</span>
                  </span>
                  {rackUnits > 1 && (
                    <span className="mt-0.5 truncate text-[9px] font-normal leading-tight text-text-dim">{asset.name}</span>
                  )}
                </div>
                {/* Faceplate content */}
                <div className="flex flex-1 items-stretch gap-0 overflow-hidden px-1 py-0.5">
                  <AssetFaceContent
                    asset={asset}
                    face={face}
                    onInspect={() => {}}
                    pxPerInch={PREVIEW_PPI}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RackFaceplatePreview({ asset }: { asset: DiagramAsset }) {
  const [imageMode, setImageMode] = useState(false);

  const rackUnits = asset.rackUnits ?? 1;
  const faceWidthInches =
    (asset.formFactor === "TOWER" ? asset.widthInches : null) ??
    RACK_FACE_INCHES;
  const hasRenderImages = !!(
    asset.rackRenderFrontPath || asset.rackRenderRearPath
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[11px] text-text-dim">
          How this item renders in the rack diagram ({rackUnits}U ·{" "}
          {Math.round(faceWidthInches)}" wide):
        </p>
        {hasRenderImages && (
          <div className="flex overflow-hidden rounded-md border border-border bg-panel-2">
            {(["faceplate", "image"] as const).map((mode) => {
              const active = (mode === "image") === imageMode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setImageMode(mode === "image")}
                  className={`px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                    active
                      ? "bg-border/60 text-accent"
                      : "text-text-dim hover:text-accent"
                  }`}
                >
                  {mode === "faceplate" ? "Faceplate" : "Image mode"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-6">
        <FacePreview
          asset={asset}
          face="FRONT"
          rackUnits={rackUnits}
          faceWidthInches={faceWidthInches}
          imageMode={imageMode}
        />
        <FacePreview
          asset={asset}
          face="REAR"
          rackUnits={rackUnits}
          faceWidthInches={faceWidthInches}
          imageMode={imageMode}
        />
      </div>
    </div>
  );
}
