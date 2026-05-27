import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/require-user";

// User-uploaded images land here. Saved to public/uploads/<uuid>.<ext> so
// Next.js serves them directly from /uploads/<file>. In production the
// uploads directory is a mounted Docker volume so files survive image
// rebuilds.
//
// Limits: image/* MIME only, 5MB max. Filename is randomised to avoid
// collisions and to defang any path-traversal characters in the original.

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif"]);

export async function POST(request: Request) {
  await requireUser();

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json(
      { error: "Only image files are accepted" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "Image must be 5MB or smaller" },
      { status: 400 },
    );
  }

  const dotIdx = file.name.lastIndexOf(".");
  const rawExt = dotIdx >= 0 ? file.name.slice(dotIdx + 1).toLowerCase() : "";
  const ext = ALLOWED_EXTS.has(rawExt) ? rawExt : "png";
  const filename = `${randomUUID()}.${ext}`;

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buf);

  return Response.json({ path: `/uploads/${filename}` });
}
