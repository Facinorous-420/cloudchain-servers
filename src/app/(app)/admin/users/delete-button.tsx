"use client";

import { useRouter } from "next/navigation";
import { deleteUser } from "./actions";

export function DeleteUserButton({
  id,
  username,
}: {
  id: string;
  username: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
        await deleteUser(id);
        router.refresh();
      }}
      className="rounded-md border border-border px-3.5 py-2 text-sm text-red-400 transition-colors hover:border-red-400 hover:bg-red-400/10"
    >
      Delete
    </button>
  );
}
