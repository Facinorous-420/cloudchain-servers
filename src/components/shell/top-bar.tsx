import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TopBarSearch } from "./top-bar-search";
import { RecentItems } from "./recent-items";

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-label="Admin"
    >
      <path
        fillRule="evenodd"
        d="M10 1.5L3 4.5v5c0 4.14 2.98 8.02 7 9 4.02-.98 7-4.86 7-9v-5L10 1.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export async function TopBar() {
  const [session, settings] = await Promise.all([
    auth(),
    prisma.appSettings.findUnique({ where: { id: 1 } }),
  ]);
  const user = session?.user;
  const appName = settings?.appName ?? "Cloudchain Inventory";

  return (
    <header className="relative flex h-12 items-center justify-between border-b border-border bg-panel px-4.5">
      {/* Left: status dot + app name — hidden on mobile (drawer shows it instead) */}
      <div className="hidden items-center gap-2 text-[13px] font-bold md:flex">
        <span className="h-1.75 w-1.75 rounded-full bg-status-green shadow-[0_0_6px_var(--color-status-green)]" />
        {appName}
      </div>

      {/* Centre: app name wordmark */}
      <div className="absolute left-1/2 -translate-x-1/2 text-[13px] font-black tracking-[1px]">
        {appName.toUpperCase()}
      </div>

      {/* Right: actions left-to-right, then username + badge at the far right */}
      {/* Hidden on mobile — replaced by the MobileNav hamburger + drawer */}
      <div className="hidden items-center gap-3 md:flex">
        <TopBarSearch />
        <RecentItems />
        {user?.role === "ADMIN" && (
          <Link
            href="/admin"
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text-dim transition-colors hover:border-accent hover:text-accent"
          >
            Admin
          </Link>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text-dim transition-colors hover:border-accent hover:text-accent"
          >
            Sign out
          </button>
        </form>
        {/* Username + role badge — always rightmost */}
        {user && (
          <span className="flex items-center gap-1.5 text-xs text-text-dim">
            {user.username}
            {user.role === "ADMIN" && (
              <ShieldIcon className="h-3 w-3 text-accent" />
            )}
          </span>
        )}
      </div>
    </header>
  );
}
