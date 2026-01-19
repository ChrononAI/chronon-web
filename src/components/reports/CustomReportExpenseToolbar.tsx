import { Badge, Box } from "@mui/material";
import { Button } from "../ui/button";
import { Filter, Search } from "lucide-react";
import MultiSelectDropdown from "../shared/MultiSelectDropdown";
import { Input } from "../ui/input";
import { useState } from "react";
import {
  GridToolbarProps,
  Toolbar,
  ToolbarPropsOverrides,
} from "@mui/x-data-grid";
import { FilterMap, getFilterValue } from "@/pages/MyExpensesPage";
import DateRangePicker from "../shared/DateRangePicker";
import FilterModal, { AllowedFilter } from "../expenses/FilterModal";
import { useReportsStore } from "@/store/reportsStore";

export interface CustomExpenseToolbarProps {
  allCategories: string[];
}

type Props = GridToolbarProps &
  ToolbarPropsOverrides &
  Partial<CustomExpenseToolbarProps>;

function CustomReportExpenseToolbar({ allCategories }: Props) {
  const { expenseQuery, setExpenseQuery } = useReportsStore();
  console.log(expenseQuery);

  const hasFilters = Object.keys(expenseQuery).length > 0;

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const searchValue = (getFilterValue(expenseQuery, "q", "eq") as string) ?? "";
  const selectedCategories =
    (getFilterValue(expenseQuery, "category", "in") as string[]) ?? [];

  const dateFrom =
    (getFilterValue(expenseQuery, "expense_date", "gte") as string) ?? undefined;

  const dateTo =
    (getFilterValue(expenseQuery, "expense_date", "lte") as string) ?? undefined;

  const setDate = (operator: "gte" | "lte", value?: string) => {
    setExpenseQuery((prev) => {
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
    {
      key: "category",
      operators: ["in"],
      type: "multi-select",
      label: "Category",
      options: allCategories,
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

  /* -------------------- HANDLERS -------------------- */

  const updateSearch = (value: string) => {
    setExpenseQuery((prev: FilterMap) => {
      const next: FilterMap = { ...prev };

      if (!value) {
        delete next.q; // ✅ correct
      } else {
        next.q = [{ operator: "eq", value }];
      }

      return next;
    });
  };

  const toggleCategory = (category: string) => {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((s) => s !== category)
      : [...selectedCategories, category];

    setExpenseQuery((prev) => {
      const nextQuery = { ...prev };
      if (!next.length) {
        delete nextQuery.category;
      } else {
        nextQuery.category = [{ operator: "in", value: next }];
      }
      return nextQuery;
    });
  };

  const deselectAllCategories = () => {
    setExpenseQuery((prev) => {
      const { category, ...rest } = prev;
      return rest;
    });
  };

  return (
    <>
      <Toolbar className="flex items-center !justify-start !px-[1px] !gap-2 !my-3 !border-0 bg-white">
        {/* 🔍 SEARCH */}
        <Box sx={{ position: "relative", width: "20%", flexShrink: 0 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 bg-white h-10 w-full"
            value={searchValue}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </Box>

        {/* ✅ STATUS */}
        <Box sx={{ width: "28%", flexShrink: 0 }}>
          <MultiSelectDropdown
            allItems={allCategories || []}
            selectedItems={selectedCategories}
            toggleItem={toggleCategory}
            deselectAll={deselectAllCategories}
          />
        </Box>

        <DateRangePicker
          className="w-[16%]"
          value={{ gte: dateFrom, lte: dateTo }}
          onChange={(range) => {
            setDate("gte", range.gte);
            setDate("lte", range.lte);
          }}
        />

        {/* 🔧 ADVANCED FILTER */}
        <Button
          variant="outline"
          onClick={() => setFilterModalOpen(true)}
          className="text-muted-foreground h-11 w-[10%] max-w-[48px] p-3"
        >
          {hasFilters && <Badge
            color="error"
            variant="dot"
            className="relative -top-4 -right-7"
            overlap="circular"
          ></Badge>}
          <Filter className="h-8 w-8" />
        </Button>
      </Toolbar>

      {/* 🧠 FILTER MODAL */}
      <FilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        query={expenseQuery || {}}
        setQuery={setExpenseQuery}
        allowedFilters={filters}
      />
    </>
  );
}

export default CustomReportExpenseToolbar;
