import { RackForm } from "@/components/forms/rack-form";
import { getSuggestions } from "@/lib/suggestions";
import { createRack } from "../actions";

export default async function NewRackPage() {
  const suggestions = await getSuggestions();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-black">New rack</h1>
        <p className="mt-0.5 text-[11.5px] text-text-dim">
          Add a physical rack to the inventory.
        </p>
      </div>
      <RackForm
        action={createRack}
        suggestions={suggestions}
        submitLabel="Create rack"
      />
    </div>
  );
}
