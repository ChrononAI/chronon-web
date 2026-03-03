import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "../ui/button";
import { ChevronsUpDown, X } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";

function SelectedItemBadge({ selectedItems }: { selectedItems: string[] }) {
  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto no-scrollbar">
      {selectedItems.map((item) => (
        <Badge
          key={item}
          variant="secondary"
          className="text-[12px] flex items-center gap-1 px-1 border border-gray-300"
        >
          {item.replace("_", " ")}
        </Badge>
      ))}
    </div>
  );
}

function MultiSelectDropdown({
  selectedItems,
  allItems,
  toggleItem,
  deselectAll,
  placeholder =  "Select status"
}: {
  selectedItems: string[];
  allItems: any[];
  toggleItem: (id: string) => void;
  deselectAll: () => void;
  placeholder?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full text-muted-foreground flex gap-2 px-3 h-11 justify-between"
        >
          <span className="max-w-[80%]">
            {selectedItems?.length > 0 ? (
              <SelectedItemBadge selectedItems={selectedItems} />
            ) : (
              placeholder
            )}
          </span>
          <span className="flex items-center gap-2">
            {selectedItems.length > 0 && <X
              className="h-4 w-4 opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                deselectAll();
              }}
            />}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] max-w-none p-0"
        align="start"
      >
        <Command className="flex flex-col">
          <CommandEmpty>No items found</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-y-auto">
            {allItems?.map((cat) => (
              <CommandItem
                key={cat}
                onSelect={() => toggleItem(cat)}
                className="flex items-center gap-2"
              >
                <Checkbox
                  checked={selectedItems?.includes(cat)}
                  className="rounded-[2px]"
                />
                <span className="text-sm">{cat.replace("_", " ")}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default MultiSelectDropdown;
