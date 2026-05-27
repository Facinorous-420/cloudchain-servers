export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TopBar } from "@/components/shell/top-bar";
import { SideNav } from "@/components/shell/side-nav";
import { MobileNav } from "@/components/shell/mobile-nav";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPalette } from "@/components/ui/command-palette";
import { DiagramSettingsProvider } from "@/components/providers/diagram-settings-provider";
import { mergeLabels, DEFAULT_PORT_TYPE_LABELS } from "@/lib/diagram-settings";
import pkg from "../../../package.json";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [session, settings] = await Promise.all([
    auth(),
    prisma.appSettings.findUnique({ where: { id: 1 } }),
  ]);
  const portLabels = mergeLabels(settings?.portTypeLabels, DEFAULT_PORT_TYPE_LABELS);

  return (
    <ToastProvider>
      <DiagramSettingsProvider portLabels={portLabels}>
        <div className="flex min-h-screen flex-col">
          <CommandPalette />
          <TopBar />
          <MobileNav
            username={session?.user?.username}
            role={session?.user?.role}
          />
          <div className="flex flex-1">
            <div className="hidden md:flex">
              <SideNav />
            </div>
            <main className="flex min-h-0 flex-1 flex-col">
              <div className="mx-auto w-full max-w-345 flex-1 p-3 md:p-5">
                {children}
              </div>
              <footer className="border-t border-border px-5 py-2 text-center text-[11px] text-faint">
                <Link href="/changelog" className="hover:text-accent hover:underline">
                  {pkg.version}
                </Link>
              </footer>
            </main>
          </div>
        </div>
      </DiagramSettingsProvider>
    </ToastProvider>
  );
}
