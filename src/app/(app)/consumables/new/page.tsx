import { ConsumableForm } from "@/components/forms/consumable-form";
import { createConsumable } from "../actions";

export default function NewConsumablePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">New consumable</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          Add cables, thermal paste, or other supplies.
        </p>
      </div>
      <ConsumableForm
        action={createConsumable}
        submitLabel="Create consumable"
      />
    </div>
  );
}
