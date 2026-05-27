// Read-only image used on entity detail pages. Renders nothing when the
// entity has no path so the layout doesn't reserve empty space.
//
// The container uses bg-panel-2 + object-contain so the full image is
// visible. For best appearance in this dark theme, upload a transparent PNG;
// JPEG images with white backgrounds will appear as a white photo inside the
// dark-bordered frame — still identifiable, not broken.
export function EntityImage({
  path,
  alt,
  className = "",
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!path) return null;
  return (
    <div
      className={`overflow-hidden rounded-md border border-border bg-panel-2 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={path}
        alt={alt}
        className="block max-h-70 w-full object-contain"
      />
    </div>
  );
}
