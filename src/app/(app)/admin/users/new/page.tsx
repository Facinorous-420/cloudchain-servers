import { UserForm } from "../user-form";
import { createUser } from "../actions";

export default function NewUserPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">New User</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          Create a new account.
        </p>
      </div>
      <UserForm action={createUser} submitLabel="Create user" />
    </div>
  );
}
