import path from "node:path";
import { createReadStream, statSync } from "node:fs";
import { requireUser } from "@/lib/require-user";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const PRESETS_ROOT = path.join(process.cwd(), "presets");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

export async function GET(request: NextRequest) {
  await requireUser();

  const src = request.nextUrl.searchParams.get("src");
  if (!src) return new Response("Missing src", { status: 400 });

  // Resolve and verify the path stays within presets/
  const resolved = path.resolve(PRESETS_ROOT, src);
  if (!resolved.startsWith(PRESETS_ROOT + path.sep) && resolved !== PRESETS_ROOT) {
    return new Response("Forbidden", { status: 403 });
  }

  const ext = path.extname(resolved).slice(1).toLowerCase();
  const contentType = MIME[ext];
  if (!contentType) return new Response("Unsupported type", { status: 415 });

  let size: number;
  try {
    size = statSync(resolved).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const stream = createReadStream(resolved);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = stream as any;
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
