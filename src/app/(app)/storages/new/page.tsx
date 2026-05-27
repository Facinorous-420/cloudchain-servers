import { StorageForm } from "@/components/forms/storage-form";
import { createStorage } from "../actions";

export default function NewStoragePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">New storage</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          Add a named container for off-rack inventory.
        </p>
      </div>
      <StorageForm action={createStorage} submitLabel="Create storage" />
    </div>
  );
}
