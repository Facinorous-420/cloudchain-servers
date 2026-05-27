import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Re-check the session server-side. Every mutation calls this — middleware
// protects pages, but server actions can be invoked directly.
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}
