"use client";

export type UsedPort = { portNumber: number; connLabel: string };

export function PortPicker({
  portCount,
  selected,
  onChange,
  usedPorts = [],
  label = "port",
}: {
  portCount: number;
  selected: number | null;
  onChange: (n: number | null) => void;
  usedPorts?: UsedPort[];
  label?: string;
}) {
  const usedMap = new Map(usedPorts.map((p) => [p.portNumber, p.connLabel]));

  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: portCount }, (_, i) => i + 1).map((n) => {
        const connLabel = usedMap.get(n);
        const isUsed = connLabel !== undefined;
        const isSelected = selected === n;

        return (
          <button
            key={n}
            type="button"
            title={
              isUsed
                ? `In use: ${connLabel}`
                : isSelected
                  ? `${label} ${n} (selected)`
                  : `${label} ${n}`
            }
            onClick={() => onChange(isSelected ? null : n)}
            className={[
              "flex h-6 min-w-6 items-center justify-center rounded px-1 text-[10px] font-bold transition-colors",
              isSelected
                ? "bg-accent text-bg"
                : isUsed
                  ? "cursor-help border border-border/40 bg-panel-2 text-faint"
                  : "cursor-pointer border border-border bg-panel-2 text-text-dim hover:border-accent hover:text-accent",
            ].join(" ")}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
