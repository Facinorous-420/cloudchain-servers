"use client";

import { useState } from "react";
import type { DiagramAsset } from "@/app/(app)/topology/rack-diagram";
import { AssetFaceContent } from "@/app/(app)/topology/topology-view";
import {
  DEFAULT_DIAGRAM_PREFS,
  type DiagramPrefs,
} from "@/lib/diagram-prefs";
import { createContext, useContext } from "react";

// Re-expose the context that AssetFaceContent reads. topology-view.tsx defines
// it module-privately; we need to provide matching prefs for the preview.
// We can't import the context directly, but DiagramPrefsContext is read via
// useDiagramPrefs() which falls back to DEFAULT_DIAGRAM_PREFS from the context
// default — so as long as we render within a provider that matches, it works.
// topology-view exports nothing for the context, so we build a minimal wrapper
// that simply renders inside the DiagramSettingsProvider the app already wraps
// (layout.tsx) which covers portLabels. The prefs context default is
// DEFAULT_DIAGRAM_PREFS, which is fine for a static preview (no filters active).

const U_PX = 40;

function FacePanel({
  asset,
  face,
  label,
  imageMode,
}: {
  asset: DiagramAsset;
  face: "FRONT" | "REAR";
  label: string;
  imageMode: boolean;
}) {
  const rackUnits = asset.rackUnits ?? 1;
  const height = rackUnits * U_PX;

  const imgPath =
    face === "REAR"
      ? (asset.rackRenderRearPath ?? asset.rackRenderFrontPath)
      : (asset.rackRenderFrontPath ?? asset.rackRenderRearPath);

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
        {label}
      </span>
      <div
        className="relative overflow-hidden rounded border border-border/80 bg-gradient-to-b from-[#272e37] to-[#1d232b]"
        style={{ height, minWidth: 160, maxWidth: 420 }}
      >
        {/* Left accent stripe */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] bg-cat-server z-10"
          style={{
            background: getCategoryStripe(asset.category),
          }}
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
              <span className="truncate text-[11px] font-black leading-tight">
                {asset.codename}
              </span>
              <span className="text-[8px] text-faint">no render image</span>
            </div>
          )
        ) : (
          <div className="flex h-full items-stretch gap-0 overflow-hidden px-1.5 py-0.5 pl-3">
            <AssetFaceContent asset={asset} face={face} onInspect={() => {}} />
          </div>
        )}
      </div>
    </div>
  );
}

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
function getCategoryStripe(cat: string) {
  return CATEGORY_STRIPE[cat] ?? CATEGORY_STRIPE.OTHER;
}

export function RackFaceplatePreview({ asset }: { asset: DiagramAsset }) {
  const [imageMode, setImageMode] = useState(false);
  const hasImages = !!(asset.rackRenderFrontPath || asset.rackRenderRearPath);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <p className="text-[11px] text-text-dim">
          How this item renders in the rack diagram:
        </p>
        {hasImages && (
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

      <div className="flex flex-wrap gap-4">
        <FacePanel
          asset={asset}
          face="FRONT"
          label="Front"
          imageMode={imageMode}
        />
        <FacePanel
          asset={asset}
          face="REAR"
          label="Rear"
          imageMode={imageMode}
        />
      </div>

      <p className="text-[10px] text-faint">
        {asset.rackUnits ?? "?"} U ·{" "}
        {imageMode ? "Image mode" : "Faceplate mode"} · non-interactive preview
      </p>
    </div>
  );
}
