import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  StorageForm,
  type StorageFormData,
} from "@/components/forms/storage-form";
import { updateStorage } from "../../actions";

export default async function EditStoragePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const storage = await prisma.storage.findUnique({ where: { id } });
  if (!storage) notFound();

  const data: StorageFormData = {
    id: storage.id,
    name: storage.name,
    notes: storage.notes ?? "",
    imagePath: storage.imagePath ?? "",
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">Edit storage</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">{storage.name}</p>
      </div>
      <StorageForm
        action={updateStorage.bind(null, storage.id)}
        storage={data}
        submitLabel="Save changes"
      />
    </div>
  );
}
