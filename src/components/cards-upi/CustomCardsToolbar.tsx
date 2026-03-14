import { Badge, Box } from "@mui/material";
import { Button } from "../ui/button";
import { Filter, Plus, Search } from "lucide-react";
import MultiSelectDropdown from "../shared/MultiSelectDropdown";
import { Input } from "../ui/input";
import { useState } from "react";
import {
  GridToolbarProps,
  Toolbar,
  ToolbarPropsOverrides,
} from "@mui/x-data-grid";
import { FilterMap, getFilterValue } from "@/pages/MyExpensesPage";
import FilterModal, { AllowedFilter } from "../expenses/FilterModal";
import { useCardsStore } from "@/store/cardsStore";
import InitiateKYCDialog from "./InitiateKYCDialog";

export interface CustomExpenseToolbarProps {
  allStatuses: string[];
  handleRefresh: () => void;
}

type Props = GridToolbarProps &
  ToolbarPropsOverrides &
  Partial<CustomExpenseToolbarProps>;

function CustomCardsToolbar({ allStatuses }: Props) {
  const { query, setQuery } = useCardsStore();

  const hasFilters = Object.keys(query).length > 0;

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const searchValue = (getFilterValue(query, "q", "eq") as string) ?? "";
  const selectedStatuses =
    (getFilterValue(query, "status", "in") as string[]) ?? [];

  const selectedInstruments =
    (getFilterValue(query, "instrument", "in") as string[]) ?? [];

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

  const toggleInstrument = (status: string) => {
    const next = selectedInstruments.includes(status)
      ? selectedInstruments.filter((s) => s !== status)
      : [...selectedInstruments, status];

    setQuery((prev) => {
      const nextQuery = { ...prev };
      if (!next.length) {
        delete nextQuery.instrument;
      } else {
        nextQuery.instrument = [{ operator: "in", value: next }];
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

  const deselectAllInstruments = () => {
    setQuery((prev) => {
      const { instrument, ...rest } = prev;
      return rest;
    });
  };

  return (
    <>
      <Toolbar className="flex items-center !justify-start !px-[1px] !gap-2 !my-3 !border-0 bg-white">
        <Box sx={{ position: "relative", width: "15%", flexShrink: 0 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 bg-white h-11 w-full"
            value={searchValue}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </Box>

        <Box sx={{ width: "20%", flexShrink: 0 }}>
          <MultiSelectDropdown
            allItems={allStatuses || []}
            selectedItems={selectedStatuses}
            toggleItem={toggleStatus}
            deselectAll={deselectAllStatus}
          />
        </Box>

        <Box sx={{ width: "20%", flexShrink: 0 }}>
          <MultiSelectDropdown
            allItems={["CARD", "UPI"]}
            selectedItems={selectedInstruments}
            toggleItem={toggleInstrument}
            deselectAll={deselectAllInstruments}
            placeholder="Select Instrument"
          />
        </Box>

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

        <Button
          onClick={() => {
            setKycDialogOpen(true);
          }}
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
            Issue Cards/UPI
          </span>
        </Button>
      </Toolbar>

      <FilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        query={query || {}}
        setQuery={setQuery}
        allowedFilters={filters}
      />
      <InitiateKYCDialog
        open={kycDialogOpen}
        onOpenChange={setKycDialogOpen}
        handleSubmit={(payload) => console.log(payload)}
      />
    </>
  );
}

export default CustomCardsToolbar;
