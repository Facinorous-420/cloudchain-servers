import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma";

// next-auth re-exports these types from @auth/core, so the augmentation must
// target the @auth/core modules where the interfaces are actually declared.
declare module "@auth/core/types" {
  interface User {
    username: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
  }
}
