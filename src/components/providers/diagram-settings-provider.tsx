"use client";

import { createContext, useContext } from "react";
import type { DiagramSettings } from "@/lib/diagram-settings";
import { DEFAULT_PORT_TYPE_LABELS } from "@/lib/diagram-settings";

const DiagramSettingsContext = createContext<DiagramSettings>({
  portLabels: DEFAULT_PORT_TYPE_LABELS,
});

export function DiagramSettingsProvider({
  portLabels,
  children,
}: {
  portLabels: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <DiagramSettingsContext.Provider value={{ portLabels }}>
      {children}
    </DiagramSettingsContext.Provider>
  );
}

export function useDiagramSettings(): DiagramSettings {
  return useContext(DiagramSettingsContext);
}
