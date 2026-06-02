// Per-user rack-diagram view preferences (issue 4). Stored as JSON on
// User.diagramPrefs so each user's filters follow them across devices without
// being shared between users.

export type DiagramPrefs = {
  hideNames: boolean;
  hidePorts: boolean;
  hideBays: boolean;
  hideOutlets: boolean;
  imageMode: boolean;
  // Keep the drag + inspect handles pinned to each item's top corners even
  // outside image mode, and how opaque those handles are (0–100).
  cornerControls: boolean;
  controlOpacity: number;
  // Per-user "hide these specific items" overlay. Namespaced string keys:
  //   port:<portGroupId>:<portNumber>   hide one port of a group
  //   bay:<bayZoneId>                   hide one whole drive-bay zone
  //   outletType:<TYPE>                 hide every outlet of a connector type
  // Purely presentational — never edits the asset's real faceplate.
  hiddenElements: string[];
};

export const DEFAULT_DIAGRAM_PREFS: DiagramPrefs = {
  hideNames: false,
  hidePorts: false,
  hideBays: false,
  hideOutlets: false,
  imageMode: false,
  cornerControls: false,
  controlOpacity: 70,
  hiddenElements: [],
};

const BOOL_KEYS = [
  "hideNames",
  "hidePorts",
  "hideBays",
  "hideOutlets",
  "imageMode",
  "cornerControls",
] as const;

// Coerce arbitrary stored JSON into a complete, type-safe DiagramPrefs.
export function parseDiagramPrefs(stored: unknown): DiagramPrefs {
  const out = { ...DEFAULT_DIAGRAM_PREFS };
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    const obj = stored as Record<string, unknown>;
    for (const k of BOOL_KEYS) {
      if (typeof obj[k] === "boolean") out[k] = obj[k] as boolean;
    }
    if (typeof obj.controlOpacity === "number" && Number.isFinite(obj.controlOpacity)) {
      out.controlOpacity = Math.max(0, Math.min(100, Math.round(obj.controlOpacity)));
    }
    if (Array.isArray(obj.hiddenElements)) {
      out.hiddenElements = obj.hiddenElements.filter(
        (v): v is string => typeof v === "string",
      );
    }
  }
  return out;
}
