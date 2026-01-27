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
import { Plus, Loader2 } from "lucide-react";
import { Autocomplete, TextField } from "@mui/material";
import { tdsService, TDSData } from "@/services/tdsService";
import { taxService, TaxData } from "@/services/taxService";
import { itemsCodeService, ItemData } from "@/services/items/itemsCodeService";

export type InvoiceLineRow = {
  id: number;
  invoiceLineItemId?: string;
  itemDescription: string;
  quantity: string;
  rate: string;
  tdsCode: string;
  tdsAmount: string;
  gstCode: string;
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
  onRowUpdate: (rowId: number, field: keyof Omit<InvoiceLineRow, "id">, value: string) => void;
  onAddRow: () => void;
  isFieldChanged: (rowId: number, field: keyof Omit<InvoiceLineRow, "id">, currentValue: string) => boolean;
}

export function LineItemsTable({
  rows,
  isLoading,
  isApprovalMode,
  onRowUpdate,
  onAddRow,
  isFieldChanged,
}: LineItemsTableProps) {
  const [tdsSearchResults, setTdsSearchResults] = useState<TDSData[]>([]);
  const [tdsSearchLoading, setTdsSearchLoading] = useState(false);
  const tdsSearchTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});
  const tdsDataCacheRef = useRef<Record<string, TDSData>>({});

  const [gstSearchResults, setGstSearchResults] = useState<TaxData[]>([]);
  const [gstSearchLoading, setGstSearchLoading] = useState(false);
  const gstSearchTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});
  const gstDataCacheRef = useRef<Record<string, TaxData>>({});

  const [itemsList, setItemsList] = useState<ItemData[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Fetch items on component mount
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setItemsLoading(true);
        const response = await itemsCodeService.getItems();
        setItemsList(response?.data || []);
      } catch (error) {
        console.error("Error fetching items:", error);
        setItemsList([]);
      } finally {
        setItemsLoading(false);
      }
    };

    fetchItems();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(tdsSearchTimeoutRef.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
      Object.values(gstSearchTimeoutRef.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const searchTDSCodes = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.trim().length < 3) {
      setTdsSearchResults([]);
      return;
    }

    setTdsSearchLoading(true);
    try {
      const response = await tdsService.searchTDSCodes(searchTerm);
      const tdsData = response?.data || [];
      setTdsSearchResults(tdsData);
      
      // Cache TDS data for quick lookup
      tdsData.forEach((tds) => {
        tdsDataCacheRef.current[tds.tds_code] = tds;
      });
    } catch (error) {
      console.error("Error searching TDS codes:", error);
      setTdsSearchResults([]);
    } finally {
      setTdsSearchLoading(false);
    }
  }, []);

  const handleTDSCodeChange = useCallback((rowId: number, newValue: string) => {
    onRowUpdate(rowId, "tdsCode", newValue);
    
    // Clear previous timeout for this row
    if (tdsSearchTimeoutRef.current[rowId]) {
      clearTimeout(tdsSearchTimeoutRef.current[rowId]);
    }

    // Debounce search - wait 300ms after user stops typing
    tdsSearchTimeoutRef.current[rowId] = setTimeout(() => {
      if (newValue.trim() && newValue.trim().length >= 3) {
        searchTDSCodes(newValue);
      } else {
        setTdsSearchResults([]);
      }
    }, 300);
  }, [onRowUpdate, searchTDSCodes]);

  const handleTDSCodeSelect = useCallback((rowId: number, tdsData: TDSData | string | null) => {
    if (tdsData && typeof tdsData === 'object') {
      // TDS code selected from dropdown
      onRowUpdate(rowId, "tdsCode", tdsData.tds_code);
      
      // Calculate TDS amount: (quantity × rate) × (tds_percentage / 100)
      const row = rows.find(r => r.id === rowId);
      if (row) {
        const quantity = parseFloat(row.quantity) || 0;
        const rate = parseFloat(row.rate) || 0;
        const baseAmount = quantity * rate;
        const tdsPercentage = parseFloat(tdsData.tds_percentage) || 0;
        const tdsAmount = (baseAmount * tdsPercentage) / 100;
        onRowUpdate(rowId, "tdsAmount", tdsAmount.toFixed(2));
      }
    } else if (typeof tdsData === 'string') {
      // User typed a custom TDS code
      onRowUpdate(rowId, "tdsCode", tdsData);
      
      // Check if we have cached data for this code
      const cachedTds = tdsDataCacheRef.current[tdsData];
      if (cachedTds) {
        const row = rows.find(r => r.id === rowId);
        if (row) {
          const quantity = parseFloat(row.quantity) || 0;
          const rate = parseFloat(row.rate) || 0;
          const baseAmount = quantity * rate;
          const tdsPercentage = parseFloat(cachedTds.tds_percentage) || 0;
          const tdsAmount = (baseAmount * tdsPercentage) / 100;
          onRowUpdate(rowId, "tdsAmount", tdsAmount.toFixed(2));
        }
      }
    }
  }, [onRowUpdate, rows]);

  // Recalculate TDS amount when quantity or rate changes
  useEffect(() => {
    rows.forEach((row) => {
      if (row.tdsCode && row.quantity && row.rate) {
        const cachedTds = tdsDataCacheRef.current[row.tdsCode];
        if (cachedTds) {
          const quantity = parseFloat(row.quantity) || 0;
          const rate = parseFloat(row.rate) || 0;
          const baseAmount = quantity * rate;
          const tdsPercentage = parseFloat(cachedTds.tds_percentage) || 0;
          const calculatedTdsAmount = (baseAmount * tdsPercentage) / 100;
          const currentTdsAmount = parseFloat(row.tdsAmount) || 0;
          
          // Only update if the calculated amount is different
          if (Math.abs(calculatedTdsAmount - currentTdsAmount) > 0.01) {
            onRowUpdate(row.id, "tdsAmount", calculatedTdsAmount.toFixed(2));
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map(r => `${r.id}-${r.quantity}-${r.rate}-${r.tdsCode}`).join(',')]); // Re-run when quantity, rate, or TDS codes change

  // GST Code Search Functions
  const searchGSTCodes = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.trim().length < 3) {
      setGstSearchResults([]);
      return;
    }

    setGstSearchLoading(true);
    try {
      const response = await taxService.searchTaxCodes(searchTerm);
      const taxData = response?.data || [];
      setGstSearchResults(taxData);
      
      // Cache GST data for quick lookup
      taxData.forEach((tax) => {
        gstDataCacheRef.current[tax.tax_code] = tax;
      });
    } catch (error) {
      console.error("Error searching GST codes:", error);
      setGstSearchResults([]);
    } finally {
      setGstSearchLoading(false);
    }
  }, []);

  const handleGSTCodeChange = useCallback((rowId: number, newValue: string) => {
    onRowUpdate(rowId, "gstCode", newValue);
    
    // Clear previous timeout for this row
    if (gstSearchTimeoutRef.current[rowId]) {
      clearTimeout(gstSearchTimeoutRef.current[rowId]);
    }

    // Debounce search - wait 300ms after user stops typing
    gstSearchTimeoutRef.current[rowId] = setTimeout(() => {
      if (newValue.trim() && newValue.trim().length >= 3) {
        searchGSTCodes(newValue);
      } else {
        setGstSearchResults([]);
      }
    }, 300);
  }, [onRowUpdate, searchGSTCodes]);

  const handleGSTCodeSelect = useCallback((rowId: number, taxData: TaxData | string | null) => {
    if (taxData && typeof taxData === 'object') {
      // GST code selected from dropdown
      onRowUpdate(rowId, "gstCode", taxData.tax_code);
      
      // Calculate IGST, CGST, SGST, UTGST amounts: (quantity × rate) × (percentage / 100)
      const row = rows.find(r => r.id === rowId);
      if (row) {
        const quantity = parseFloat(row.quantity) || 0;
        const rate = parseFloat(row.rate) || 0;
        const baseAmount = quantity * rate;
        
        const igstPercentage = parseFloat(taxData.igst_percentage) || 0;
        const cgstPercentage = parseFloat(taxData.cgst_percentage) || 0;
        const sgstPercentage = parseFloat(taxData.sgst_percentage) || 0;
        const utgstPercentage = parseFloat(taxData.utgst_percentage) || 0;
        
        const igstAmount = (baseAmount * igstPercentage) / 100;
        const cgstAmount = (baseAmount * cgstPercentage) / 100;
        const sgstAmount = (baseAmount * sgstPercentage) / 100;
        const utgstAmount = (baseAmount * utgstPercentage) / 100;
        
        onRowUpdate(row.id, "igst", igstAmount.toFixed(2));
        onRowUpdate(row.id, "cgst", cgstAmount.toFixed(2));
        onRowUpdate(row.id, "sgst", sgstAmount.toFixed(2));
        onRowUpdate(row.id, "utgst", utgstAmount.toFixed(2));
      }
    } else if (typeof taxData === 'string') {
      // User typed a custom GST code
      onRowUpdate(rowId, "gstCode", taxData);
      
      // Check if we have cached data for this code
      const cachedTax = gstDataCacheRef.current[taxData];
      if (cachedTax) {
        const row = rows.find(r => r.id === rowId);
        if (row) {
          const quantity = parseFloat(row.quantity) || 0;
          const rate = parseFloat(row.rate) || 0;
          const baseAmount = quantity * rate;
          
          const igstPercentage = parseFloat(cachedTax.igst_percentage) || 0;
          const cgstPercentage = parseFloat(cachedTax.cgst_percentage) || 0;
          const sgstPercentage = parseFloat(cachedTax.sgst_percentage) || 0;
          const utgstPercentage = parseFloat(cachedTax.utgst_percentage) || 0;
          
          const igstAmount = (baseAmount * igstPercentage) / 100;
          const cgstAmount = (baseAmount * cgstPercentage) / 100;
          const sgstAmount = (baseAmount * sgstPercentage) / 100;
          const utgstAmount = (baseAmount * utgstPercentage) / 100;
          
          onRowUpdate(row.id, "igst", igstAmount.toFixed(2));
          onRowUpdate(row.id, "cgst", cgstAmount.toFixed(2));
          onRowUpdate(row.id, "sgst", sgstAmount.toFixed(2));
          onRowUpdate(row.id, "utgst", utgstAmount.toFixed(2));
        }
      }
    }
  }, [onRowUpdate, rows]);

  // Recalculate IGST, CGST, SGST amounts when quantity or rate changes
  useEffect(() => {
    rows.forEach((row) => {
      if (row.gstCode && row.quantity && row.rate) {
        const cachedTax = gstDataCacheRef.current[row.gstCode];
        if (cachedTax) {
          const quantity = parseFloat(row.quantity) || 0;
          const rate = parseFloat(row.rate) || 0;
          const baseAmount = quantity * rate;
          
          const igstPercentage = parseFloat(cachedTax.igst_percentage) || 0;
          const cgstPercentage = parseFloat(cachedTax.cgst_percentage) || 0;
          const sgstPercentage = parseFloat(cachedTax.sgst_percentage) || 0;
          const utgstPercentage = parseFloat(cachedTax.utgst_percentage) || 0;
          
          const calculatedIgst = (baseAmount * igstPercentage) / 100;
          const calculatedCgst = (baseAmount * cgstPercentage) / 100;
          const calculatedSgst = (baseAmount * sgstPercentage) / 100;
          const calculatedUtgst = (baseAmount * utgstPercentage) / 100;
          
          const currentIgst = parseFloat(row.igst) || 0;
          const currentCgst = parseFloat(row.cgst) || 0;
          const currentSgst = parseFloat(row.sgst) || 0;
          const currentUtgst = parseFloat(row.utgst) || 0;
          
          // Only update if the calculated amount is different
          if (Math.abs(calculatedIgst - currentIgst) > 0.01) {
            onRowUpdate(row.id, "igst", calculatedIgst.toFixed(2));
          }
          if (Math.abs(calculatedCgst - currentCgst) > 0.01) {
            onRowUpdate(row.id, "cgst", calculatedCgst.toFixed(2));
          }
          if (Math.abs(calculatedSgst - currentSgst) > 0.01) {
            onRowUpdate(row.id, "sgst", calculatedSgst.toFixed(2));
          }
          if (Math.abs(calculatedUtgst - currentUtgst) > 0.01) {
            onRowUpdate(row.id, "utgst", calculatedUtgst.toFixed(2));
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map(r => `${r.id}-${r.quantity}-${r.rate}-${r.gstCode}`).join(',')]); // Re-run when quantity, rate, or GST codes change

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="px-4 min-w-[200px] py-2"
                style={tableHeaderStyle}
              >
                ITEM DESCRIPTION
              </TableHead>
              <TableHead 
                className="px-4 w-[80px] max-w-[80px] py-2"
                style={tableHeaderStyle}
              >
                QTY
              </TableHead>
              <TableHead 
                className="px-4 min-w-[120px] py-2"
                style={tableHeaderStyle}
              >
                RATE
              </TableHead>
              <TableHead 
                className="px-4 min-w-[160px] py-2"
                style={tableHeaderStyle}
              >
                TDS CODE
              </TableHead>
              <TableHead 
                className="px-4 py-2"
                style={tableHeaderStyle}
              >
                TDS AMOUNT
              </TableHead>
              <TableHead 
                className="px-4 min-w-[160px] py-2"
                style={tableHeaderStyle}
              >
                GST CODE
              </TableHead>
              <TableHead 
                className="px-4 py-2"
                style={tableHeaderStyle}
              >
                IGST
              </TableHead>
              <TableHead 
                className="px-4 py-2"
                style={tableHeaderStyle}
              >
                CGST
              </TableHead>
              <TableHead 
                className="px-4 py-2"
                style={tableHeaderStyle}
              >
                SGST
              </TableHead>
              <TableHead 
                className="px-4 py-2"
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
                <TableCell colSpan={11} className="px-4 py-10">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing invoice…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="px-4 py-10">
                  <div className="text-center text-sm text-gray-500">
                    No line items yet. Upload an invoice or click "Add Row".
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="px-4 py-1">
                    <Autocomplete
                      freeSolo
                      options={itemsList}
                      getOptionLabel={(option) => typeof option === 'string' ? option : option.description}
                      value={itemsList.find(item => item.description === row.itemDescription) || row.itemDescription || null}
                      onInputChange={(_event, newValue) => {
                        // Update field value when user types
                        if (typeof newValue === 'string') {
                          onRowUpdate(row.id, "itemDescription", newValue);
                        }
                      }}
                      onChange={(_event, newValue) => {
                        if (newValue && typeof newValue === 'object') {
                          // Item selected from dropdown
                          onRowUpdate(row.id, "itemDescription", newValue.description);
                          // Optionally auto-populate tax_code and tds_code if they're empty
                          if (!row.gstCode && newValue.tax_code) {
                            onRowUpdate(row.id, "gstCode", newValue.tax_code);
                            // Trigger GST code selection to calculate tax amounts
                            const cachedTax = gstDataCacheRef.current[newValue.tax_code];
                            if (cachedTax) {
                              const quantity = parseFloat(row.quantity) || 0;
                              const rate = parseFloat(row.rate) || 0;
                              const baseAmount = quantity * rate;
                              const igstPercentage = parseFloat(cachedTax.igst_percentage) || 0;
                              const cgstPercentage = parseFloat(cachedTax.cgst_percentage) || 0;
                              const sgstPercentage = parseFloat(cachedTax.sgst_percentage) || 0;
                              const utgstPercentage = parseFloat(cachedTax.utgst_percentage) || 0;
                              onRowUpdate(row.id, "igst", ((baseAmount * igstPercentage) / 100).toFixed(2));
                              onRowUpdate(row.id, "cgst", ((baseAmount * cgstPercentage) / 100).toFixed(2));
                              onRowUpdate(row.id, "sgst", ((baseAmount * sgstPercentage) / 100).toFixed(2));
                              onRowUpdate(row.id, "utgst", ((baseAmount * utgstPercentage) / 100).toFixed(2));
                            }
                          }
                          if (!row.tdsCode && newValue.tds_code) {
                            onRowUpdate(row.id, "tdsCode", newValue.tds_code);
                            // Trigger TDS code selection to calculate TDS amount
                            const cachedTds = tdsDataCacheRef.current[newValue.tds_code];
                            if (cachedTds) {
                              const quantity = parseFloat(row.quantity) || 0;
                              const rate = parseFloat(row.rate) || 0;
                              const baseAmount = quantity * rate;
                              const tdsPercentage = parseFloat(cachedTds.tds_percentage) || 0;
                              onRowUpdate(row.id, "tdsAmount", ((baseAmount * tdsPercentage) / 100).toFixed(2));
                            }
                          }
                        } else if (typeof newValue === 'string') {
                          // User typed a custom description
                          onRowUpdate(row.id, "itemDescription", newValue);
                        }
                      }}
                      loading={itemsLoading}
                      disabled={isApprovalMode}
                      sx={{ 
                        width: '100%', 
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
                              backgroundColor: isFieldChanged(row.id, "itemDescription", row.itemDescription) ? '#fef3c7' : 'transparent',
                              padding: '0 !important',
                              '& fieldset': {
                                border: 'none',
                              },
                              '&:hover fieldset': {
                                border: 'none',
                              },
                              '&.Mui-focused fieldset': {
                                border: 'none',
                                boxShadow: 'none',
                              },
                            },
                            '& .MuiInputBase-input': {
                              padding: '4px 0px !important',
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
                            {itemsLoading ? "Loading items..." : "No items found"}
                          </span>
                        </div>
                      }
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1 w-[80px] max-w-[80px]">
                    <Input
                      value={row.quantity ? parseFloat(row.quantity).toString() : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "" || /^\d+$/.test(value)) {
                          onRowUpdate(row.id, "quantity", value);
                        }
                      }}
                      className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "quantity", row.quantity) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="Qty"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[120px]">
                    <Input
                      value={row.rate}
                      onChange={(e) => onRowUpdate(row.id, "rate", e.target.value)}
                      className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "rate", row.rate) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[160px]">
                    <Autocomplete
                      freeSolo
                      options={tdsSearchResults}
                      getOptionLabel={(option) => typeof option === 'string' ? option : option.tds_code}
                      value={tdsSearchResults.find(tds => tds.tds_code === row.tdsCode) || row.tdsCode || null}
                      onInputChange={(_event, newValue) => {
                        handleTDSCodeChange(row.id, newValue);
                      }}
                      onChange={(_event, newValue) => {
                        handleTDSCodeSelect(row.id, newValue);
                      }}
                      loading={tdsSearchLoading}
                      disabled={isApprovalMode}
                      sx={{ 
                        width: '100%', 
                        minWidth: '160px',
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
                          maxHeight: '300px',
                          width: '100%',
                          '& li:not(:last-child)': {
                            borderBottom: '1px solid #f3f4f6',
                            marginBottom: '2px',
                            paddingBottom: '4px',
                          },
                        },
                      }}
                      slotProps={{
                        popper: {
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
                          ],
                        },
                        paper: {
                          sx: {
                            width: 'auto',
                            minWidth: '300px',
                            maxWidth: '450px',
                          },
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Enter TDS code"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '32px',
                              fontSize: '14px',
                              backgroundColor: 'transparent',
                              padding: '0 !important',
                              '& fieldset': {
                                border: 'none',
                              },
                              '&:hover fieldset': {
                                border: 'none',
                              },
                              '&.Mui-focused fieldset': {
                                border: 'none',
                                boxShadow: 'none',
                              },
                            },
                            '& .MuiInputBase-input': {
                              padding: '4px 0px !important',
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
                              {option.tds_code}
                            </span>
                            {option.description && (
                              <span className="text-xs text-gray-600 leading-tight">
                                {option.description}
                              </span>
                            )}
                          </div>
                        </li>
                      )}
                      noOptionsText={
                        <div className="px-4 py-6 text-center">
                          <span className="text-sm text-gray-500">
                            {row.tdsCode ? "No TDS codes found" : "Type at least 3 characters to search..."}
                          </span>
                        </div>
                      }
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.tdsAmount}
                      onChange={(e) => onRowUpdate(row.id, "tdsAmount", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "tdsAmount", row.tdsAmount) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[160px]">
                    <Autocomplete
                      freeSolo
                      options={gstSearchResults}
                      getOptionLabel={(option) => typeof option === 'string' ? option : option.tax_code}
                      value={gstSearchResults.find(tax => tax.tax_code === row.gstCode) || row.gstCode || null}
                      onInputChange={(_event, newValue) => {
                        handleGSTCodeChange(row.id, newValue);
                      }}
                      onChange={(_event, newValue) => {
                        handleGSTCodeSelect(row.id, newValue);
                      }}
                      loading={gstSearchLoading}
                      disabled={isApprovalMode}
                      sx={{ 
                        width: '100%', 
                        minWidth: '160px',
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
                          maxHeight: '300px',
                          width: '100%',
                          '& li:not(:last-child)': {
                            borderBottom: '1px solid #f3f4f6',
                            marginBottom: '2px',
                            paddingBottom: '4px',
                          },
                        },
                      }}
                      slotProps={{
                        popper: {
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
                          ],
                        },
                        paper: {
                          sx: {
                            width: 'auto',
                            minWidth: '300px',
                            maxWidth: '450px',
                          },
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Enter GST code"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              height: '32px',
                              fontSize: '14px',
                              backgroundColor: 'transparent',
                              padding: '0 !important',
                              '& fieldset': {
                                border: 'none',
                              },
                              '&:hover fieldset': {
                                border: 'none',
                              },
                              '&.Mui-focused fieldset': {
                                border: 'none',
                                boxShadow: 'none',
                              },
                            },
                            '& .MuiInputBase-input': {
                              padding: '4px 0px !important',
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
                              {option.tax_code}
                            </span>
                            {option.description && (
                              <span className="text-xs text-gray-600 leading-tight">
                                {option.description}
                              </span>
                            )}
                          </div>
                        </li>
                      )}
                      noOptionsText={
                        <div className="px-4 py-6 text-center">
                          <span className="text-sm text-gray-500">
                            {row.gstCode ? "No GST codes found" : "Type at least 3 characters to search..."}
                          </span>
                        </div>
                      }
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.igst}
                      onChange={(e) => onRowUpdate(row.id, "igst", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "igst", row.igst) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.cgst}
                      onChange={(e) => onRowUpdate(row.id, "cgst", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "cgst", row.cgst) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.sgst}
                      onChange={(e) => onRowUpdate(row.id, "sgst", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "sgst", row.sgst) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.utgst}
                      onChange={(e) => onRowUpdate(row.id, "utgst", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 ${
                        isFieldChanged(row.id, "utgst", row.utgst) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="₹ 0.00"
                      disabled={isApprovalMode}
                    />
                  </TableCell>
                  <TableCell className="pl-4 pr-6 py-1">
                    <div className="flex justify-end">
                      <Input
                        value={row.netAmount}
                        onChange={(e) => onRowUpdate(row.id, "netAmount", e.target.value)}
                        className={`h-8 w-[140px] border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 bg-gray-50 text-right ${
                          isFieldChanged(row.id, "netAmount", row.netAmount) ? "bg-yellow-100" : ""
                        }`}
                        placeholder="₹ 0.00"
                        disabled={true}
                        readOnly
                      />
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

