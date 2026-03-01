import { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronDown } from "lucide-react";

interface TemplateEntity {
  entity_id?: string;
  id?: string;
  display_name?: string;
  field_name?: string;
  field_type?: string;
  is_mandatory?: boolean;
}

interface TemplateEntityFieldProps {
  control: Control<any>;
  entity: TemplateEntity;
  entityOptions: Array<{ id: string; label: string }>;
  dropdownOpen: boolean;
  onDropdownOpenChange: (open: boolean) => void;
  disabled?: boolean;
  inputClassName?: string;
}

const getEntityId = (entity: TemplateEntity): string => {
  return entity?.entity_id || entity?.id || "";
};

const getFieldName = (entity: TemplateEntity): string => {
  return entity?.display_name || entity?.field_name || getEntityId(entity);
};

export function TemplateEntityField({
  control,
  entity,
  entityOptions,
  dropdownOpen,
  onDropdownOpenChange,
  disabled = false,
  inputClassName,
}: TemplateEntityFieldProps) {
  const entityId = getEntityId(entity);
  const fieldName = getFieldName(entity);

  if (!entityId) return null;

  return (
    <FormField
      control={control}
      name={entityId}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {fieldName}
            {entity.is_mandatory && <span className="text-red-500">*</span>}
          </FormLabel>
          {entity.field_type === "SELECT" ? (
            <Popover open={dropdownOpen} onOpenChange={onDropdownOpenChange}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={dropdownOpen}
                    className="h-11 w-full justify-between"
                    disabled={disabled}
                  >
                    <span className="truncate max-w-[85%] overflow-hidden text-ellipsis text-left">
                      {field.value
                        ? entityOptions?.find((opt) => opt.id === field.value)
                            ?.label || `Select ${fieldName}`
                        : `Select ${fieldName}`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={`Search ${fieldName}...`} />
                  <CommandList className="max-h-[180px] overflow-y-auto">
                    <CommandEmpty>
                      No {fieldName.toLowerCase()} found.
                    </CommandEmpty>
                    <CommandGroup>
                      {entityOptions?.map((opt) => (
                        <CommandItem
                          key={opt.id}
                          value={opt.label}
                          onSelect={() => {
                            field.onChange(opt.id);
                            onDropdownOpenChange(false);
                          }}
                        >
                          {opt.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <FormControl>
              <Input
                {...field}
                placeholder={`Enter ${fieldName}`}
                disabled={disabled}
                className={inputClassName}
              />
            </FormControl>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
