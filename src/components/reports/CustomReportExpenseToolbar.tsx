import { Badge, Box } from "@mui/material";
import { Button } from "../ui/button";
import { Filter, Search } from "lucide-react";
import MultiSelectDropdown from "../shared/MultiSelectDropdown";
import { Input } from "../ui/input";
import { useEffect, useState } from "react";
import {
  GridToolbarProps,
  Toolbar,
  ToolbarPropsOverrides,
} from "@mui/x-data-grid";
import { FilterMap, getFilterValue } from "@/pages/MyExpensesPage";
import DateRangePicker from "../shared/DateRangePicker";
import FilterModal, { AllowedFilter } from "../expenses/FilterModal";
import { useReportsStore } from "@/store/reportsStore";
import { getTemplates, Template } from "@/services/admin/templates";
import { Entity, getEntities } from "@/services/admin/entities";

export interface CustomExpenseToolbarProps {
  allCategories: string[];
}

type TemplateEntity = NonNullable<Template["entities"]>[0];

const getEntityId = (entity: TemplateEntity): string => {
  return entity?.entity_id || entity?.id || "";
};

type Props = GridToolbarProps &
  ToolbarPropsOverrides &
  Partial<CustomExpenseToolbarProps>;

function CustomReportExpenseToolbar({ allCategories }: Props) {
  const { expenseQuery, setExpenseQuery } = useReportsStore();

  const hasFilters = Object.keys(expenseQuery).length > 0;

  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const [entityFilters, setEntityFIlters] = useState<any[]>([]);

  const searchValue = (getFilterValue(expenseQuery, "q", "eq") as string) ?? "";
  const selectedCategories =
    (getFilterValue(expenseQuery, "category", "in") as string[]) ?? [];

  const dateFrom =
    (getFilterValue(expenseQuery, "expense_date", "gte") as string) ??
    undefined;

  const dateTo =
    (getFilterValue(expenseQuery, "expense_date", "lte") as string) ??
    undefined;

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
    ...entityFilters,
  ];

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

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const [templatesRes, entitiesRes] = await Promise.all([
          getTemplates(),
          getEntities(),
        ]);

        const expenseTemplate = Array.isArray(templatesRes)
          ? templatesRes.find((t) => t.module_type === "expense")
          : null;

        const selectEntity = expenseTemplate?.entities?.filter(
          (ent) => ent.field_type === "SELECT"
        );

        const entityMap: Record<
          string,
          Array<{ id: string; label: string }>
        > = {};
        entitiesRes.forEach((ent: Entity) => {
          if (ent.id && Array.isArray(ent.attributes)) {
            entityMap[ent.id] = ent.attributes.map((attr) => ({
              id: attr.id,
              label: attr.display_value ?? attr.value ?? "—",
            }));
          }
        });

        const mappedOptions: Record<
          string,
          Array<{ id: string; label: string }>
        > = {};
        expenseTemplate?.entities?.forEach((entity) => {
          const entityId = getEntityId(entity);
          if (entityId) {
            mappedOptions[entityId] = entityMap[entityId] || [];
          }
        });

        const filters: any[] = [];
        selectEntity?.forEach((ent) => {
          const filter = {
            key: ent.display_name,
            operators: ["eq"],
            type: "select",
            label: ent.display_name,
            options: mappedOptions[ent.entity_id || 0],
          };
          filters.push(filter);
        });
        setEntityFIlters(filters);
      } catch (error) {
        console.error("Failed to load templates:", error);
      }
    };

    loadTemplates();
  }, []);

  return (
    <>
      <Toolbar className="flex items-center !justify-start !px-[1px] !gap-2 !my-3 !border-0 bg-white">
        <Box sx={{ position: "relative", width: "20%", flexShrink: 0 }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-9 bg-white w-full"
            value={searchValue}
            onChange={(e) => updateSearch(e.target.value)}
          />
        </Box>

        <Box sx={{ width: "28%", flexShrink: 0 }}>
          <MultiSelectDropdown
            allItems={allCategories || []}
            selectedItems={selectedCategories}
            placeholder="Select categories"
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
        query={expenseQuery || {}}
        setQuery={setExpenseQuery}
        allowedFilters={filters}
      />
    </>
  );
}

export default CustomReportExpenseToolbar;
