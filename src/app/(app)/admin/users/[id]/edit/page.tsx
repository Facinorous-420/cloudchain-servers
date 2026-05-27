import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserForm } from "../../user-form";
import { updateUser } from "../../actions";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isInitialAdmin: true,
    },
  });
  if (!user) notFound();

  const boundAction = updateUser.bind(null, id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Edit User</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          Editing{" "}
          <span className="font-bold text-text">{user.username}</span>
          {user.isInitialAdmin && (
            <span className="ml-1.5 text-text-dim">(initial admin — role is locked)</span>
          )}
        </p>
      </div>
      <UserForm
        action={boundAction}
        submitLabel="Save changes"
        defaultValues={{
          username: user.username,
          displayName: user.displayName ?? "",
          role: user.role,
        }}
        isInitialAdmin={user.isInitialAdmin}
        isEdit
      />
    </div>
  );
}
