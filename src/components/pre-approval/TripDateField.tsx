import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/utils";

interface TripDateFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
}

export function TripDateField({
  id,
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  disabled = false,
  minDate,
  maxDate,
  className = "",
}: TripDateFieldProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? parseLocalDate(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const formatted = format(date, "yyyy-MM-dd");
    onChange(formatted);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            id={id}
            type="text"
            value={value ? format(parseLocalDate(value), "dd/MM/yyyy") : ""}
            onChange={() => {}}
            onClick={() => !disabled && setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className={`pl-0 pr-10 input-date cursor-pointer ${className}`}
            readOnly
          />
          <CalendarIcon
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 cursor-pointer hover:text-gray-600 transition-colors pointer-events-none"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          fromDate={minDate ? parseLocalDate(minDate) : undefined}
          toDate={maxDate ? parseLocalDate(maxDate) : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
