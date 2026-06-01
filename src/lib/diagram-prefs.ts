// Per-user rack-diagram view preferences (issue 4). Stored as JSON on
// User.diagramPrefs so each user's filters follow them across devices without
// being shared between users.

export type DiagramPrefs = {
  hideNames: boolean;
  hidePorts: boolean;
  hideBays: boolean;
  imageMode: boolean;
};

export const DEFAULT_DIAGRAM_PREFS: DiagramPrefs = {
  hideNames: false,
  hidePorts: false,
  hideBays: false,
  imageMode: false,
};

const KEYS = Object.keys(DEFAULT_DIAGRAM_PREFS) as (keyof DiagramPrefs)[];

// Coerce arbitrary stored JSON into a complete, type-safe DiagramPrefs.
export function parseDiagramPrefs(stored: unknown): DiagramPrefs {
  const out = { ...DEFAULT_DIAGRAM_PREFS };
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    const obj = stored as Record<string, unknown>;
    for (const k of KEYS) {
      if (typeof obj[k] === "boolean") out[k] = obj[k] as boolean;
    }
  }
  return out;
}
