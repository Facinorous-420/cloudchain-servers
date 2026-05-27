// Shared icon + thumbnail helpers used by list-table thumbnail columns.
// SVG paths mirror the SideNav icons so both stay visually consistent.

type IconKey =
  | "cube"
  | "drive"
  | "cpu"
  | "battery"
  | "box"
  | "key"
  | "grid"
  | "link"
  | "archive"
  | "rack";

const PATHS: Record<IconKey, React.ReactNode> = {
  cube: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05" />
      <path d="M12 22.08V12" />
    </>
  ),
  drive: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="6" y1="9" x2="6.01" y2="9" />
      <line x1="10" y1="9" x2="10.01" y2="9" />
    </>
  ),
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3" />
      <path d="M15 1v3" />
      <path d="M9 20v3" />
      <path d="M15 20v3" />
      <path d="M20 9h3" />
      <path d="M20 14h3" />
      <path d="M1 9h3" />
      <path d="M1 14h3" />
    </>
  ),
  battery: (
    <>
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <line x1="22" y1="11" x2="22" y2="13" />
      <line x1="6" y1="11" x2="6" y2="13" />
      <line x1="10" y1="11" x2="10" y2="13" />
      <line x1="14" y1="11" x2="14" y2="13" />
    </>
  ),
  box: (
    <>
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8 12 13 3 8" />
      <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z" />
      <path d="M12 22V12" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  archive: (
    <>
      <rect x="2" y="4" width="20" height="5" rx="2" />
      <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
      <path d="M10 13h4" />
    </>
  ),
  rack: (
    <>
      <rect x="3" y="3" width="18" height="6" rx="1" />
      <rect x="3" y="13" width="18" height="8" rx="1" />
      <line x1="7" y1="6" x2="7.01" y2="6" />
      <line x1="11" y1="6" x2="11.01" y2="6" />
      <line x1="7" y1="17" x2="7.01" y2="17" />
      <line x1="11" y1="17" x2="11.01" y2="17" />
    </>
  ),
};

// Category → icon mapping used by asset thumbnails.
const CATEGORY_ICON: Record<string, IconKey> = {
  SERVER: "cube",
  SWITCH: "rack",
  GATEWAY: "rack",
  FIREWALL: "rack",
  UPS: "battery",
  PDU: "rack",
  KVM: "grid",
  ACCESS_POINT: "link",
  NUC: "cube",
  SBC: "cube",
  SHELF: "archive",
  DRAWER: "archive",
  BLANK_PANEL: "rack",
  OTHER: "cube",
};

function SvgIcon({ name, className }: { name: IconKey; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}

// 32×32 icon-only thumbnail — used as fallback when no image is available.
export function EntityIconThumb({
  type,
  className = "",
}: {
  type: IconKey;
  className?: string;
}) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border/50 bg-panel-2 text-text-dim ${className}`}
    >
      <SvgIcon name={type} className="h-4 w-4" />
    </div>
  );
}

// 32×32 asset thumbnail — shows the main uploaded image when available,
// falls back to the category icon. Uses object-cover to crop white edges.
export function AssetThumb({
  imagePath,
  category,
  className = "",
}: {
  imagePath: string | null | undefined;
  category: string;
  className?: string;
}) {
  const icon = CATEGORY_ICON[category] ?? "cube";
  if (!imagePath) {
    return <EntityIconThumb type={icon} className={className} />;
  }
  return (
    <div
      className={`h-8 w-8 shrink-0 overflow-hidden rounded border border-border/50 bg-panel-2 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imagePath}
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
}
