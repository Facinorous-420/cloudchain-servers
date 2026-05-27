"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as argon2 from "argon2";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import type { FormState } from "@/lib/form-state";

const createUserSchema = z.object({
  username: z.string().min(1, "Username is required").trim(),
  displayName: z.string().trim().optional(),
  role: z.enum(["ADMIN", "MEMBER"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const updateUserSchema = z.object({
  username: z.string().min(1, "Username is required").trim(),
  displayName: z.string().trim().optional(),
  role: z.enum(["ADMIN", "MEMBER"]),
  password: z
    .string()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(
      z.string().min(8, "Password must be at least 8 characters").optional(),
    ),
});

export async function createUser(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { username, displayName, role, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { fieldErrors: { username: ["Username already taken"] } };
  }

  const passwordHash = await argon2.hash(password);
  await prisma.user.create({
    data: { username, displayName: displayName || null, role, passwordHash },
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireAdmin();

  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { username, displayName, role, password } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "User not found" };

  // Block demoting or renaming the initial admin's role.
  if (target.isInitialAdmin && role !== "ADMIN") {
    return { error: "The initial admin account cannot be demoted." };
  }

  // Check username uniqueness (ignore current user's own row).
  const conflict = await prisma.user.findFirst({
    where: { username, NOT: { id } },
  });
  if (conflict) {
    return { fieldErrors: { username: ["Username already taken"] } };
  }

  const passwordHash = password ? await argon2.hash(password) : undefined;

  await prisma.user.update({
    where: { id },
    data: {
      username,
      displayName: displayName || null,
      role,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function deleteUser(id: string): Promise<void> {
  await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.isInitialAdmin) return;
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}
