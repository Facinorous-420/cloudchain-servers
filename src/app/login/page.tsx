import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  const appName = settings?.appName ?? "Cloudchain Inventory";
  const appDescription =
    settings?.appDescription ??
    "Homelab server rack inventory and documentation";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-panel p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-black tracking-tight">{appName}</h1>
          {appDescription && (
            <p className="mt-1 text-xs text-text-dim">{appDescription}</p>
          )}
          <p className="mt-2 text-xs text-faint">Sign in to continue</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
