import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Autocomplete, TextField } from "@mui/material";
import { itemsCodeService, ItemData } from "@/services/items/itemsCodeService";

export type InvoiceLineRow = {
  id: number;
  invoiceLineItemId?: string;
  itemDescription: string;
  quantity: string;
  rate: string;
  hsnCode: string;
  igst: string;
  cgst: string;
  sgst: string;
  utgst: string;
  netAmount: string;
};

interface LineItemsTableProps {
  rows: InvoiceLineRow[];
  isLoading: boolean;
  isApprovalMode: boolean;
  invoiceStatus?: string | null;
  onRowUpdate: (rowId: number, field: keyof Omit<InvoiceLineRow, "id">, value: string) => void;
  onAddRow: () => void;
  isFieldChanged: (rowId: number, field: keyof Omit<InvoiceLineRow, "id">, currentValue: string) => boolean;
  validationErrors?: Record<number, Record<string, boolean>>;
  unmatchedHsnRows?: Set<number>;
  onValidationErrorChange?: (rowId: number, field: string, hasError: boolean) => void;
  onDeleteRows?: (rowIds: number[]) => void;
}

export function LineItemsTable({
  rows,
  isLoading,
  isApprovalMode,
  invoiceStatus,
  onRowUpdate,
  onAddRow,
  isFieldChanged,
  validationErrors = {},
  unmatchedHsnRows = new Set(),
  onValidationErrorChange,
  onDeleteRows,
}: LineItemsTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const hsnSearchTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});

  const [itemSearchResults, setItemSearchResults] = useState<ItemData[]>([]);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const itemSearchTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});

  // Default options for dropdowns (2-3 items)
  const [defaultItems, setDefaultItems] = useState<ItemData[]>([]);

  useEffect(() => {
    if (isApprovalMode) {
      return;
    }

    if (!invoiceStatus) {
      return;
    }

    const processedStatuses = ["PENDING_APPROVAL", "APPROVED", "REJECTED"];
    const isProcessedInvoice = processedStatuses.includes(invoiceStatus);
    
    if (isProcessedInvoice) {
      return;
    }

    const fetchDefaults = async () => {
      try {
        const itemsResponse = await itemsCodeService.getItems(20, 0);

        const items = itemsResponse?.data || [];
        setDefaultItems(items.slice(0, 3));
      } catch (error) {
        console.error("Error fetching default options:", error);
      }
    };

    fetchDefaults();
  }, [isApprovalMode, invoiceStatus]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(itemSearchTimeoutRef.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
      Object.values(hsnSearchTimeoutRef.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const searchItemsByDescription = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.trim().length < 3) {
      setItemSearchResults([]);
      return;
    }

    setItemSearchLoading(true);
    try {
      const response = await itemsCodeService.searchItems(searchTerm, 20, 0);
      setItemSearchResults(response?.data || []);
    } catch (error) {
      console.error("Error searching items:", error);
      setItemSearchResults([]);
    } finally {
      setItemSearchLoading(false);
    }
  }, []);

  const searchItemsByHsn = useCallback(async (hsnCode: string, rowId: number) => {
    if (!hsnCode.trim()) {
      return null;
    }

    try {
      const response = await itemsCodeService.searchItemsByHsn(hsnCode.trim(), 10, 0);
      const items = response?.data || [];
      
      const exactMatch = items.find(
        (item) => item.hsn_sac_code?.trim().toUpperCase() === hsnCode.trim().toUpperCase()
      );
      
      if (exactMatch) {
        const currentRow = rows.find(r => r.id === rowId);
        if (currentRow) {
          onRowUpdate(rowId, "itemDescription", exactMatch.description);
          if (onValidationErrorChange) {
            onValidationErrorChange(rowId, "itemDescription", false);
          }
        }
        
        // GST code auto-population removed
        
        return exactMatch;
      }
      
      return null;
    } catch (error) {
      console.error("Error searching items by HSN:", error);
      return null;
    }
  }, [rows, onRowUpdate, onValidationErrorChange]);

  const handleItemDescriptionChange = useCallback((rowId: number, newValue: string) => {
    onRowUpdate(rowId, "itemDescription", newValue);
    if (itemSearchTimeoutRef.current[rowId]) {
      clearTimeout(itemSearchTimeoutRef.current[rowId]);
    }
    itemSearchTimeoutRef.current[rowId] = setTimeout(() => {
      if (newValue.trim() && newValue.trim().length >= 3) {
        searchItemsByDescription(newValue);
      } else {
        setItemSearchResults([]);
      }
  }, 300);
  }, [onRowUpdate, searchItemsByDescription]);

  const handleSelectRow = (rowId: number, checked: boolean) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(rowId);
      } else {
        newSet.delete(rowId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(rows.map((row) => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleDeleteSelected = () => {
    if (onDeleteRows && selectedRows.size > 0) {
      onDeleteRows(Array.from(selectedRows));
      setSelectedRows(new Set());
    }
  };

  const isAllSelected = rows.length > 0 && selectedRows.size === rows.length;

  const tableHeaderStyle: React.CSSProperties = {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: "12px",
    lineHeight: "100%",
    letterSpacing: "0%",
    textTransform: "uppercase",
    color: "#8D94A2",
  };

  return (
    <div className="border-t bg-white">
      <div className="py-6 pr-6 pl-0">
        {selectedRows.size > 0 && !isApprovalMode && (
          <div className="flex items-center justify-end gap-2 mb-4 px-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedRows.size})
            </Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 w-12 py-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={isApprovalMode || rows.length === 0}
                />
              </TableHead>
              <TableHead 
                className="px-4 min-w-[350px] py-2"
                style={tableHeaderStyle}
              >
                ITEM DESCRIPTION
              </TableHead>
              <TableHead 
                className="px-4 min-w-[150px] py-2"
                style={tableHeaderStyle}
              >
                QTY
              </TableHead>
              <TableHead 
                className="px-4 min-w-[150px] py-2"
                style={tableHeaderStyle}
              >
                RATE
              </TableHead>
              <TableHead 
                className="px-4 min-w-[150px] py-2"
                style={tableHeaderStyle}
              >
                HSN CODE
              </TableHead>
              <TableHead 
                className="px-4 min-w-[130px] py-2"
                style={tableHeaderStyle}
              >
                IGST
              </TableHead>
              <TableHead 
                className="px-4 min-w-[130px] py-2"
                style={tableHeaderStyle}
              >
                CGST
              </TableHead>
              <TableHead 
                className="px-4 min-w-[130px] py-2"
                style={tableHeaderStyle}
              >
                SGST
              </TableHead>
              <TableHead 
                className="px-4 min-w-[130px] py-2"
                style={tableHeaderStyle}
              >
                UTGST
              </TableHead>
              <TableHead 
                className="pl-4 pr-6 text-right py-2"
                style={tableHeaderStyle}
              >
                NET AMOUNT
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="px-4 py-10">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing invoice…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="px-4 py-10">
                  <div className="text-center text-sm text-gray-500">
                    No line items yet. Upload an invoice or click "Add Row".
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="px-4 py-1 w-12">
                    <Checkbox
                      checked={selectedRows.has(row.id)}
                      onCheckedChange={(checked) => handleSelectRow(row.id, checked as boolean)}
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[350px]">
                    <div>
                      <Autocomplete
                        freeSolo
                        options={itemSearchResults.length > 0 ? itemSearchResults : defaultItems}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.description}
                        value={(itemSearchResults.length > 0 ? itemSearchResults : defaultItems).find(item => item.description === row.itemDescription) || row.itemDescription || null}
                        onInputChange={(_event, newValue) => {
                          handleItemDescriptionChange(row.id, newValue);
                          if (onValidationErrorChange && newValue.trim()) {
                            onValidationErrorChange(row.id, "itemDescription", false);
                          }
                        }}
                      onChange={(_event, newValue) => {
                        if (newValue && typeof newValue === 'object') {
                          // Item selected from dropdown
                          onRowUpdate(row.id, "itemDescription", newValue.description);
                          if (onValidationErrorChange && newValue.description.trim()) {
                            onValidationErrorChange(row.id, "itemDescription", false);
                          }
                          if (newValue.hsn_sac_code) {
                            onRowUpdate(row.id, "hsnCode", newValue.hsn_sac_code);
                          }
                          // GST code auto-population removed
                        } else if (typeof newValue === 'string') {
                          // User typed a custom description
                          onRowUpdate(row.id, "itemDescription", newValue);
                          if (onValidationErrorChange && newValue.trim()) {
                            onValidationErrorChange(row.id, "itemDescription", false);
                          }
                        }
                      }}
                      loading={itemSearchLoading}
                      disabled={isApprovalMode}
                      sx={{ 
                        width: '100%', 
                        minWidth: '350px',
                        '& .MuiAutocomplete-root': {
                          padding: 0,
                        },
                        '& .MuiAutocomplete-inputRoot': {
                          padding: '0 !important',
                        },
                        '& .MuiAutocomplete-popper': {
                          zIndex: 1300,
                        },
                        '& .MuiPaper-root': {
                          borderRadius: '6px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          border: '1px solid #e5e7eb',
                          marginTop: '6px',
                          overflow: 'hidden',
                          width: 'auto',
                          minWidth: '300px',
                          maxWidth: '450px',
                        },
                        '& .MuiAutocomplete-listbox': {
                          padding: '4px',
                          maxHeight: '200px !important',
                          width: '100%',
                          overflowY: 'auto',
                          '& li': {
                            padding: '8px 12px',
                            minHeight: 'auto',
                            '&:not(:last-child)': {
                              borderBottom: '1px solid #f3f4f6',
                              marginBottom: '2px',
                              paddingBottom: '8px',
                            },
                          },
                        },
                      }}
                      slotProps={{
                        popper: {
                          placement: 'bottom-start',
                          modifiers: [
                            {
                              name: 'offset',
                              options: {
                                offset: [0, 6],
                              },
                            },
                            {
                              name: 'preventOverflow',
                              enabled: true,
                              options: {
                                padding: 8,
                              },
                            },
                            {
                              name: 'flip',
                              enabled: false,
                            },
                          ],
                        },
                        paper: {
                          sx: {
                            width: 'auto',
                            minWidth: '300px',
                            maxWidth: '450px',
                          },
                        },
                        listbox: {
                          sx: {
                            maxHeight: '200px',
                            padding: '4px',
                            '& li': {
                              padding: '8px 12px',
                              minHeight: 'auto',
                              '&:not(:last-child)': {
                                borderBottom: '1px solid #f3f4f6',
                                marginBottom: '2px',
                                paddingBottom: '8px',
                              },
                            },
                          },
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select or enter item description"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '32px',
                              fontSize: '14px',
                              backgroundColor: unmatchedHsnRows.has(row.id) ? '#fef3c7' : 'transparent',
                              padding: '0 !important',
                              '& fieldset': {
                                border: validationErrors[row.id]?.itemDescription ? '1px solid #EF4444' : 'none',
                              },
                              '&:hover fieldset': {
                                border: validationErrors[row.id]?.itemDescription ? '1px solid #EF4444' : 'none',
                              },
                              '&.Mui-focused fieldset': {
                                border: validationErrors[row.id]?.itemDescription ? '1px solid #EF4444' : 'none',
                                boxShadow: 'none',
                              },
                            },
                            '& .MuiInputBase-input': {
                              padding: '4px 0px !important',
                              paddingRight: '28px !important',
                            },
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <li 
                          {...props} 
                          key={option.id}
                          className="px-3 py-2 cursor-pointer transition-all duration-200 hover:bg-gray-50 active:bg-gray-100 rounded-md"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-[13px] text-gray-900">
                              {option.description}
                            </span>
                            {option.item_code && (
                              <span className="text-xs text-gray-600">
                                Code: {option.item_code}
                              </span>
                            )}
                          </div>
                        </li>
                      )}
                      noOptionsText={
                        <div className="px-4 py-6 text-center">
                          <span className="text-sm text-gray-500">
                            {itemSearchLoading
                              ? "Searching..."
                              : (row.itemDescription || "").trim().length >= 3
                              ? "No items found"
                              : "Type at least 3 characters to search..."}
                          </span>
                        </div>
                      }
                    />
                    {validationErrors[row.id]?.itemDescription && (
                      <p className="text-red-500 text-xs mt-0.5">Required field</p>
                    )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[150px]">
                    <div>
                      <Input
                        value={row.quantity ? parseFloat(row.quantity).toString() : ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d+$/.test(value)) {
                            onRowUpdate(row.id, "quantity", value);
                            if (onValidationErrorChange && value.trim() && parseFloat(value) > 0) {
                              onValidationErrorChange(row.id, "quantity", false);
                            }
                          }
                        }}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 ${
                          isFieldChanged(row.id, "quantity", row.quantity) ? "bg-yellow-100" : ""
                        } ${validationErrors[row.id]?.quantity ? '!border-red-500 border' : ''}`}
                        placeholder="Qty"
                        disabled={isApprovalMode}
                      />
                      {validationErrors[row.id]?.quantity && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[150px]">
                    <div>
                      <Input
                        value={row.rate}
                        onChange={(e) => {
                          onRowUpdate(row.id, "rate", e.target.value);
                          if (onValidationErrorChange && e.target.value.trim() && parseFloat(e.target.value) > 0) {
                            onValidationErrorChange(row.id, "rate", false);
                          }
                        }}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 ${
                          isFieldChanged(row.id, "rate", row.rate) ? "bg-yellow-100" : ""
                        } ${validationErrors[row.id]?.rate ? '!border-red-500 border' : ''}`}
                        placeholder="₹ 0.00"
                        disabled={isApprovalMode}
                      />
                      {validationErrors[row.id]?.rate && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[150px]">
                    <div>
                      <Input
                        value={row.hsnCode}
                        onChange={(e) => {
                          const newHsnCode = e.target.value;
                          onRowUpdate(row.id, "hsnCode", newHsnCode);
                          
                          if (hsnSearchTimeoutRef.current[row.id]) {
                            clearTimeout(hsnSearchTimeoutRef.current[row.id]);
                          }
                          
                          hsnSearchTimeoutRef.current[row.id] = setTimeout(() => {
                            if (newHsnCode.trim()) {
                              searchItemsByHsn(newHsnCode, row.id);
                            }
                          }, 500);
                        }}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 ${
                          isFieldChanged(row.id, "hsnCode", row.hsnCode) ? "bg-yellow-100" : ""
                        }`}
                        placeholder="HSN Code"
                        disabled={isApprovalMode}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[130px]">
                    <div>
                      <Input
                        value={row.igst}
                        onChange={(e) => {
                          onRowUpdate(row.id, "igst", e.target.value);
                          if (onValidationErrorChange && e.target.value.trim() && parseFloat(e.target.value) >= 0) {
                            onValidationErrorChange(row.id, "igst", false);
                          }
                        }}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 ${
                          isFieldChanged(row.id, "igst", row.igst) ? "bg-yellow-100" : ""
                        } ${validationErrors[row.id]?.igst ? '!border-red-500 border' : ''}`}
                        placeholder="₹ 0.00"
                        disabled={isApprovalMode}
                      />
                      {validationErrors[row.id]?.igst && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[130px]">
                    <div>
                      <Input
                        value={row.cgst}
                        onChange={(e) => {
                          onRowUpdate(row.id, "cgst", e.target.value);
                          if (onValidationErrorChange && e.target.value.trim() && parseFloat(e.target.value) >= 0) {
                            onValidationErrorChange(row.id, "cgst", false);
                          }
                        }}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 ${
                          isFieldChanged(row.id, "cgst", row.cgst) ? "bg-yellow-100" : ""
                        } ${validationErrors[row.id]?.cgst ? '!border-red-500 border' : ''}`}
                        placeholder="₹ 0.00"
                        disabled={isApprovalMode}
                      />
                      {validationErrors[row.id]?.cgst && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[130px]">
                    <div>
                      <Input
                        value={row.sgst}
                        onChange={(e) => {
                          onRowUpdate(row.id, "sgst", e.target.value);
                          if (onValidationErrorChange && e.target.value.trim() && parseFloat(e.target.value) >= 0) {
                            onValidationErrorChange(row.id, "sgst", false);
                          }
                        }}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 ${
                          isFieldChanged(row.id, "sgst", row.sgst) ? "bg-yellow-100" : ""
                        } ${validationErrors[row.id]?.sgst ? '!border-red-500 border' : ''}`}
                        placeholder="₹ 0.00"
                        disabled={isApprovalMode}
                      />
                      {validationErrors[row.id]?.sgst && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[130px]">
                    <div>
                      <Input
                        value={row.utgst}
                        onChange={(e) => {
                          onRowUpdate(row.id, "utgst", e.target.value);
                          if (onValidationErrorChange && e.target.value.trim() && parseFloat(e.target.value) >= 0) {
                            onValidationErrorChange(row.id, "utgst", false);
                          }
                        }}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 ${
                          isFieldChanged(row.id, "utgst", row.utgst) ? "bg-yellow-100" : ""
                        } ${validationErrors[row.id]?.utgst ? '!border-red-500 border' : ''}`}
                        placeholder="₹ 0.00"
                        disabled={isApprovalMode}
                      />
                      {validationErrors[row.id]?.utgst && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="pl-4 pr-6 py-1">
                    <div className="flex justify-end">
                      <div>
                        <Input
                          value={row.netAmount}
                          onChange={(e) => {
                            onRowUpdate(row.id, "netAmount", e.target.value);
                            if (onValidationErrorChange && e.target.value.trim() && parseFloat(e.target.value) > 0) {
                              onValidationErrorChange(row.id, "netAmount", false);
                            }
                          }}
                          className={`h-8 w-[140px] border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 text-right ${
                            isFieldChanged(row.id, "netAmount", row.netAmount) ? "bg-yellow-100" : ""
                          } ${validationErrors[row.id]?.netAmount ? '!border-red-500 border' : ''}`}
                          placeholder="₹ 0.00"
                          disabled={isApprovalMode}
                        />
                        {validationErrors[row.id]?.netAmount && (
                          <p className="text-red-500 text-xs mt-0.5 text-right">Required field</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!isApprovalMode && (
          <div className="mt-4">
            <button
              onClick={onAddRow}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Row
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

