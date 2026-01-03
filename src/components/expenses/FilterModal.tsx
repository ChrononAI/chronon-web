import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FilterMap,
  FilterValue,
  getFilterValue,
  Operator,
} from "@/pages/MyExpensesPage";
import { useEffect, useState } from "react";
import MultiSelectDropdown from "../shared/MultiSelectDropdown";
import { Trash } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import DateRangePicker from "../shared/DateRangePicker";

type FilterType = "text" | "number" | "select" | "multi-select" | "date";

export interface AllowedFilter {
  key: string;
  label: string;
  operators: Operator[];
  type: FilterType;
  options?: string[];
  setDate?: (operator: "gte" | "lte", value?: string) => void;
}
interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: FilterMap;
  setQuery: any;
  allowedFilters: AllowedFilter[];
}
interface FilterRow {
  id: string;
  filterKey: string;
  value?: any;
}

const hydrateRowsFromQuery = (
  query: FilterMap,
  allowedFilters: AllowedFilter[]
): FilterRow[] => {
  return Object.keys(query).map((key) => {
    const filter = allowedFilters.find((f) => f.key === key);
    const values = query[key];

    if (!filter) {
      return { id: crypto.randomUUID(), filterKey: key };
    }

    if (filter.type === "date" || filter.type === "number") {
      return {
        id: crypto.randomUUID(),
        filterKey: key,
        value: {
          gte: values.find((v) => v.operator === "gte")?.value,
          lte: values.find((v) => v.operator === "lte")?.value,
        },
      };
    }

    return {
      id: crypto.randomUUID(),
      filterKey: key,
      value: values[0]?.value,
    };
  });
};

const FilterModal: React.FC<FilterDialogProps> = ({
  open,
  onOpenChange,
  query,
  setQuery,
  allowedFilters,
}) => {
  const [rows, setRows] = useState<FilterRow[]>([]);

  /* -------------------------------------------
   * HYDRATE
   * ----------------------------------------- */
  useEffect(() => {
    if (!open) return;
    setRows(hydrateRowsFromQuery(query, allowedFilters));
  }, [open, query, allowedFilters]);

  /* -------------------------------------------
   * HELPERS
   * ----------------------------------------- */
  const updateRow = (id: string, updates: Partial<FilterRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), filterKey: "" }]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  /* -------------------------------------------
   * APPLY
   * ----------------------------------------- */
  const handleApply = () => {
    setQuery(() => {
      const next: FilterMap = {};

      rows.forEach((row) => {
        if (!row.filterKey) return;

        const filter = allowedFilters.find((f) => f.key === row.filterKey);
        if (!filter) return;

        // RANGE TYPES
        if (filter.type === "date" || filter.type === "number") {
          const arr = [];

          if (row.value?.gte !== undefined)
            arr.push({ operator: "gte", value: row.value.gte });

          if (row.value?.lte !== undefined)
            arr.push({ operator: "lte", value: row.value.lte });

          if (arr.length) next[row.filterKey] = arr;
          return;
        }

        // SINGLE VALUE TYPES
        if (row.value !== undefined && row.value !== "") {
          next[row.filterKey] = [
            {
              operator: filter.operators[0],
              value: row.value,
            },
          ];
        }
      });

      return next;
    });

    onOpenChange(false);
  };

  /* -------------------------------------------
   * UI
   * ----------------------------------------- */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[60vh] overflow-auto w-full [&>button[aria-label='Close']]:hidden">
        <div className="space-y-4">
          <div className="text-xl font-semibold">Apply Filters</div>

          {rows.map((row) => {
            const filter = allowedFilters.find(
              (f) => f.key === row.filterKey
            );

            return (
              <div key={row.id} className="grid grid-cols-12 gap-2">
                {/* FILTER SELECT */}
                <div className="col-span-4">
                  <Select
                    value={row.filterKey}
                    onValueChange={(value) =>
                      updateRow(row.id, { filterKey: value, value: undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select filter" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedFilters.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* VALUE */}
                <div className="col-span-7">
                  {filter?.type === "date" && (
                    <DateRangePicker
                      dateFrom={row.value?.gte}
                      dateTo={row.value?.lte}
                      setDate={(op, val) =>
                        updateRow(row.id, {
                          value: { ...row.value, [op]: val },
                        })
                      }
                    />
                  )}

                  {filter?.type === "number" && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={row.value?.gte ?? ""}
                        onChange={(e) =>
                          updateRow(row.id, {
                            value: {
                              ...row.value,
                              gte: Number(e.target.value),
                            },
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={row.value?.lte ?? ""}
                        onChange={(e) =>
                          updateRow(row.id, {
                            value: {
                              ...row.value,
                              lte: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  )}

                  {filter?.type === "text" && (
                    <Input
                      value={row.value ?? ""}
                      onChange={(e) =>
                        updateRow(row.id, { value: e.target.value })
                      }
                    />
                  )}

                  {filter?.type === "select" && (
                    <Select
                      value={row.value ?? ""}
                      onValueChange={(v) =>
                        updateRow(row.id, { value: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options?.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* REMOVE */}
                <Button
                  variant="ghost"
                  className="col-span-1"
                  onClick={() => removeRow(row.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <Button variant="outline" size="sm" onClick={addRow}>
            + Add filter
          </Button>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilterModal;

