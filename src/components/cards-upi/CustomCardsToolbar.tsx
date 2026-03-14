import { Box } from "@mui/material";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import MultiSelectDropdown from "../shared/MultiSelectDropdown";
import { useState } from "react";
import {
  GridToolbarProps,
  Toolbar,
  ToolbarPropsOverrides,
} from "@mui/x-data-grid";
import { getFilterValue } from "@/pages/MyExpensesPage";
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
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  // const searchValue = (getFilterValue(query, "q", "eq") as string) ?? "";

  const selectedStatuses =
    (getFilterValue(query, "full_kyc_state", "in") as string[]) ?? [];

  // const updateSearch = (value: string) => {
  //   setQuery((prev: FilterMap) => {
  //     const next: FilterMap = { ...prev };
  //     if (!value) {
  //       delete next.q;
  //     } else {
  //       next.q = [{ operator: "eq", value }];
  //     }
  //     return next;
  //   });
  // };

  const toggleStatus = (status: string) => {
    const next = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];

    setQuery((prev) => {
      const nextQuery = { ...prev };
      if (!next.length) {
        delete nextQuery.full_kyc_state;
      } else {
        nextQuery.full_kyc_state = [{ operator: "in", value: next }];
      }
      return nextQuery;
    });
  };

  const deselectAllStatus = () => {
    setQuery((prev) => {
      const { full_kyc_state, ...rest } = prev;
      return rest;
    });
  };

  return (
    <>
      <Toolbar className="flex items-center !justify-start !px-[1px] !gap-2 !my-3 !border-0 bg-white">
        {/* <Box sx={{ position: "relative", width: "25%", flexShrink: 0 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 bg-white h-11 w-full"
            value={searchValue}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </Box> */}

        <Box sx={{ width: "30%", flexShrink: 0 }}>
          <MultiSelectDropdown
            allItems={allStatuses || []}
            selectedItems={selectedStatuses}
            toggleItem={toggleStatus}
            deselectAll={deselectAllStatus}
          />
        </Box>

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

      {/* <FilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        query={query || {}}
        setQuery={setQuery}
        allowedFilters={filters}
      /> */}
      <InitiateKYCDialog
        open={kycDialogOpen}
        onOpenChange={setKycDialogOpen}
        handleSubmit={(payload) => console.log(payload)}
      />
    </>
  );
}

export default CustomCardsToolbar;
