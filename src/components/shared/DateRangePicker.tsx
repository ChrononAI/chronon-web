import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarDaysIcon, X } from "lucide-react";

interface DateRangePickerProps {
  value?: {
    gte?: string;
    lte?: string;
  };
  onChange: (value: { gte?: string; lte?: string }) => void;
  className?: string;
}

function formatDate(date?: string) {
  if (!date) return "";
  return format(new Date(date + "T00:00:00"), "MMM dd, yyyy");
}

/**
 * IMPORTANT:
 * Avoid timezone shift by constructing yyyy-mm-dd manually
 */
function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [mainOpen, setMainOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const [tempFrom, setTempFrom] = useState<string | undefined>();
  const [tempTo, setTempTo] = useState<string | undefined>();

  /** Sync local state when popover opens */
  useEffect(() => {
    if (mainOpen) {
      setTempFrom(value?.gte);
      setTempTo(value?.lte);
    }
  }, [mainOpen, value]);

  return (
    <Popover open={mainOpen} onOpenChange={setMainOpen}>
      {/* MAIN TRIGGER */}
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-11 px-3 min-w-[224px] flex items-center justify-between gap-2 font-normal",
            !(value?.gte && value?.lte) && "text-muted-foreground",
            className
          )}
          onClick={() => {
            if (!value?.gte) setFromOpen(true);
          }}
        >
          <span>
            {value?.gte && value?.lte ? (
              <span>
                {formatDate(value.gte)} - {formatDate(value.lte)}
              </span>
            ) : (
              "Date Range"
            )}
          </span>
          {value?.gte && value?.lte && <span>
            <X
              className="opacity-50 text-muted-foreground h-4 w-4"
              onClick={(e) => {
                e.stopPropagation();
                setTempFrom(undefined);
                setTempTo(undefined);
                onChange({});
                setFromOpen(false);
                setToOpen(false);
              }}
            />
          </span>}
        </Button>
      </PopoverTrigger>

      {/* POPOVER CONTENT */}
      <PopoverContent align="start" className="w-auto p-3 space-y-3">
        <div className="flex gap-2">
          {/* FROM */}
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 w-[200px] justify-between flex items-center",
                  !tempFrom && "text-muted-foreground"
                )}
                onClick={() => setToOpen(false)}
              >
                <span>{tempFrom ? formatDate(tempFrom) : "From"}</span>
                <CalendarDaysIcon className="text-muted-foreground h-4 w-4" />
              </Button>
            </PopoverTrigger>

            <PopoverContent side="top" align="start" className="p-0 w-auto">
              <CalendarComponent
                mode="single"
                selected={
                  tempFrom ? new Date(tempFrom + "T00:00:00") : undefined
                }
                onSelect={(date) => {
                  if (!date) return;
                  setTempFrom(toLocalDateString(date));
                  setFromOpen(false);
                  if (!tempTo) {
                    setToOpen(true);
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          {/* TO */}
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 w-[200px] flex items-center justify-between",
                  !tempTo && "text-muted-foreground"
                )}
                onClick={() => setFromOpen(false)}
              >
                {tempTo ? formatDate(tempTo) : "To"}
                <CalendarDaysIcon className="text-muted-foreground h-4 w-4" />
              </Button>
            </PopoverTrigger>

            <PopoverContent side="top" align="start" className="p-0 w-auto">
              <CalendarComponent
                mode="single"
                selected={tempTo ? new Date(tempTo + "T00:00:00") : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  setTempTo(toLocalDateString(date));
                  setToOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTempFrom(undefined);
              setTempTo(undefined);
              onChange({});
              setMainOpen(false);
              setFromOpen(false);
              setToOpen(false);
            }}
          >
            Clear
          </Button>

          <Button
            size="sm"
            onClick={() => {
              onChange({
                gte: tempFrom,
                lte: tempTo,
              });
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
