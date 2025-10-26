import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface DateFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
}

export function DateField({
  id,
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  disabled = false,
  minDate,
  maxDate,
  className = "",
}: DateFieldProps) {
  const [open, setOpen] = useState(false);

  // Parse & format safely
  const selectedDate = value ? new Date(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const formatted = format(date, "yyyy-MM-dd"); // store in backend-friendly format
    onChange(formatted);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <CalendarIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 cursor-pointer hover:text-gray-600 transition-colors"
          />
          <Input
            id={id}
            type="text"
            value={value ? format(new Date(value), "dd/MM/yyyy") : ""}
            onChange={() => {}}
            onClick={() => !disabled && setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className={`pl-10 input-date cursor-pointer ${className}`}
            readOnly
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          fromDate={minDate ? new Date(minDate) : undefined}
          toDate={maxDate ? new Date(maxDate) : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
