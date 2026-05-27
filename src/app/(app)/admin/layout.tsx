import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/require-admin";
import { AdminTabs } from "./admin-tabs";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Admin</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          Manage users and application settings.
        </p>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
