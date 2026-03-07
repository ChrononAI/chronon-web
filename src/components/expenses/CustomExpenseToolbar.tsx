import { Badge } from "@mui/material";
import { Button } from "../ui/button";
import { Filter, Search, X, Plus } from "lucide-react";
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
import DateRangePicker from "../shared/DateRangePicker";

export interface CustomExpenseToolbarProps {
  allStatuses: string[];
  onCreateClick?: () => void;
  createButtonText?: string;
}

type Props = GridToolbarProps &
  ToolbarPropsOverrides &
  Partial<CustomExpenseToolbarProps>;

function CustomExpenseToolbar({ 
  allStatuses,
  onCreateClick,
  createButtonText = "Create New Expense",
}: Props) {
  const { query, setQuery } = useExpenseStore();

  const hasFilters = Object.keys(query).length > 0;

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const searchValue = (getFilterValue(query, "q", "eq") as string) ?? "";
  const selectedStatuses =
    (getFilterValue(query, "status", "in") as string[]) ?? [];

  const dateFrom =
    (getFilterValue(query, "expense_date", "gte") as string) ?? undefined;

  const dateTo =
    (getFilterValue(query, "expense_date", "lte") as string) ?? undefined;

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

  const filters: AllowedFilter[] = [
    { key: "category", label: "Category", operators: ["ilike"], type: "text" },
    {
      key: "status",
      operators: ["in"],
      type: "multi-select",
      label: "Status",
      options: allStatuses,
    },
    {
      key: "amount",
      label: "Amount",
      operators: ["eq", "lte", "gte"],
      type: "number",
    },
    {
      key: "expense_date",
      label: "Expense Date",
      operators: ["eq", "lte", "gte"],
      type: "date",
      setDate: setDate,
    },
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      operators: ["ilike"],
    },
  ];

  const updateSearch = (value: string) => {
    setQuery((prev: FilterMap) => {
      const next: FilterMap = { ...prev };

      if (!value) {
        delete next.q;
      } else {
        next.q = [{ operator: "eq", value }];
      }

      return next;
    });
  };

  const handleClearSearch = () => {
    updateSearch("");
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

  const deselectAllStatus = () => {
    setQuery((prev) => {
      const { status, ...rest } = prev;
      return rest;
    });
  };

  return (
    <>
      <Toolbar 
        className="flex items-center !border-0 bg-white"
        style={{
          width: "100%",
          height: "31px",
          justifyContent: "space-between",
          padding: "0",
          paddingLeft: "10px",
          paddingRight: "18px",
        }}
      >
        <div className="flex items-center" style={{ gap: "17px" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-9 bg-white h-10 w-96"
              value={searchValue}
              onChange={(e) => updateSearch(e.target.value)}
            />
          </div>
          
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearSearch}
              className="text-muted-foreground hover:text-foreground"
              style={{
                width: "18px",
                height: "18px",
                minWidth: "18px",
                padding: "0",
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          )}

          <div 
            style={{
              width: "1px",
              height: "18px",
              backgroundColor: "#EBEBEB",
            }}
          />

          <div 
            className="flex items-center"
            style={{
              height: "20px",
              gap: "17px",
            }}
          >
            <div style={{ width: "200px" }}>
              <MultiSelectDropdown
                allItems={allStatuses || []}
                selectedItems={selectedStatuses}
                toggleItem={toggleStatus}
                deselectAll={deselectAllStatus}
              />
            </div>

            <DateRangePicker
              className="w-[180px]"
              value={{ gte: dateFrom, lte: dateTo }}
              onChange={(range) => {
                setDate("gte", range.gte);
                setDate("lte", range.lte);
              }}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFilterModalOpen(true)}
              className="text-muted-foreground hover:text-foreground p-0 hover:bg-transparent"
              style={{
                width: "18px",
                height: "18px",
                minWidth: "18px",
                padding: "0",
                position: "relative",
              }}
            >
              {hasFilters && (
                <Badge
                  color="error"
                  variant="dot"
                  sx={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                  }}
                />
              )}
              <Filter 
                className="h-full w-full"
                style={{
                  width: "18px",
                  height: "18px",
                }}
              />
            </Button>
          </div>
        </div>

        {onCreateClick && (
          <Button
            onClick={onCreateClick}
            style={{
              width: "163px",
              height: "31px",
              gap: "8px",
              borderRadius: "4px",
              paddingTop: "8px",
              paddingRight: "12px",
              paddingBottom: "8px",
              paddingLeft: "12px",
              backgroundColor: "#0D9C99",
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0b8a87";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0D9C99";
            }}
          >
            <Plus 
              style={{
                width: "12px",
                height: "12px",
                color: "#FFFFFF",
              }}
            />
            <span
              style={{
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: "12px",
                lineHeight: "100%",
                letterSpacing: "0%",
                color: "#FFFFFF",
                height: "15px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {createButtonText}
            </span>
          </Button>
        )}
      </Toolbar>

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
