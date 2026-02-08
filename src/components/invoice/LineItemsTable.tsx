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
  hsnCode: string;
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
  validationErrors?: Record<number, Record<string, boolean>>;
  onValidationErrorChange?: (rowId: number, field: string, hasError: boolean) => void;
}

export function LineItemsTable({
  rows,
  isLoading,
  isApprovalMode,
  onRowUpdate,
  onAddRow,
  isFieldChanged,
  validationErrors = {},
  onValidationErrorChange,
}: LineItemsTableProps) {
  const [tdsSearchResults, setTdsSearchResults] = useState<TDSData[]>([]);
  const [tdsSearchLoading, setTdsSearchLoading] = useState(false);
  const tdsSearchTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});
  const tdsDataCacheRef = useRef<Record<string, TDSData>>({});

  const [gstSearchResults, setGstSearchResults] = useState<TaxData[]>([]);
  const [gstSearchLoading, setGstSearchLoading] = useState(false);
  const gstSearchTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});
  const gstDataCacheRef = useRef<Record<string, TaxData>>({});

  const [itemSearchResults, setItemSearchResults] = useState<ItemData[]>([]);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const itemSearchTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});

  // Default options for dropdowns (2-3 items)
  const [defaultItems, setDefaultItems] = useState<ItemData[]>([]);
  const [defaultTDSCodes, setDefaultTDSCodes] = useState<TDSData[]>([]);
  const [defaultTaxCodes, setDefaultTaxCodes] = useState<TaxData[]>([]);

  // Fetch default options on mount
  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        // Fetch items, TDS codes, and tax codes
        const [itemsResponse, tdsResponse, taxResponse] = await Promise.all([
          itemsCodeService.getItems(),
          tdsService.getTDS(),
          taxService.getTaxes(200, 0),
        ]);

        const items = itemsResponse?.data || [];
        setDefaultItems(items.slice(0, 3));
        items.forEach((item) => {
          if (item.tax_code) {
            gstDataCacheRef.current[item.tax_code] = {
              id: item.id,
              tax_code: item.tax_code,
              tax_percentage: "0",
              cgst_percentage: "0",
              sgst_percentage: "0",
              igst_percentage: "0",
              utgst_percentage: "0",
              description: "",
              active_flag: true,
              created_at: "",
              updated_at: "",
            };
          }
          if (item.tds_code) {
            tdsDataCacheRef.current[item.tds_code] = {
              id: item.id,
              tds_code: item.tds_code,
              tds_percentage: "0",
              description: "",
              active_flag: true,
              created_at: "",
              updated_at: "",
            };
          }
        });

        // Set first 2-3 TDS codes as defaults
        const tdsCodes = tdsResponse?.data || [];
        setDefaultTDSCodes(tdsCodes.slice(0, 3));
        
        // Cache all TDS codes
        tdsCodes.forEach((tds) => {
          tdsDataCacheRef.current[tds.tds_code] = tds;
        });

        // Set first 2-3 tax codes as defaults
        const taxCodes = taxResponse?.data || [];
        setDefaultTaxCodes(taxCodes.slice(0, 3));
        
        // Cache all tax codes
        taxCodes.forEach((tax) => {
          gstDataCacheRef.current[tax.tax_code] = tax;
        });
      } catch (error) {
        console.error("Error fetching default options:", error);
      }
    };

    fetchDefaults();
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
      Object.values(itemSearchTimeoutRef.current).forEach((timeout) => {
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
      const response = await itemsCodeService.searchItems(searchTerm);
      setItemSearchResults(response?.data || []);
    } catch (error) {
      console.error("Error searching items:", error);
      setItemSearchResults([]);
    } finally {
      setItemSearchLoading(false);
    }
  }, []);

  const handleItemDescriptionChange = useCallback((rowId: number, newValue: string) => {
    onRowUpdate(rowId, "itemDescription", newValue);

    // Clear previous timeout for this row
    if (itemSearchTimeoutRef.current[rowId]) {
      clearTimeout(itemSearchTimeoutRef.current[rowId]);
    }

    // Debounce search - wait 300ms after user stops typing
    itemSearchTimeoutRef.current[rowId] = setTimeout(() => {
      if (newValue.trim() && newValue.trim().length >= 3) {
        searchItemsByDescription(newValue);
      } else {
        setItemSearchResults([]);
      }
    }, 300);
  }, [onRowUpdate, searchItemsByDescription]);

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
        if (onValidationErrorChange) {
          onValidationErrorChange(rowId, "tdsCode", false);
          onValidationErrorChange(rowId, "tdsAmount", false);
        }
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
          if (onValidationErrorChange) {
            onValidationErrorChange(rowId, "tdsCode", false);
            onValidationErrorChange(rowId, "tdsAmount", false);
          }
        }
      }
    }
  }, [onRowUpdate, rows, onValidationErrorChange]);

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
            if (onValidationErrorChange && calculatedTdsAmount >= 0) {
              onValidationErrorChange(row.id, "tdsAmount", false);
            }
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
      const response = await taxService.searchTaxCodes(searchTerm, 200, 0);
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
        if (onValidationErrorChange) {
          onValidationErrorChange(rowId, "gstCode", false);
          onValidationErrorChange(rowId, "igst", false);
          onValidationErrorChange(rowId, "cgst", false);
          onValidationErrorChange(rowId, "sgst", false);
          onValidationErrorChange(rowId, "utgst", false);
        }
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
          if (onValidationErrorChange) {
            onValidationErrorChange(rowId, "gstCode", false);
            onValidationErrorChange(rowId, "igst", false);
            onValidationErrorChange(rowId, "cgst", false);
            onValidationErrorChange(rowId, "sgst", false);
            onValidationErrorChange(rowId, "utgst", false);
          }
        }
      }
    }
  }, [onRowUpdate, rows, onValidationErrorChange]);

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
            if (onValidationErrorChange && calculatedIgst >= 0) {
              onValidationErrorChange(row.id, "igst", false);
            }
          }
          if (Math.abs(calculatedCgst - currentCgst) > 0.01) {
            onRowUpdate(row.id, "cgst", calculatedCgst.toFixed(2));
            if (onValidationErrorChange && calculatedCgst >= 0) {
              onValidationErrorChange(row.id, "cgst", false);
            }
          }
          if (Math.abs(calculatedSgst - currentSgst) > 0.01) {
            onRowUpdate(row.id, "sgst", calculatedSgst.toFixed(2));
            if (onValidationErrorChange && calculatedSgst >= 0) {
              onValidationErrorChange(row.id, "sgst", false);
            }
          }
          if (Math.abs(calculatedUtgst - currentUtgst) > 0.01) {
            onRowUpdate(row.id, "utgst", calculatedUtgst.toFixed(2));
            if (onValidationErrorChange && calculatedUtgst >= 0) {
              onValidationErrorChange(row.id, "utgst", false);
            }
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
                className="px-4 min-w-[160px] py-2"
                style={tableHeaderStyle}
              >
                TDS CODE
              </TableHead>
              <TableHead 
                className="px-4 min-w-[130px] py-2"
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
                <TableCell colSpan={12} className="px-4 py-10">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing invoice…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="px-4 py-10">
                  <div className="text-center text-sm text-gray-500">
                    No line items yet. Upload an invoice or click "Add Row".
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
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
                          // Auto-populate HSN code when item is selected
                          if (newValue.hsn_sac_code) {
                            onRowUpdate(row.id, "hsnCode", newValue.hsn_sac_code);
                          }
                          // Optionally auto-populate tax_code and tds_code if they're empty
                          if (!row.gstCode && newValue.tax_code) {
                            onRowUpdate(row.id, "gstCode", newValue.tax_code);
                            if (onValidationErrorChange) {
                              onValidationErrorChange(row.id, "gstCode", false);
                            }
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
                            if (onValidationErrorChange) {
                              onValidationErrorChange(row.id, "tdsCode", false);
                            }
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
                              backgroundColor: isFieldChanged(row.id, "itemDescription", row.itemDescription) ? '#fef3c7' : 'transparent',
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
                          onRowUpdate(row.id, "hsnCode", e.target.value);
                        }}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 ${
                          isFieldChanged(row.id, "hsnCode", row.hsnCode) ? "bg-yellow-100" : ""
                        }`}
                        placeholder="HSN Code"
                        disabled={isApprovalMode}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[160px]">
                    <div>
                      <Autocomplete
                        freeSolo
                        options={tdsSearchResults.length > 0 ? tdsSearchResults : defaultTDSCodes}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.tds_code}
                        value={(tdsSearchResults.length > 0 ? tdsSearchResults : defaultTDSCodes).find(tds => tds.tds_code === row.tdsCode) || row.tdsCode || null}
                        onInputChange={(_event, newValue) => {
                          handleTDSCodeChange(row.id, newValue);
                          if (onValidationErrorChange && newValue.trim()) {
                            onValidationErrorChange(row.id, "tdsCode", false);
                          }
                        }}
                        onChange={(_event, newValue) => {
                          handleTDSCodeSelect(row.id, newValue);
                          if (onValidationErrorChange && newValue && (typeof newValue === 'string' ? newValue.trim() : newValue.tds_code)) {
                            onValidationErrorChange(row.id, "tdsCode", false);
                          }
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
                                border: validationErrors[row.id]?.tdsCode ? '1px solid #EF4444' : 'none',
                              },
                              '&:hover fieldset': {
                                border: validationErrors[row.id]?.tdsCode ? '1px solid #EF4444' : 'none',
                              },
                              '&.Mui-focused fieldset': {
                                border: validationErrors[row.id]?.tdsCode ? '1px solid #EF4444' : 'none',
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
                    {validationErrors[row.id]?.tdsCode && (
                      <p className="text-red-500 text-xs mt-0.5">Required field</p>
                    )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[130px]">
                    <div>
                      <Input
                        value={row.tdsAmount}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 bg-gray-50 ${
                          isFieldChanged(row.id, "tdsAmount", row.tdsAmount) ? "bg-yellow-100" : ""
                        }`}
                        placeholder="₹ 0.00"
                        disabled={true}
                        readOnly
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[160px]">
                    <div>
                      <Autocomplete
                        freeSolo
                        options={gstSearchResults.length > 0 ? gstSearchResults : defaultTaxCodes}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.tax_code}
                        value={(gstSearchResults.length > 0 ? gstSearchResults : defaultTaxCodes).find(tax => tax.tax_code === row.gstCode) || row.gstCode || null}
                        onInputChange={(_event, newValue) => {
                          handleGSTCodeChange(row.id, newValue);
                          if (onValidationErrorChange && newValue.trim()) {
                            onValidationErrorChange(row.id, "gstCode", false);
                          }
                        }}
                        onChange={(_event, newValue) => {
                          handleGSTCodeSelect(row.id, newValue);
                          if (onValidationErrorChange && newValue && (typeof newValue === 'string' ? newValue.trim() : newValue.tax_code)) {
                            onValidationErrorChange(row.id, "gstCode", false);
                          }
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
                                border: validationErrors[row.id]?.gstCode ? '1px solid #EF4444' : 'none',
                              },
                              '&:hover fieldset': {
                                border: validationErrors[row.id]?.gstCode ? '1px solid #EF4444' : 'none',
                              },
                              '&.Mui-focused fieldset': {
                                border: validationErrors[row.id]?.gstCode ? '1px solid #EF4444' : 'none',
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
                    {validationErrors[row.id]?.gstCode && (
                      <p className="text-red-500 text-xs mt-0.5">Required field</p>
                    )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[130px]">
                    <div>
                      <Input
                        value={row.igst}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 bg-gray-50 ${
                          isFieldChanged(row.id, "igst", row.igst) ? "bg-yellow-100" : ""
                        }`}
                        placeholder="₹ 0.00"
                        disabled={true}
                        readOnly
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[130px]">
                    <div>
                      <Input
                        value={row.cgst}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 bg-gray-50 ${
                          isFieldChanged(row.id, "cgst", row.cgst) ? "bg-yellow-100" : ""
                        }`}
                        placeholder="₹ 0.00"
                        disabled={true}
                        readOnly
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[130px]">
                    <div>
                      <Input
                        value={row.sgst}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 bg-gray-50 ${
                          isFieldChanged(row.id, "sgst", row.sgst) ? "bg-yellow-100" : ""
                        }`}
                        placeholder="₹ 0.00"
                        disabled={true}
                        readOnly
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-1 min-w-[130px]">
                    <div>
                      <Input
                        value={row.utgst}
                        className={`h-8 w-full border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-1 bg-gray-50 ${
                          isFieldChanged(row.id, "utgst", row.utgst) ? "bg-yellow-100" : ""
                        }`}
                        placeholder="₹ 0.00"
                        disabled={true}
                        readOnly
                      />
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
                          className={`h-8 w-[140px] border-0 shadow-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-0 rounded-none px-0 bg-gray-50 text-right ${
                            isFieldChanged(row.id, "netAmount", row.netAmount) ? "bg-yellow-100" : ""
                          } ${validationErrors[row.id]?.netAmount ? '!border-red-500 border' : ''}`}
                          placeholder="₹ 0.00"
                          disabled={true}
                          readOnly
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

