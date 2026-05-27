import { redirect } from "next/navigation";
import { requireUser } from "./require-user";

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/");
  }
  return user;
}
