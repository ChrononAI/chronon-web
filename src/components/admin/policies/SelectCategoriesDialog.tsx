import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";

type Category = {
  id: string;
  name: string;
};

export default function CategorySelectionDialog({
  policy_id,
  categories,
  handleApply,
  searchTerm,
  setSearchTerm,
}: {
  policy_id: string;
  categories: Category[];
  handleApply: any;
  searchTerm: string;
  setSearchTerm: any;
}) {
  const [tempSelection, setTempSelection] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setTempSelection((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button variant="outline">Select Categories</Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-xl h-[50vh] -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-lg">
          <AlertDialog.Title className="text-lg font-semibold mb-4">
            Select Categories
          </AlertDialog.Title>
          <div className="flex h-[90%] flex-col space-y-2">
            <div>
              <Input
                type="text"
                placeholder="Search Categories"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-1 px-1 overflow-y-auto space-y-3 pr-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Checkbox
                    checked={tempSelection.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">Cancel</Button>
              </AlertDialog.Cancel>

              <AlertDialog.Action asChild>
                <Button
                  onClick={() => {
                    const payload = { policy_id, categories: tempSelection };
                    handleApply(payload);
                    setTempSelection([]);
                  }}
                >
                  Apply
                </Button>
              </AlertDialog.Action>
            </div>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
