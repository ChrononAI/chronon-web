import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldFilter, FilterMap, Operator } from "@/pages/MyExpensesPage";
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
import AmountRangePicker from "../shared/AmountRangePicker";

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
  delete query.q;
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

  const usedFilterKeys = rows.map((r) => r.filterKey).filter(Boolean);

  useEffect(() => {
    if (!open) return;
    setRows(hydrateRowsFromQuery(query, allowedFilters));
  }, [open, query, allowedFilters]);

  const updateRow = (id: string, updates: Partial<FilterRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: crypto.randomUUID(), filterKey: "" }]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      setRows([{ id: crypto.randomUUID(), filterKey: "" }]);
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const toggleMultiValue = (rowId: string, option: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const current = (row.value as string[]) ?? [];
        const next = current.includes(option)
          ? current.filter((v) => v !== option)
          : [...current, option];
        return { ...row, value: next };
      })
    );
  };
  const deselectAllStatus = () => {
    setQuery((prev: any) => {
      const { status, ...rest } = prev;
      return rest;
    });
  };

  const handleApply = () => {
    setQuery(() => {
      const next: FilterMap = {};

      rows.forEach((row) => {
        if (!row.filterKey) return;

        const filter = allowedFilters.find((f) => f.key === row.filterKey);
        if (!filter) return;

        // RANGE TYPES
        if (filter.type === "date" || filter.type === "number") {
          const arr: FieldFilter[] = [];

          if (row.value?.gte !== undefined) {
            arr.push({ operator: "gte", value: row.value.gte });
          }

          if (row.value?.lte !== undefined) {
            arr.push({ operator: "lte", value: row.value.lte });
          }

          if (arr.length) {
            next[row.filterKey] = arr;
          }
          return;
        }

        // SINGLE VALUE TYPES
        if (row.value !== undefined && row.value !== "") {
          next[row.filterKey] = [
            {
              operator: filter.operators[0] as Operator,
              value: row.value,
            },
          ];
        }
      });

      return next;
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[80vh] max-h-[80vh] overflow-auto w-full [&>button[aria-label='Close']]:hidden">
        <DialogTitle className="hidden" />
        <div className="space-y-4 flex flex-col h-full">
          <div className="text-xl font-semibold">Apply Filters</div>
          <div className="flex-1 overflow-auto space-y-6 p-1">
            {rows.length > 0 ? (
              rows.map((row) => {
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
                          updateRow(row.id, {
                            filterKey: value,
                            value: undefined,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select filter" />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedFilters.map((f) => {
                            const isUsed =
                              usedFilterKeys.includes(f.key) &&
                              f.key !== row.filterKey;
                            return (
                              <SelectItem
                                key={f.key}
                                value={f.key}
                                disabled={isUsed}
                              >
                                {f.label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* VALUE */}
                    <div className="col-span-7">
                      {filter?.type === "date" && (
                        <DateRangePicker
                          value={row.value}
                          onChange={(range) =>
                            updateRow(row.id, {
                              value: range,
                            })
                          }
                          className="w-full"
                        />
                      )}

                      {filter?.type === "number" && (
                        <AmountRangePicker
                          value={row.value}
                          onChange={(nextValue) =>
                            updateRow(row.id, { value: nextValue })
                          }
                        />
                      )}

                      {filter?.type === "text" && (
                        <Input
                          value={row.value ?? ""}
                          placeholder="Enter value"
                          onChange={(e) =>
                            updateRow(row.id, { value: e.target.value })
                          }
                        />
                      )}

                      {filter?.type === "select" && (
                        <Select
                          value={row.value ?? ""}
                          onValueChange={(v) => updateRow(row.id, { value: v })}
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

                      {filter?.type === "multi-select" && (
                        <MultiSelectDropdown
                          selectedItems={(row?.value as string[]) || []}
                          allItems={filter?.options || []}
                          toggleItem={(item: any) =>
                            toggleMultiValue(row.id, item)
                          }
                          deselectAll={deselectAllStatus}
                        />
                      )}
                    </div>

                    <Button
                      className="col-span-1 my-auto h-11 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                      onClick={() => removeRow(row.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="space-y-1 text-center">
                <p className="text-base font-medium">No filters applied</p>
                <p className="text-sm text-muted-foreground">
                  Add filters to narrow down your results
                </p>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={addRow}>
              + Add filter
            </Button>
          </div>
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
