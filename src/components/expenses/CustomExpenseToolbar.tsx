import { Box } from "@mui/material";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarDaysIcon, Filter, Search, X } from "lucide-react";
import MultiSelectDropdown from "../shared/MultiSelectDropdown";
import { Input } from "../ui/input";
import { useState } from "react";
import {
  GridToolbarProps,
  Toolbar,
  ToolbarPropsOverrides,
} from "@mui/x-data-grid";
import { FilterMap, getFilterValue } from "@/pages/MyExpensesPage";
import FilterModal, { AllowedFilter } from "./FilterModal";
import { useExpenseStore } from "@/store/expenseStore";

export interface CustomExpenseToolbarProps {
  allStatuses: string[];
}

type Props = GridToolbarProps &
  ToolbarPropsOverrides &
  Partial<CustomExpenseToolbarProps>;

function CustomExpenseToolbar({ allStatuses }: Props) {
  const { query, setQuery } = useExpenseStore();

  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);


  const searchValue = (getFilterValue(query, "q", "eq") as string) ?? "";

  const selectedStatuses =
    (getFilterValue(query, "status", "in") as string[]) ?? [];

  const dateFrom =
    (getFilterValue(query, "expense_date", "gte") as string) ?? undefined;

  const dateTo =
    (getFilterValue(query, "expense_date", "lte") as string) ?? undefined;


  const filters: AllowedFilter[] = [
    { key: "category", label: "Category", operators: ["ilike"], type: "text" },
    {
      key: "status",
      operators: ["in"],
      type: "multi-select",
      label: "Status",
      options: allStatuses,
    },
    { key: "amount", label: "Amount", operators: ["eq", "lte", "gte"], type: "number" },
    {
      key: "expense_date",
      label: "Expense Date",
      operators: ["eq", "lte", "gte"],
      type: "date",
    },
    {
        key: "vendor",
        label: "Vendor",
        type: "text",
        operators: ["ilike"]
    }
  ];

  /* -------------------- HANDLERS -------------------- */

  const updateSearch = (value: string) => {
    setQuery((prev: FilterMap) => {
      const next: FilterMap = { ...prev };

      if (!value) {
        delete next.q; // ✅ correct
      } else {
        next.q = [{ operator: "eq", value }];
      }

      return next;
    });
  };

  const toggleStatus = (status: string) => {
    const next = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];

    setQuery((prev) => {
      const nextQuery = { ...prev };
      if (!next.length) {
        delete nextQuery.status;
      } else {
        nextQuery.status = [{ operator: "in", value: next }];
      }
      return nextQuery;
    });
  };

  const setDate = (operator: "gte" | "lte", value?: string) => {
    setQuery((prev) => {
      const next = { ...prev };
      const existing = next.expense_date ?? [];

      const filtered = existing.filter((f) => f.operator !== operator);

      if (value) {
        filtered.push({ operator, value });
      }

      if (filtered.length) {
        next.expense_date = filtered;
      } else {
        delete next.expense_date;
      }

      return next;
    });
  };

  /* -------------------- RENDER -------------------- */

  return (
    <>
      <Toolbar className="flex items-center !justify-start !px-[1px] !gap-2 !my-3 !border-0 bg-white">
        {/* 🔍 SEARCH */}
        <Box sx={{ position: "relative", width: 230, flexShrink: 0 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 bg-white h-10 w-full"
            value={searchValue}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </Box>

        {/* ✅ STATUS */}
        <Box sx={{ width: 280, flexShrink: 0 }}>
          <MultiSelectDropdown
            allItems={allStatuses || []}
            selectedItems={selectedStatuses}
            toggleItem={toggleStatus}
          />
        </Box>

        {/* 📅 FROM */}
        <Box sx={{ flexShrink: 0, width: 224 }}>
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-11 w-full px-3 text-left font-normal flex items-center gap-2",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <span className="flex-1 truncate">
                  {dateFrom ? format(new Date(dateFrom), "PPP") : "From"}
                </span>
                {dateFrom && (
                  <X
                    className="h-4 w-4 opacity-50 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDate("gte");
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={dateFrom ? new Date(dateFrom) : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  setDate("gte", date.toISOString().split("T")[0]);
                  setFromOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </Box>

        {/* 📅 TO */}
        <Box sx={{ flexShrink: 0, width: 224 }}>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-11 w-full px-3 text-left font-normal flex items-center gap-2",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <span className="flex-1 truncate">
                  {dateTo ? format(new Date(dateTo), "PPP") : "To"}
                </span>
                <CalendarDaysIcon className="text-muted-foreground w-4 h-4" />
                {dateTo && (
                  <X
                    className="h-4 w-4 opacity-50 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDate("lte");
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={dateTo ? new Date(dateTo) : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  setDate("lte", date.toISOString().split("T")[0]);
                  setToOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </Box>

        {/* 🔧 ADVANCED FILTER */}
        <Button
          variant="outline"
          onClick={() => setFilterModalOpen(true)}
          className="text-muted-foreground h-11"
        >
          <Filter className="h-6 w-6" />
        </Button>
      </Toolbar>

      {/* 🧠 FILTER MODAL */}
      <FilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        query={query || {}}
        setQuery={setQuery}
        allowedFilters={filters}
      />
    </>
  );
}

export default CustomExpenseToolbar;
