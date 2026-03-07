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
import { ChevronsUpDown } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { PolicyCategory } from "@/types/expense";
import { Input } from "../ui/input";

function SearchableMultiSelect({
  selectedCategories,
  setSearchTerm,
  handleSelectAllFiltered,
  handleDeselectAllFiltered,
  filteredCategories,
  toggleCategory,
}: {
  selectedCategories: string[];
  setSearchTerm: (val: string) => void;
  handleSelectAllFiltered: () => void;
  handleDeselectAllFiltered: () => void;
  filteredCategories: PolicyCategory[];
  toggleCategory: (id: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full h-11 justify-between">
          {selectedCategories.length > 0
            ? `${selectedCategories.length} selected`
            : "Select categories"}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-none p-0" align="start">
        <Command className="flex flex-col">
          <div className="sticky top-0 z-10 bg-white border-b">
            <Input
              placeholder="Search categories..."
              className="border-0 block outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:ring-0 shadow-none"
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="flex gap-2 p-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSelectAllFiltered}
              >
                Select all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAllFiltered}
              >
                Clear
              </Button>
            </div>
          </div>

          <CommandEmpty>No categories found.</CommandEmpty>

          <CommandGroup className="max-h-64 overflow-y-auto">
            {filteredCategories.map((cat) => (
              <CommandItem
                key={cat.id}
                onSelect={() => toggleCategory(cat.id)}
                className="flex items-center gap-2"
              >
                <Checkbox checked={selectedCategories.includes(cat.id)} />
                <span className="text-sm">{cat.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SearchableMultiSelect;
