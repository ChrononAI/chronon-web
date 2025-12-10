import { useState } from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CustomAttribute } from '@/types/report';

interface DynamicCustomFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  attribute: CustomAttribute;
  readOnly?: boolean;
}

export function DynamicCustomField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  attribute,
  readOnly = false,
}: DynamicCustomFieldProps<TFieldValues, TName>) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const renderField = () => {
          switch (attribute.attribute_type) {
            case 'DROPDOWN':
              return (
                <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={dropdownOpen}
                        className="w-full h-11 justify-between"
                        disabled={readOnly}
                      >
                        <span className="truncate">
                          {field.value || `Select ${attribute.display_name}`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[--radix-popover-trigger-width] p-0" 
                    side="bottom" 
                    align="start"
                    sideOffset={4}
                    avoidCollisions={false}
                    collisionPadding={0}
                  >
                    <Command>
                      <CommandInput placeholder={`Search ${attribute.display_name.toLowerCase()}...`} />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No option found.</CommandEmpty>
                        <CommandGroup>
                          {attribute.dropdown_values?.map((value) => (
                            <CommandItem
                              key={value}
                              value={value}
                              onSelect={() => {
                                field.onChange(value);
                                setDropdownOpen(false);
                              }}
                            >
                              {value}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              );

            case 'TEXT':
              return (
                <FormControl>
                  <Input
                    {...field}
                    placeholder={attribute.description || `Enter ${attribute.display_name.toLowerCase()}`}
                    readOnly={readOnly}
                  />
                </FormControl>
              );

            case 'NUMBER':
              return (
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    placeholder={attribute.description || `Enter ${attribute.display_name.toLowerCase()}`}
                    readOnly={readOnly}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || '')}
                  />
                </FormControl>
              );

            case 'DATE':
              return (
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 h-11 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={readOnly}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setDatePickerOpen(false);
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              );

            case 'BOOLEAN':
              return (
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${attribute.display_name.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
              );

            default:
              return (
                <FormControl>
                  <Input
                    {...field}
                    placeholder={attribute.description || `Enter ${attribute.display_name.toLowerCase()}`}
                    readOnly={readOnly}
                  />
                </FormControl>
              );
          }
        };

        return (
          <FormItem className="flex-1">
            <FormLabel>
              {attribute.display_name.charAt(0).toUpperCase() + attribute.display_name.slice(1)}
              {attribute.is_required && ' *'}
            </FormLabel>
            {renderField()}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
