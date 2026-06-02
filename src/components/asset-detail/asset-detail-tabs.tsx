"use client";

import { createContext, useContext, useState } from "react";
import { TabBar } from "@/components/ui/tab-bar";

// Splits the (server-rendered) asset detail sections into the same
// General / Size / Hardware / Rendering tabs the edit form uses. Sections are
// rendered on the server and wrapped in <DetailTab> groups; panels stay mounted
// (toggled with display:contents/hidden) so interactive sub-sections keep their
// state. A context carries the active tab to each DetailTab group.
type DetailTabId = "general" | "size" | "hardware" | "rendering";
const ActiveTabContext = createContext<DetailTabId>("general");

export function AssetDetailTabs({
  hasRendering,
  children,
}: {
  hasRendering: boolean;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState<DetailTabId>("general");
  const tabs = [
    { id: "general", label: "General" },
    { id: "size", label: "Size" },
    { id: "hardware", label: "Hardware" },
    ...(hasRendering ? [{ id: "rendering", label: "Rendering" }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <TabBar
        tabs={tabs}
        active={active}
        onChange={(id) => setActive(id as DetailTabId)}
      />
      <ActiveTabContext.Provider value={active}>
        {children}
      </ActiveTabContext.Provider>
    </div>
  );
}

export function DetailTab({
  tab,
  children,
}: {
  tab: DetailTabId;
  children: React.ReactNode;
}) {
  const active = useContext(ActiveTabContext);
  return <div className={active === tab ? "contents" : "hidden"}>{children}</div>;
}
