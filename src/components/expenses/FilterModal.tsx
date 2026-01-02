import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterMap, FilterValue, Operator } from "@/pages/MyExpensesPage";
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

type FilterType = "text" | "number" | "select" | "multi-select" | "date";

export interface AllowedFilter {
  key: string;
  label: string;
  operators: Operator[];
  type: FilterType;
  options?: string[];
}

interface FilterRow {
  id: string;
  filterKey?: string;
  value?: FilterValue;
  operator?: string;
}

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: FilterMap;
  setQuery: any;
  allowedFilters: AllowedFilter[];
}

const hydrateRowsFromQuery = (query: FilterMap): FilterRow[] => {
  const rows: FilterRow[] = [];
  console.log(query);
  Object.entries(query).forEach(([key, filters]) => {
    filters.forEach((f) => {
      rows.push({
        id: crypto.randomUUID(),
        filterKey: key,
        value: f.value,
        operator: f.operator,
      });
    });
  });

  return rows.length ? rows : [{ id: crypto.randomUUID() }];
};

const FilterModal: React.FC<FilterDialogProps> = ({
  open,
  onOpenChange,
  query,
  setQuery,
  allowedFilters,
}) => {
  const [rows, setRows] = useState<FilterRow[]>([]);
  useEffect(() => {
    if (!open) return;
    setRows(hydrateRowsFromQuery(query));
  }, [open, query]);

  const addRow = () => {
    setRows((prev) => [...prev, { id: crypto.randomUUID() }]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, updates: Partial<FilterRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        // when filterKey changes → auto pick first operator
        if (updates.filterKey) {
          const filter = allowedFilters.find(
            (f) => f.key === updates.filterKey
          );

          return {
            ...r,
            filterKey: updates.filterKey,
            operator: filter?.operators[0],
            value: undefined,
          };
        }

        return { ...r, ...updates };
      })
    );
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

  const handleApply = () => {
    setQuery((prev: any) => {
      const next: FilterMap = { ...prev };

      // 🔥 remove modal-controlled filters first
      allowedFilters.forEach((f) => {
        delete next[f.key];
      });

      rows.forEach((row) => {
        if (!row.filterKey) return;

        if (
          row.value === undefined ||
          (Array.isArray(row.value) && row.value.length === 0)
        ) {
          return;
        }

        const operator: Operator = row.operator as Operator;

        if (!next[row.filterKey]) {
          next[row.filterKey] = [];
        }

        next[row.filterKey].push({
          operator,
          value: row.value,
        });
      });

      return next;
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[60vh] overflow-auto w-full [&>button[aria-label='Close']]:hidden">
        <DialogTitle className="hidden">
            Apply Filters
        </DialogTitle>
        <div className="flex flex-col space-y-4">
          <div className="text-xl font-semibold">Apply Filters</div>
          <div className="space-y-4 flex-1">
            {rows.map((row) => {
              const filter = allowedFilters.find(
                (f) => f.key === row.filterKey
              );
              const selectedFilter = allowedFilters.find(
                (f) => f.key === row.filterKey
              );
              return (
                <div key={row.id} className="grid grid-cols-12 gap-2">
                  <div className="col-span-3">
                    <Select
                      value={row.filterKey ?? ""}
                      onValueChange={(value) =>
                        updateRow(row.id, {
                          filterKey: value || undefined,
                          value: undefined,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select filter">
                          {selectedFilter?.label ?? "Select filter"}
                        </SelectValue>
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
                  <div className="col-span-2">
                    {(
                      <Select
                        value={row.operator ?? ""}
                        onValueChange={(value) =>
                          updateRow(row.id, {
                            operator: value as Operator,
                          })
                        }
                        disabled={!filter}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Operator">
                            {row.operator?.toUpperCase() ?? "Operator"}
                          </SelectValue>
                        </SelectTrigger>

                        <SelectContent>
                          {filter?.operators.map((op) => (
                            <SelectItem key={op} value={op}>
                              {op.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="col-span-6">

                    {!filter && (
                        <Input
                        className="w-full"
                        value={""}
                        placeholder="Search"
                        disabled
                      />
                    )}

                    {/* Value input */}
                    {filter?.type === "text" && (
                      <Input
                        className="w-full"
                        value={(row.value as string) ?? ""}
                        placeholder="Search"
                        onChange={(e) =>
                          updateRow(row.id, { value: e.target.value })
                        }
                      />
                    )}

                    {filter?.type === "number" && (
                      <Input
                        type="number"
                        className="w-full"
                        value={(row.value as number) ?? ""}
                        placeholder="Enter value"
                        onChange={(e) =>
                          updateRow(row.id, { value: Number(e.target.value) })
                        }
                      />
                    )}

                    {filter?.type === "select" && (
                      <Select
                        value={(row.value as string) ?? ""}
                        onValueChange={(value) =>
                          updateRow(row.id, { value: value || undefined })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
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

                    {filter?.type === "date" && (
                      <Input
                        type="date"
                        className="w-full"
                        value={(row.value as string) ?? ""}
                        placeholder="Select date"
                        onChange={(e) =>
                          updateRow(row.id, { value: e.target.value })
                        }
                      />
                    )}

                    {filter?.type === "multi-select" && (
                      <MultiSelectDropdown
                        selectedItems={(row?.value as string[]) || []}
                        allItems={filter?.options || []}
                        toggleItem={(item: any) =>
                          toggleMultiValue(row.id, item)
                        }
                      />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    className="col-span-1 h-11"
                    size="sm"
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash className="text-muted-foregorund h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            <Button variant="outline" size="sm" onClick={addRow}>
              + Add filter
            </Button>
          </div>
          <div className="flex items-center justify-end gap-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilterModal;
