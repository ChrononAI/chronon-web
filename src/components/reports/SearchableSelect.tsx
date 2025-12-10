import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";

export function SearchableSelect({ categories, selectedCategory, setSelectedCategory }: any) {
  const [open, setOpen] = useState(false);

  return (
    <div>
    <Popover open={open} onOpenChange={setOpen}>
        <div className="relative w-52">
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={`w-full h-11 justify-between pr-8 ${
              selectedCategory ? "pr-10" : ""
            }`}
        >
          {selectedCategory ? selectedCategory.name : "Select a category"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
        {selectedCategory && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent popover open
              setSelectedCategory(null);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 rounded-full p-0.5 bg-background"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-52 p-0">
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {categories.map((category: any) => (
                <CommandItem
                  key={category.id}
                  onSelect={() => {
                    setSelectedCategory(category);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      selectedCategory?.id === category.id ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {category.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    {selectedCategory && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // prevent opening popover
              setSelectedCategory(null);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        </div>
  );
}
