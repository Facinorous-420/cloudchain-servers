import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Falls back to "" so `prisma generate` still works when DATABASE_URL is
    // unset (e.g. during the Docker image build). Migrate and seed require it.
    url: process.env.DATABASE_URL ?? "",
  },
});
