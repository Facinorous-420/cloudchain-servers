import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";
import {
  mergeColors,
  mergeLabels,
  DEFAULT_PORT_TYPE_COLORS,
  DEFAULT_PORT_TYPE_LABELS,
  DEFAULT_CATEGORY_COLORS,
} from "@/lib/diagram-settings";

export default async function AdminSettingsPage() {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });

  const portTypeColors = mergeColors(settings?.portTypeColors, DEFAULT_PORT_TYPE_COLORS);
  const portTypeLabels = mergeLabels(settings?.portTypeLabels, DEFAULT_PORT_TYPE_LABELS);
  const categoryColors = mergeColors(settings?.categoryColors, DEFAULT_CATEGORY_COLORS);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">App Settings</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          App-wide configuration. Changes apply immediately for all users.
        </p>
      </div>
      <SettingsForm
        defaultValues={{
          appName: settings?.appName ?? "Cloudchain Inventory",
          appDescription:
            settings?.appDescription ??
            "Homelab server rack inventory and documentation",
          accentColor: settings?.accentColor ?? "#00a8c6",
          serviceLoopLengthInches: settings?.serviceLoopLengthInches ?? 12,
          portTypeColors,
          portTypeLabels,
          categoryColors,
        }}
      />
    </div>
  );
}
