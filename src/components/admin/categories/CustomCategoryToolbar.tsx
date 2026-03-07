import { Box } from "@mui/material";
import { Search } from "lucide-react";
import { Toolbar } from "@mui/x-data-grid";
import { FilterMap, getFilterValue } from "@/pages/MyExpensesPage";
import { Input } from "@/components/ui/input";
import { useCaetgoryStore } from "@/store/admin/categoryStore";

function CustomCategoryToolbar() {
  const { query, setQuery } = useCaetgoryStore();

  const searchValue =
    (getFilterValue(query, "name", "ilike") as string) ?? "";

  const updateSearch = (value: string) => {
    setQuery((prev: FilterMap) => {
      const next: FilterMap = { ...prev };

      if (!value) {
        delete next.name;
      } else {
        next.name = [{ operator: "ilike", value: `${value}` }];
      }

      return next;
    });
  };

  return (
    <Toolbar className="flex items-center !justify-start !px-[1px] !gap-2 !my-3 !border-0 bg-white">
      <Box sx={{ position: "relative", width: "20%", flexShrink: 0 }}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search"
          className="pl-9 bg-white h-10 w-full"
          value={searchValue}
          onChange={(e) => updateSearch(e.target.value)}
        />
      </Box>
    </Toolbar>
  );
}

export default CustomCategoryToolbar;
