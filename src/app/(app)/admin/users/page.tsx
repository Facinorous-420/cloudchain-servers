import { prisma } from "@/lib/prisma";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteUserButton } from "./delete-button";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isInitialAdmin: true,
      createdAt: true,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">User Management</h1>
          <p className="mt-0.5 text-[11.5px] text-text-dim">
            {users.length} user{users.length === 1 ? "" : "s"}
          </p>
        </div>
        <LinkButton href="/admin/users/new" variant="primary">
          New user
        </LinkButton>
      </div>

      <Panel>
        <PanelHeader title="Users" />
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[10px] font-black uppercase tracking-wider text-text-dim">
              <th className="px-4 py-2.5">Username</th>
              <th className="px-4 py-2.5">Display name</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border/40 last:border-0 hover:bg-panel-2/50"
              >
                <td className="px-4 py-3 font-bold">
                  {user.username}
                  {user.isInitialAdmin && (
                    <span className="ml-2 text-[10px] font-normal text-text-dim">
                      (initial admin)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-dim">
                  {user.displayName ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={user.role === "ADMIN" ? "accent" : "neutral"}>
                    {user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <LinkButton href={`/admin/users/${user.id}/edit`}>
                      Edit
                    </LinkButton>
                    {!user.isInitialAdmin && (
                      <DeleteUserButton id={user.id} username={user.username} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
