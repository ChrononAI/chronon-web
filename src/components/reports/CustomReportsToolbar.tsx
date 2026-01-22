import { Badge, Box } from "@mui/material";
import { Button } from "../ui/button";
import { Filter, Search } from "lucide-react";
import MultiSelectDropdown from "../shared/MultiSelectDropdown";
import { Input } from "../ui/input";
import { useState } from "react";
import {
  GridRowSelectionModel,
  GridToolbarProps,
  Toolbar,
  ToolbarPropsOverrides,
} from "@mui/x-data-grid";
import { FilterMap, getFilterValue } from "@/pages/MyExpensesPage";
import DateRangePicker from "../shared/DateRangePicker";
import FilterModal, { AllowedFilter } from "../expenses/FilterModal";
import { useReportsStore } from "@/store/reportsStore";

export interface CustomExpenseToolbarProps {
  allStatuses: string[];
  marking: boolean;
  onCustomClick: () => void;
  rowSelection: GridRowSelectionModel;
  rowCount: number;
  activeTab: string;
}

type Props = GridToolbarProps &
  ToolbarPropsOverrides &
  Partial<CustomExpenseToolbarProps>;

function CustomReportsToolbar({
  allStatuses
}: Props) {
  const { query, setQuery } = useReportsStore();

  const hasFilters = Object.keys(query).length > 0;

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const searchValue = (getFilterValue(query, "q", "eq") as string) ?? "";
  const selectedStatuses =
    (getFilterValue(query, "status", "in") as string[]) ?? [];

  const dateFrom =
    (getFilterValue(query, "created_at", "gte") as string) ?? undefined;

  const dateTo =
    (getFilterValue(query, "created_at", "lte") as string) ?? undefined;

  const setDate = (operator: "gte" | "lte", value?: string) => {
    setQuery((prev) => {
      const next = { ...prev };
      const existing = next.created_at ?? [];

      const filtered = existing.filter((f) => f.operator !== operator);

      if (value) {
        filtered.push({ operator, value });
      }

      if (filtered.length) {
        next.created_at = filtered;
      } else {
        delete next.created_at;
      }

      return next;
    });
  };

  const filters: AllowedFilter[] = [
    {
      key: "status",
      operators: ["in"],
      type: "multi-select",
      label: "Status",
      options: allStatuses,
    },
    {
      key: "total_amount",
      label: "Amount",
      operators: ["eq", "lte", "gte"],
      type: "number",
    },
    {
      key: "created_at",
      label: "Created At",
      operators: ["eq", "lte", "gte"],
      type: "date",
      setDate: setDate,
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
      <Toolbar className="flex items-center !justify-start !px-[1px] !gap-2 !my-3 !border-0 bg-white">
        <Box sx={{ position: "relative", width: "20%", flexShrink: 0 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 bg-white h-11 w-full"
            value={searchValue}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </Box>

        <Box sx={{ width: "28%", flexShrink: 0 }}>
          <MultiSelectDropdown
            allItems={allStatuses || []}
            selectedItems={selectedStatuses}
            toggleItem={toggleStatus}
            deselectAll={deselectAllStatus}
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

        <Button
          variant="outline"
          onClick={() => setFilterModalOpen(true)}
          className="text-muted-foreground h-11 w-[10%] max-w-[48px] p-3"
        >
          {hasFilters && (
            <Badge
              color="error"
              variant="dot"
              className="relative -top-4 -right-7"
              overlap="circular"
            ></Badge>
          )}
          <Filter className="h-8 w-8" />
        </Button>
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

export default CustomReportsToolbar;
