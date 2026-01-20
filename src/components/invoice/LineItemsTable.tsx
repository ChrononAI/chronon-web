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

export type InvoiceLineRow = {
  id: number;
  itemDescription: string;
  quantity: string;
  rate: string;
  tdsCode: string;
  tdsAmount: string;
  gstCode: string;
  igst: string;
  cgst: string;
  sgst: string;
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
    if (!searchTerm.trim()) {
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
      if (newValue.trim()) {
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
      
      // Calculate TDS amount: (net amount * tds_percentage) / 100
      const row = rows.find(r => r.id === rowId);
      if (row) {
        const netAmount = parseFloat(row.netAmount) || 0;
        const tdsPercentage = parseFloat(tdsData.tds_percentage) || 0;
        const tdsAmount = (netAmount * tdsPercentage) / 100;
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
          const netAmount = parseFloat(row.netAmount) || 0;
          const tdsPercentage = parseFloat(cachedTds.tds_percentage) || 0;
          const tdsAmount = (netAmount * tdsPercentage) / 100;
          onRowUpdate(rowId, "tdsAmount", tdsAmount.toFixed(2));
        }
      }
    }
  }, [onRowUpdate, rows]);

  // Recalculate TDS amount when net amount changes
  useEffect(() => {
    rows.forEach((row) => {
      if (row.tdsCode && row.netAmount) {
        const cachedTds = tdsDataCacheRef.current[row.tdsCode];
        if (cachedTds) {
          const netAmount = parseFloat(row.netAmount) || 0;
          const tdsPercentage = parseFloat(cachedTds.tds_percentage) || 0;
          const calculatedTdsAmount = (netAmount * tdsPercentage) / 100;
          const currentTdsAmount = parseFloat(row.tdsAmount) || 0;
          
          // Only update if the calculated amount is different
          if (Math.abs(calculatedTdsAmount - currentTdsAmount) > 0.01) {
            onRowUpdate(row.id, "tdsAmount", calculatedTdsAmount.toFixed(2));
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map(r => `${r.id}-${r.netAmount}-${r.tdsCode}`).join(',')]); // Re-run when net amounts or TDS codes change

  // GST Code Search Functions
  const searchGSTCodes = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
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
      if (newValue.trim()) {
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
      
      // Calculate IGST, CGST, SGST amounts: (quantity × rate) × (percentage / 100)
      const row = rows.find(r => r.id === rowId);
      if (row) {
        const quantity = parseFloat(row.quantity) || 0;
        const rate = parseFloat(row.rate) || 0;
        const baseAmount = quantity * rate;
        
        const igstPercentage = parseFloat(taxData.igst_percentage) || 0;
        const cgstPercentage = parseFloat(taxData.cgst_percentage) || 0;
        const sgstPercentage = parseFloat(taxData.sgst_percentage) || 0;
        
        const igstAmount = (baseAmount * igstPercentage) / 100;
        const cgstAmount = (baseAmount * cgstPercentage) / 100;
        const sgstAmount = (baseAmount * sgstPercentage) / 100;
        
        onRowUpdate(row.id, "igst", igstAmount.toFixed(2));
        onRowUpdate(row.id, "cgst", cgstAmount.toFixed(2));
        onRowUpdate(row.id, "sgst", sgstAmount.toFixed(2));
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
          
          const igstAmount = (baseAmount * igstPercentage) / 100;
          const cgstAmount = (baseAmount * cgstPercentage) / 100;
          const sgstAmount = (baseAmount * sgstPercentage) / 100;
          
          onRowUpdate(row.id, "igst", igstAmount.toFixed(2));
          onRowUpdate(row.id, "cgst", cgstAmount.toFixed(2));
          onRowUpdate(row.id, "sgst", sgstAmount.toFixed(2));
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
          
          const calculatedIgst = (baseAmount * igstPercentage) / 100;
          const calculatedCgst = (baseAmount * cgstPercentage) / 100;
          const calculatedSgst = (baseAmount * sgstPercentage) / 100;
          
          const currentIgst = parseFloat(row.igst) || 0;
          const currentCgst = parseFloat(row.cgst) || 0;
          const currentSgst = parseFloat(row.sgst) || 0;
          
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
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map(r => `${r.id}-${r.quantity}-${r.rate}-${r.gstCode}`).join(',')]); // Re-run when quantity, rate, or GST codes change

  return (
    <div className="border-t bg-white">
      <div className="py-6 pr-6 pl-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 min-w-[200px] text-xs font-medium py-2">ITEM DESCRIPTION</TableHead>
              <TableHead className="px-4 w-[80px] max-w-[80px] text-xs font-medium py-2">QTY</TableHead>
              <TableHead className="px-4 min-w-[120px] text-xs font-medium py-2">RATE</TableHead>
              <TableHead className="px-4 min-w-[150px] text-xs font-medium py-2">TDS CODE</TableHead>
              <TableHead className="px-4 text-xs font-medium py-2">TDS AMOUNT</TableHead>
              <TableHead className="px-4 min-w-[150px] text-xs font-medium py-2">GST CODE</TableHead>
              <TableHead className="px-4 text-xs font-medium py-2">IGST</TableHead>
              <TableHead className="px-4 text-xs font-medium py-2">CGST</TableHead>
              <TableHead className="px-4 text-xs font-medium py-2">SGST</TableHead>
              <TableHead className="pl-4 pr-6 text-right text-xs font-medium py-2">NET AMOUNT</TableHead>
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
                  <TableCell className="px-4 py-1">
                    <Input
                      value={row.itemDescription}
                      onChange={(e) => onRowUpdate(row.id, "itemDescription", e.target.value)}
                      className={`h-8 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 whitespace-nowrap overflow-hidden text-ellipsis ${
                        isFieldChanged(row.id, "itemDescription", row.itemDescription) ? "bg-yellow-100" : ""
                      }`}
                      placeholder="Enter item description"
                      disabled={isApprovalMode}
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
                  <TableCell className="px-4 py-1 min-w-[150px]">
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
                        minWidth: '150px',
                        '& .MuiAutocomplete-root': {
                          padding: 0,
                        },
                        '& .MuiAutocomplete-inputRoot': {
                          padding: '0 !important',
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
                        <li {...props} key={option.id}>
                          <div className="flex flex-col w-full">
                            <span className="font-medium">{option.tds_code}</span>
                            {option.description && (
                              <span className="text-xs text-gray-500">{option.description}</span>
                            )}
                          </div>
                        </li>
                      )}
                      noOptionsText={row.tdsCode ? "No TDS codes found" : "Start typing to search..."}
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
                  <TableCell className="px-4 py-1 min-w-[150px]">
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
                        minWidth: '150px',
                        '& .MuiAutocomplete-root': {
                          padding: 0,
                        },
                        '& .MuiAutocomplete-inputRoot': {
                          padding: '0 !important',
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
                        <li {...props} key={option.id}>
                          <div className="flex flex-col w-full">
                            <span className="font-medium">{option.tax_code}</span>
                            {option.description && (
                              <span className="text-xs text-gray-500">{option.description}</span>
                            )}
                          </div>
                        </li>
                      )}
                      noOptionsText={row.gstCode ? "No GST codes found" : "Start typing to search..."}
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

