import { format } from "date-fns";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface DateRangePickerProps {
  dateFrom?: string;
  dateTo?: string;
  className?: string;
  setDate?: (type: "gte" | "lte", value?: string) => void;
}

function formatDate(date: Date | string | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM dd, yyyy");
}

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DateRangePicker({
  dateTo,
  dateFrom,
  className,
  setDate,
}: DateRangePickerProps) {
  const [mainOpen, setMainOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  // Local state to store selections before applying
  const [tempFrom, setTempFrom] = useState<string | undefined>(dateFrom);
  const [tempTo, setTempTo] = useState<string | undefined>(dateTo);
  return (
    <Popover open={mainOpen} onOpenChange={setMainOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          onClick={() => {
            if (!dateFrom) {
              setFromOpen(true);
            }
            setTempFrom(dateFrom);
            setTempTo(dateTo);
          }}
          className={cn(
            "h-11 px-3 min-w-[224px] justify-start flex items-center gap-2 font-normal",
            !(dateFrom && dateTo) && "text-muted-foreground",
            className
          )}
        >
          {tempFrom && tempTo ? (
            <span>
              {formatDate(new Date(tempFrom))} - {formatDate(new Date(tempTo))}
            </span>
          ) : (
            "Date Range"
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-3 space-y-3">
        <div className="flex gap-2">
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 w-[200px] justify-start",
                  !tempFrom && "text-muted-foreground"
                )}
                onClick={() => setToOpen(false)}
              >
                {tempFrom ? formatDate(new Date(tempFrom)) : "From"}
              </Button>
            </PopoverTrigger>

            <PopoverContent side="top" align="start" className="p-0 w-auto">
              <CalendarComponent
                mode="single"
                selected={tempFrom ? new Date(tempFrom) : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  setTempFrom(toLocalDateString(date));
                  setFromOpen(false);
                  if (!dateTo) {
                    setToOpen(true);
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 w-[200px] justify-start",
                  !tempTo && "text-muted-foreground"
                )}
                onClick={() => setFromOpen(false)}
              >
                {tempTo ? formatDate(new Date(tempTo)) : "To"}
              </Button>
            </PopoverTrigger>

            <PopoverContent side="top" align="start" className="p-0 w-auto">
              <CalendarComponent
                mode="single"
                selected={tempTo ? new Date(tempTo) : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  setTempTo(toLocalDateString(date));
                  setToOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTempFrom(undefined);
              setTempTo(undefined);
              setDate && setDate("gte");
              setDate && setDate("lte");
              setFromOpen(false);
              setToOpen(false);
              setMainOpen(false);
            }}
          >
            Clear
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setDate && setDate("gte", tempFrom);
              setDate && setDate("lte", tempTo);
              setMainOpen(false);
              setFromOpen(false);
              setToOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;
