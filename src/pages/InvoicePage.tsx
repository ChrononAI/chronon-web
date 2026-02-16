import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  X,
  FileText,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { FormActionFooter } from "@/components/layout/FormActionFooter";
import { LineItemsTable, type InvoiceLineRow } from "@/components/invoice/LineItemsTable";
import { InvoiceComment } from "@/components/invoice/InvoiceComment";
import { InvoiceValidation } from "@/components/invoice/InvoiceValidation";
import { InvoiceActivity } from "@/components/invoice/InvoiceActivity";
import { getInvoiceById, getApprovalInvoiceById, getFileDownloadUrl, approveOrRejectInvoice, submitInvoice, updateInvoice, type UpdateInvoiceData } from "@/services/invoice/invoice";
import { invoiceActivityService } from "@/services/invoice/invoiceActivityService";
import { DateField } from "@/components/ui/date-field";
import { formatCurrency } from "@/lib/utils";
import { Autocomplete, TextField } from "@mui/material";
import { vendorService, VendorData } from "@/services/vendorService";
import { itemsCodeService, ItemData } from "@/services/items/itemsCodeService";
import { taxService, TaxData } from "@/services/taxService";
import { tdsService, TDSData } from "@/services/tdsService";
import { toast } from "sonner";

type InvoiceUploadState = {
  files?: File[];
};


export function InvoicePage() {
  const { setSidebarCollapsed } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isApprovalMode = location.pathname.startsWith("/flow/approvals/");

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorPan, setVendorPan] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [currency, _setCurrency] = useState("INR");
  const [invoiceType, _setInvoiceType] = useState("PO");
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [vendorSearchResults, setVendorSearchResults] = useState<VendorData[]>([]);
  const [vendorSearchLoading, setVendorSearchLoading] = useState(false);
  const vendorSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [invoiceZoom, setInvoiceZoom] = useState(1);
  const [invoiceRotation, setInvoiceRotation] = useState(0);
  const [isInvoiceFullscreen, setIsInvoiceFullscreen] = useState(false);

  const [tableLoading, setTableLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<string | null>(null);
  const [tableRows, setTableRows] = useState<InvoiceLineRow[]>([]);
  const [originalOcrValues, setOriginalOcrValues] = useState<Record<number, Partial<InvoiceLineRow>>>({});
  const [subtotalAmount, setSubtotalAmount] = useState<string>("0.00");
  const [cgstAmount, setCgstAmount] = useState<string>("0.00");
  const [sgstAmount, setSgstAmount] = useState<string>("0.00");
  const [igstAmount, setIgstAmount] = useState<string>("0.00");
  const [totalAmount, setTotalAmount] = useState<string>("0.00");
  const nextRowIdRef = useRef(1);
  const previewUrlRef = useRef<string | null>(null);
  const lastLoadedRef = useRef<{ id?: string; fileKey?: string; routeKey?: string }>({});
  const [rawOcrPayload, setRawOcrPayload] = useState<any>(null);
  const [pageActivities, setPageActivities] = useState<any[]>([]);
  const [, setPageActivityLoading] = useState(false);
  const [, setPageActivityError] = useState<string | null>(null);
  
  const [itemsData, setItemsData] = useState<ItemData[]>([]);
  const [taxDataCache, setTaxDataCache] = useState<Record<string, TaxData>>({});
  const [tdsDataCache, setTdsDataCache] = useState<Record<string, TDSData>>({});
  const hsnMatchingProcessedRef = useRef(false);
  
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [comments, setComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [lineItemValidationErrors, setLineItemValidationErrors] = useState<Record<number, Record<string, boolean>>>({});
  
  const [unmatchedHsnRows, setUnmatchedHsnRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchItemsAndCodes = async () => {
      try {
        const [itemsResponse, taxResponse, tdsResponse] = await Promise.all([
          itemsCodeService.getItems(1000, 0),
          taxService.getTaxes(1000, 0),
          tdsService.getTDS(1000, 0),
        ]);

        const items = itemsResponse?.data || [];
        setItemsData(items);

        const taxCodes = taxResponse?.data || [];
        const taxCache: Record<string, TaxData> = {};
        taxCodes.forEach((tax) => {
          taxCache[tax.tax_code] = tax;
        });
        setTaxDataCache(taxCache);

        const tdsCodes = tdsResponse?.data || [];
        const tdsCache: Record<string, TDSData> = {};
        tdsCodes.forEach((tds) => {
          tdsCache[tds.tds_code] = tds;
        });
        setTdsDataCache(tdsCache);
      } catch (error) {
        console.error("Error fetching items and codes:", error);
      }
    };

    fetchItemsAndCodes();
  }, []);

  useEffect(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!uploadedFile) {
      setPreviewUrl(null);
      return;
    }
    if (!uploadedFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(uploadedFile);
    previewUrlRef.current = url;
    setPreviewUrl(url);

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [uploadedFile]);

  useEffect(() => {
    const state = (location.state || null) as InvoiceUploadState | null;
    const incomingFile = Array.isArray(state?.files) ? state?.files?.[0] : undefined;

    const isUploadRoute = location.pathname.startsWith("/flow/invoice/upload");
    const isInvoiceDetailRoute = location.pathname.startsWith("/flow/invoice/") && id;
    const isApprovalDetailRoute = location.pathname.startsWith("/flow/approvals/") && id;

    const shouldLoadFromUpload = isUploadRoute && !!incomingFile;
    const shouldLoadFromId = (isInvoiceDetailRoute || isApprovalDetailRoute) && !!id;

    if (!shouldLoadFromUpload && !shouldLoadFromId) return;

    const fileKey = incomingFile
      ? `${incomingFile.name}|${incomingFile.size}|${incomingFile.lastModified}`
      : undefined;

    const routeKey = isUploadRoute
      ? "upload"
      : isApprovalDetailRoute
      ? "approvals"
      : isInvoiceDetailRoute
      ? "invoice"
      : undefined;

    const currentId = id;

    if (
      lastLoadedRef.current.id === currentId &&
      lastLoadedRef.current.fileKey === fileKey &&
      lastLoadedRef.current.routeKey === routeKey
    ) {
      return;
    }

    let needsFetch = false;

    if (shouldLoadFromUpload && incomingFile) {
      setUploadedFile(incomingFile);
      needsFetch = true;
      lastLoadedRef.current = { id: currentId, fileKey, routeKey };
    }

    if (shouldLoadFromId && id) {
      needsFetch = true;
    }

    if (!needsFetch) return;

    setTableLoading(true);
    if (shouldLoadFromId && id) {
      setInvoiceLoading(true);
    }

    let isActive = true;

    const fetchData = async () => {
      try {
        if (shouldLoadFromId && id) {
          const response = isApprovalDetailRoute 
            ? await getApprovalInvoiceById(id)
            : await getInvoiceById(id);
          
          if (!response || !response.data) {
            setTableLoading(false);
            return;
          }
          
          const invoice = Array.isArray(response.data) && response.data.length > 0
            ? response.data[0] 
            : null;
          
          if (!invoice || !isActive) {
            setTableLoading(false);
            setInvoiceLoading(false);
            return;
          }

          setInvoiceStatus(invoice.status || null);

          const formatDate = (dateString: string | null): string => {
            if (!dateString) return "";
            return dateString.split("T")[0];
          };

          setInvoiceNumber(invoice.invoice_number || "");
          setInvoiceDate(formatDate(invoice.invoice_date));
          setBillingAddress(invoice.billing_address || "");
          setShippingAddress(invoice.shipping_address || "");
          
          if (invoice.gst_number) {
            setGstNumber(invoice.gst_number);
            if (invoice.gst_number.length === 15) {
              try {
                const vendorResponse = await vendorService.searchVendorsByGst(invoice.gst_number, 17, 0);
                const matchedVendor = vendorResponse?.data?.find(v => v.gstin === invoice.gst_number);
                if (matchedVendor) {
                  setVendorName(matchedVendor.vendor_name || "");
                  setVendorEmail(matchedVendor.email || "");
                  setVendorPan(matchedVendor.pan || "");
                  setVendorId(matchedVendor.vendor_code || "");
                }
              } catch (error) {
                console.error("Error fetching vendor details:", error);
              }
            }
          }
          
          setSubtotalAmount(invoice.subtotal_amount || "0.00");
          setCgstAmount(invoice.cgst_amount || "0.00");
          setSgstAmount(invoice.sgst_amount || "0.00");
          setIgstAmount(invoice.igst_amount || "0.00");
          setTotalAmount(invoice.total_amount || "0.00");
          
          setRawOcrPayload(invoice.raw_ocr_payload || null);
          
          if (invoice.file_ids && invoice.file_ids.length > 0) {
            try {
              const fileId = invoice.file_ids[0];
              const downloadUrlResponse = await getFileDownloadUrl(fileId);
              if (downloadUrlResponse?.data?.download_url) {
                setDownloadUrl(downloadUrlResponse.data.download_url);
              } else {
                setDownloadUrl(null);
              }
            } catch (error) {
              setDownloadUrl(null);
            } finally {
              setInvoiceLoading(false);
            }
          } else {
            setDownloadUrl(null);
            setInvoiceLoading(false);
          }
          
          if (invoice.invoice_lineitems && Array.isArray(invoice.invoice_lineitems) && invoice.invoice_lineitems.length > 0) {
            const rowsWithIds: InvoiceLineRow[] = invoice.invoice_lineitems.map((item, idx) => {
              const quantity = item.quantity ? parseFloat(item.quantity) : 0;
              const rate = item.rate || item.unit_price ? parseFloat(item.rate || item.unit_price || "0") : 0;
              
              return {
                id: idx + 1,
                invoiceLineItemId: item.id || undefined,
                itemDescription: item.description || "",
                quantity: quantity > 0 ? quantity.toString() : "",
                rate: rate > 0 ? rate.toString() : "",
                hsnCode: item.hsn_sac || "",
                tdsCode: item.tds_code || "",
                tdsAmount: item.tds_amount || "",
                gstCode: item.tax_code || "",
                igst: item.igst_amount || "",
                cgst: item.cgst_amount || "",
                sgst: item.sgst_amount || "",
                utgst: item.utgst_amount || "",
                netAmount: item.subtotal || "",
              };
            });
            
            setTableRows(rowsWithIds);
            setOriginalOcrValues(Object.fromEntries(rowsWithIds.map((row) => [row.id, { ...row }])));
            nextRowIdRef.current = rowsWithIds.length + 1;
          } else {
            setTableRows([]);
            nextRowIdRef.current = 1;
            setOriginalOcrValues({});
          }
          
          lastLoadedRef.current = { id: currentId, fileKey, routeKey };
          setTableLoading(false);

          (async () => {
            try {
              setPageActivityLoading(true);
              setPageActivityError(null);
              const actRes = await invoiceActivityService.getApprovers(currentId || "");
              setPageActivities(actRes.data || []);
            } catch (e) {
              console.error("Error loading page activity:", e);
              setPageActivityError("Failed to load activity");
            } finally {
              setPageActivityLoading(false);
            }
          })();
          
        } else if (shouldLoadFromUpload && incomingFile) {
          if (isActive) {
            setInvoiceNumber("");
            setInvoiceDate("");
            setVendorId("");
            setGstNumber("");
            setVendorName("");
            setVendorEmail("");
            setVendorPan("");
            setBillingAddress("");
            setShippingAddress("");
            setTableRows([]);
            setOriginalOcrValues({});
            setRawOcrPayload(null);
            setSubtotalAmount("0.00");
            setCgstAmount("0.00");
            setSgstAmount("0.00");
            setIgstAmount("0.00");
            setTotalAmount("0.00");
            nextRowIdRef.current = 1;
            setTableLoading(false);
            setInvoiceLoading(false);
          }
        }
      } catch (error) {
      } finally {
        if (isActive) {
          setTableLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  }, [location.pathname, location.state, id]);

  useEffect(() => {
    return () => {
      if (vendorSearchTimeoutRef.current) {
        clearTimeout(vendorSearchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (gstNumber.length === 15) {
      const matchedVendor = vendorSearchResults.find(v => v.gstin === gstNumber);
      if (matchedVendor) {
        setVendorName(matchedVendor.vendor_name || "");
        setVendorEmail(matchedVendor.email || "");
        setVendorPan(matchedVendor.pan || "");
        setVendorId(matchedVendor.vendor_code || "");
        
        if (matchedVendor.vendor_name) setValidationErrors(prev => ({ ...prev, vendorName: false }));
        if (matchedVendor.email) setValidationErrors(prev => ({ ...prev, vendorEmail: false }));
        if (matchedVendor.pan) setValidationErrors(prev => ({ ...prev, vendorPan: false }));
        if (matchedVendor.vendor_code) setValidationErrors(prev => ({ ...prev, vendorId: false }));
      }
    } else if (gstNumber.length > 0 && gstNumber.length !== 15) {
      setVendorName("");
      setVendorId("");
      setVendorEmail("");
      setVendorPan("");
    }
  }, [gstNumber, vendorSearchResults]);

  const searchVendors = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.trim().length < 3) {
      setVendorSearchResults([]);
      return;
    }

    setVendorSearchLoading(true);
    try {
      const response = await vendorService.searchVendorsByGst(searchTerm, 17, 0);
      setVendorSearchResults(response?.data || []);
    } catch (error) {
      console.error("Error searching vendors:", error);
      setVendorSearchResults([]);
    } finally {
      setVendorSearchLoading(false);
    }
  }, []);

  const handleGstNumberChange = useCallback((value: string) => {
    const limitedValue = value.slice(0, 15);
    setGstNumber(limitedValue);
    
    if (limitedValue.length !== 15) {
      setVendorName("");
      setVendorId("");
      setVendorEmail("");
      setVendorPan("");
    }
    
    if (vendorSearchTimeoutRef.current) {
      clearTimeout(vendorSearchTimeoutRef.current);
    }

    vendorSearchTimeoutRef.current = setTimeout(() => {
      if (limitedValue.trim() && limitedValue.trim().length >= 3) {
        searchVendors(limitedValue);
      } else {
        setVendorSearchResults([]);
      }
    }, 300);
  }, [searchVendors]);

  const handleVendorSelect = useCallback((vendor: VendorData | string | null) => {
    if (vendor && typeof vendor === 'object') {
      const gstin = vendor.gstin || "";
      setGstNumber(gstin);
      
      if (gstin.length === 15) {
        setVendorName(vendor.vendor_name || "");
        setVendorEmail(vendor.email || "");
        setVendorPan(vendor.pan || "");
        setVendorId(vendor.vendor_code || "");
        
        if (vendor.vendor_name) setValidationErrors(prev => ({ ...prev, vendorName: false }));
        if (vendor.email) setValidationErrors(prev => ({ ...prev, vendorEmail: false }));
        if (vendor.pan) setValidationErrors(prev => ({ ...prev, vendorPan: false }));
        if (vendor.vendor_code) setValidationErrors(prev => ({ ...prev, vendorId: false }));
        setValidationErrors(prev => ({ ...prev, gstNumber: false }));
      } else {
        setVendorName("");
        setVendorId("");
        setVendorEmail("");
        setVendorPan("");
      }
    } else if (typeof vendor === 'string') {
      setGstNumber(vendor);
      
      if (vendor.length === 15) {
        const cachedVendor = vendorSearchResults.find(v => v.gstin === vendor);
        if (cachedVendor) {
          setVendorName(cachedVendor.vendor_name || "");
          setVendorEmail(cachedVendor.email || "");
          setVendorPan(cachedVendor.pan || "");
          setVendorId(cachedVendor.vendor_code || "");
          
          if (cachedVendor.vendor_name) setValidationErrors(prev => ({ ...prev, vendorName: false }));
          if (cachedVendor.email) setValidationErrors(prev => ({ ...prev, vendorEmail: false }));
          if (cachedVendor.pan) setValidationErrors(prev => ({ ...prev, vendorPan: false }));
          if (cachedVendor.vendor_code) setValidationErrors(prev => ({ ...prev, vendorId: false }));
          setValidationErrors(prev => ({ ...prev, gstNumber: false }));
        } else {
          setVendorName("");
          setVendorId("");
          setVendorEmail("");
          setVendorPan("");
        }
      } else {
        setVendorName("");
        setVendorId("");
        setVendorEmail("");
        setVendorPan("");
      }
    } else {
      setGstNumber("");
      setVendorName("");
      setVendorId("");
      setVendorEmail("");
      setVendorPan("");
    }
  }, [vendorSearchResults]);

  const addTableRow = useCallback(() => {
    const newRow: InvoiceLineRow = {
      id: nextRowIdRef.current++,
      invoiceLineItemId: undefined,
      itemDescription: "",
      quantity: "",
      rate: "",
      hsnCode: "",
      tdsCode: "",
      tdsAmount: "",
      gstCode: "",
      igst: "",
      cgst: "",
      sgst: "",
      utgst: "",
      netAmount: "",
    };
    setTableRows((prev) => [...prev, newRow]);
  }, []);

  const isFieldChanged = useCallback(
    (rowId: number, field: keyof Omit<InvoiceLineRow, "id">, currentValue: string): boolean => {
      const currentRow = tableRows.find(r => r.id === rowId);
      let ocrLineItem = null;
      
      if (rawOcrPayload && rawOcrPayload.invoice_lineitems && currentRow) {
        const descriptionToMatch = field === "itemDescription" 
          ? (originalOcrValues[rowId]?.itemDescription || currentRow.itemDescription)
          : currentRow.itemDescription;
        
        const matchingByDescription = rawOcrPayload.invoice_lineitems.find(
          (item: any) => item.description && 
          String(item.description).trim() === String(descriptionToMatch || "").trim()
        );
        
        ocrLineItem = matchingByDescription || rawOcrPayload.invoice_lineitems[rowId - 1];
      } else if (rawOcrPayload && rawOcrPayload.invoice_lineitems) {
        ocrLineItem = rawOcrPayload.invoice_lineitems[rowId - 1];
      }
      
      if (ocrLineItem) {
        let ocrValue: any = null;
        switch (field) {
          case "itemDescription":
            ocrValue = ocrLineItem.description;
            break;
          case "quantity":
            ocrValue = ocrLineItem.quantity;
            break;
          case "rate":
            ocrValue = ocrLineItem.unit_price;
            break;
          case "igst":
            ocrValue = ocrLineItem.igst_amount;
            break;
          case "cgst":
            ocrValue = ocrLineItem.cgst_amount;
            break;
          case "sgst":
            ocrValue = ocrLineItem.sgst_amount;
            break;
          case "netAmount":
            ocrValue = ocrLineItem.total;
            break;
        }
        
        if (ocrValue !== undefined && ocrValue !== null) {
          if (typeof ocrValue === 'number') {
            const currentNum = parseFloat(currentValue);
            if (!isNaN(currentNum)) {
              return Math.abs(ocrValue - currentNum) > 0.01;
            }
          } else {
            const normalizedOcr = String(ocrValue).trim();
            const normalizedCurrent = String(currentValue || "").trim();
            if (normalizedOcr && normalizedCurrent && normalizedOcr !== normalizedCurrent) {
              return true;
            }
          }
        }
      }
      
      const original = originalOcrValues[rowId];
      if (original) {
        const originalValue = original[field];
        if (originalValue !== undefined && originalValue !== null) {
          const normalizedOriginal = String(originalValue).trim();
          const normalizedCurrent = String(currentValue || "").trim();
          if (normalizedOriginal && normalizedCurrent && normalizedOriginal !== normalizedCurrent) {
            return true;
          }
        }
      }
      
      return false;
    },
    [originalOcrValues, rawOcrPayload, tableRows]
  );

  const compareWithOcr = (field: string, currentValue: string | number | null): boolean => {
    if (!rawOcrPayload) return false;
    
    let ocrField = field;
    if (field === "vendor_id") {
      ocrField = "vendor_id";
    }
    
    const ocrValue = (rawOcrPayload as any)[ocrField];
    if (ocrValue === undefined || ocrValue === null) {
      if (field === "vendor_id" && rawOcrPayload.gst_number) {
        const gstFromOcr = rawOcrPayload.gst_number;
        const currentGst = gstNumber;
        return String(gstFromOcr).trim() !== String(currentGst || "").trim();
      }
      return false;
    }
    
    if (field === "invoice_date") {
      const ocrDate = String(ocrValue).split("T")[0];
      const currentDate = String(currentValue || "").split("T")[0];
      if (currentDate.includes("/")) {
        const parts = currentDate.split("/");
        if (parts.length === 3) {
          const normalizedCurrent = `${parts[2]}-${parts[1]}-${parts[0]}`;
          return ocrDate !== normalizedCurrent;
        }
      }
      return ocrDate !== currentDate;
    }
    
    if (typeof ocrValue === 'number') {
      const currentNum = typeof currentValue === 'string' ? parseFloat(currentValue) : currentValue;
      if (typeof currentNum === 'number' && !isNaN(currentNum)) {
        return Math.abs(ocrValue - currentNum) > 0.01;
      }
    }
    
    const normalizedOcr = String(ocrValue).trim();
    const normalizedCurrent = String(currentValue || "").trim();
    
    if (!normalizedOcr && !normalizedCurrent) return false;
    return normalizedOcr !== normalizedCurrent;
  };

  const getFieldHighlightClass = (field: string, currentValue: string | number | null): string => {
    return compareWithOcr(field, currentValue) ? "bg-yellow-100" : "";
  };

  const processHsnMatching = useCallback((rows: InvoiceLineRow[], ocrPayload: any) => {
    if (itemsData.length === 0) {
      return;
    }

    const unmatchedRows = new Set<number>();
    const updatedRows = rows.map((row) => {
      let hsnToMatch = "";
      
      if (row.hsnCode && row.hsnCode.trim()) {
        hsnToMatch = String(row.hsnCode).trim().toUpperCase();
      } else if (ocrPayload?.invoice_lineitems) {
        const ocrLineItem = ocrPayload.invoice_lineitems[row.id - 1];
        if (ocrLineItem?.hsn_sac) {
          hsnToMatch = String(ocrLineItem.hsn_sac).trim().toUpperCase();
        }
      }
      
      if (!hsnToMatch) {
        return row;
      }

      const matchingItem = itemsData.find(
        (item) => String(item.hsn_sac_code || "").trim().toUpperCase() === hsnToMatch
      );

      if (matchingItem) {
        const updatedRow = { ...row };
        
        if (!updatedRow.hsnCode.trim()) {
          updatedRow.hsnCode = hsnToMatch;
        }
        
        if (matchingItem.description) {
          updatedRow.itemDescription = matchingItem.description;
        }
        
        if (matchingItem.tax_code) {
          updatedRow.gstCode = matchingItem.tax_code;
          
          const taxData = taxDataCache[matchingItem.tax_code];
          if (taxData) {
            const quantity = parseFloat(updatedRow.quantity) || 0;
            const rate = parseFloat(updatedRow.rate) || 0;
            const baseAmount = quantity * rate;
            
            const igstPercentage = parseFloat(taxData.igst_percentage) || 0;
            const cgstPercentage = parseFloat(taxData.cgst_percentage) || 0;
            const sgstPercentage = parseFloat(taxData.sgst_percentage) || 0;
            const utgstPercentage = parseFloat(taxData.utgst_percentage) || 0;
            
            updatedRow.igst = ((baseAmount * igstPercentage) / 100).toFixed(2);
            updatedRow.cgst = ((baseAmount * cgstPercentage) / 100).toFixed(2);
            updatedRow.sgst = ((baseAmount * sgstPercentage) / 100).toFixed(2);
            updatedRow.utgst = ((baseAmount * utgstPercentage) / 100).toFixed(2);
          }
        }
        
        if (matchingItem.tds_code) {
          updatedRow.tdsCode = matchingItem.tds_code;
          
          const tdsData = tdsDataCache[matchingItem.tds_code];
          if (tdsData) {
            const quantity = parseFloat(updatedRow.quantity) || 0;
            const rate = parseFloat(updatedRow.rate) || 0;
            const baseAmount = quantity * rate;
            const tdsPercentage = parseFloat(tdsData.tds_percentage) || 0;
            updatedRow.tdsAmount = ((baseAmount * tdsPercentage) / 100).toFixed(2);
          }
        }
        
        setOriginalOcrValues(prev => ({
          ...prev,
          [updatedRow.id]: { ...prev[updatedRow.id], ...updatedRow }
        }));
        
        return updatedRow;
      } else {
        unmatchedRows.add(row.id);
        return row;
      }
    });

    setTableRows(updatedRows);
    setUnmatchedHsnRows(unmatchedRows);
  }, [itemsData, taxDataCache, tdsDataCache]);

  useEffect(() => {
    if (itemsData.length > 0 && tableRows.length > 0 && Object.keys(taxDataCache).length > 0 && Object.keys(tdsDataCache).length > 0 && !hsnMatchingProcessedRef.current) {
      const timeoutId = setTimeout(() => {
        processHsnMatching(tableRows, rawOcrPayload);
        hsnMatchingProcessedRef.current = true;
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [itemsData.length, tableRows.length, Object.keys(taxDataCache).length, Object.keys(tdsDataCache).length]);
  
  useEffect(() => {
    hsnMatchingProcessedRef.current = false;
  }, [id]);

  const updateTableRow = useCallback(
    (rowId: number, field: keyof Omit<InvoiceLineRow, "id">, value: string) => {
      setTableRows((prev) => {
        const updated = prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row));
        
        if (field === "gstCode" || field === "tdsCode" || field === "quantity" || field === "rate") {
          const row = updated.find(r => r.id === rowId);
          if (row) {
            const quantity = parseFloat(row.quantity) || 0;
            const rate = parseFloat(row.rate) || 0;
            const baseAmount = quantity * rate;
            
            if (row.gstCode && taxDataCache[row.gstCode]) {
              const taxData = taxDataCache[row.gstCode];
              const igstPercentage = parseFloat(taxData.igst_percentage) || 0;
              const cgstPercentage = parseFloat(taxData.cgst_percentage) || 0;
              const sgstPercentage = parseFloat(taxData.sgst_percentage) || 0;
              const utgstPercentage = parseFloat(taxData.utgst_percentage) || 0;
              
              row.igst = ((baseAmount * igstPercentage) / 100).toFixed(2);
              row.cgst = ((baseAmount * cgstPercentage) / 100).toFixed(2);
              row.sgst = ((baseAmount * sgstPercentage) / 100).toFixed(2);
              row.utgst = ((baseAmount * utgstPercentage) / 100).toFixed(2);
            }
            
            if (row.tdsCode && tdsDataCache[row.tdsCode]) {
              const tdsData = tdsDataCache[row.tdsCode];
              const tdsPercentage = parseFloat(tdsData.tds_percentage) || 0;
              row.tdsAmount = ((baseAmount * tdsPercentage) / 100).toFixed(2);
            }
          }
        }
        
        return updated;
      });
    },
    [taxDataCache, tdsDataCache]
  );


  const executeAction = async () => {
    if (!id || !actionType) return;

    if (!comments.trim()) {
      toast.error("Notes are required");
      return;
    }

    setActionLoading(true);
    try {
      const result = await approveOrRejectInvoice(id, {
        action: actionType,
        notes: comments,
      });
      toast.success(result.message);
      setShowActionDialog(false);
      setComments("");
      navigate("/flow/approvals");
    } catch (error: any) {
      console.error(`Failed to ${actionType} invoice`, error);
      toast.error(
        error?.response?.data?.message || `Failed to ${actionType} invoice`
      );
    } finally {
      setActionLoading(false);
    }
  };

  const validateFields = (): boolean => {
    const errors: Record<string, boolean> = {};
    const lineItemErrors: Record<number, Record<string, boolean>> = {};
    
    if (!invoiceNumber.trim()) errors.invoiceNumber = true;
    if (!invoiceDate.trim()) errors.invoiceDate = true;
    if (!gstNumber.trim() || gstNumber.length !== 15) errors.gstNumber = true;
    if (!vendorId.trim()) errors.vendorId = true;
    if (!vendorName.trim()) errors.vendorName = true;
    if (!vendorPan.trim()) errors.vendorPan = true;
    if (!vendorEmail.trim()) errors.vendorEmail = true;
    if (!billingAddress.trim()) errors.billingAddress = true;
    if (!shippingAddress.trim()) errors.shippingAddress = true;
    
    if (tableRows.length === 0) {
      toast.error("Please add at least one line item");
      return false;
    }
    
    tableRows.forEach((row) => {
      const rowErrors: Record<string, boolean> = {};
      if (!row.itemDescription.trim()) rowErrors.itemDescription = true;
      if (!row.quantity.trim() || parseFloat(row.quantity) <= 0) rowErrors.quantity = true;
      if (!row.rate.trim() || parseFloat(row.rate) <= 0) rowErrors.rate = true;
      if (!row.tdsCode.trim()) rowErrors.tdsCode = true;
      if (!row.tdsAmount.trim() || parseFloat(row.tdsAmount) < 0) rowErrors.tdsAmount = true;
      if (!row.gstCode.trim()) rowErrors.gstCode = true;
      if (!row.igst.trim() || parseFloat(row.igst) < 0) rowErrors.igst = true;
      if (!row.cgst.trim() || parseFloat(row.cgst) < 0) rowErrors.cgst = true;
      if (!row.sgst.trim() || parseFloat(row.sgst) < 0) rowErrors.sgst = true;
      if (!row.utgst.trim() || parseFloat(row.utgst) < 0) rowErrors.utgst = true;
      if (!row.netAmount.trim() || parseFloat(row.netAmount) <= 0) rowErrors.netAmount = true;
      
      if (Object.keys(rowErrors).length > 0) {
        lineItemErrors[row.id] = rowErrors;
      }
    });
    
    setValidationErrors(errors);
    setLineItemValidationErrors(lineItemErrors);
    
    if (Object.keys(errors).length > 0 || Object.keys(lineItemErrors).length > 0) {
      toast.error("Please fill all required fields");
      return false;
    }
    
    return true;
  };

  const handleUpdateInvoice = async () => {
    if (!id) {
      toast.error("Invoice ID is missing");
      return;
    }

    if (!validateFields()) {
      return;
    }

    setUpdating(true);
    try {
      const updateData: UpdateInvoiceData = {
        invoice_number: invoiceNumber || null,
        type: invoiceType || null,
        invoice_date: invoiceDate || null,
        gst_number: gstNumber || null,
        billing_address: billingAddress || null,
        shipping_address: shippingAddress || null,
        currency: currency,
        invoice_lineitems: tableRows.map((row, index) => {
          const lineItem: any = {
            line_num: index + 1,
            description: row.itemDescription || null,
            quantity: row.quantity ? parseFloat(row.quantity).toFixed(4) : null,
            rate: row.rate ? parseFloat(row.rate).toFixed(4) : null,
            hsn_sac: row.hsnCode || null,
            cgst_amount: row.cgst || null,
            sgst_amount: row.sgst || null,
            igst_amount: row.igst || null,
            utgst_amount: row.utgst || null,
            discount: "0.0000",
            
            tax_code: row.gstCode || null,
            tds_code: row.tdsCode || null,
            tds_amount: row.tdsAmount || null,
          };

          const quantity = parseFloat(row.quantity) || 0;
          const rate = parseFloat(row.rate) || 0;
          const subtotal = quantity * rate;

          const cgst = parseFloat(row.cgst) || 0;
          const sgst = parseFloat(row.sgst) || 0;
          const igst = parseFloat(row.igst) || 0;
          const utgst = parseFloat(row.utgst) || 0;
          const calculatedTotal = subtotal + cgst + sgst + igst + utgst;

          lineItem.subtotal = subtotal.toFixed(2);
          lineItem.total = row.netAmount || calculatedTotal.toFixed(2);

          if (row.invoiceLineItemId) {
            lineItem.id = row.invoiceLineItemId;
          }

          return lineItem;
        }),
      };

      const response = await updateInvoice(id, updateData);
      toast.success(response.message || "Invoice updated successfully");
      navigate("/flow/invoice");
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast.error(error?.response?.data?.message || "Failed to update invoice. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmitInvoice = async () => {
    if (!id) {
      toast.error("Invoice ID is missing");
      return;
    }

    if (!validateFields()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await submitInvoice(id);
      toast.success(response.message || "Invoice submitted for approval");
      navigate("/flow/invoice");
    } catch (error: any) {
      console.error("Error submitting invoice:", error);
      toast.error(error?.response?.data?.message || "Failed to submit invoice. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInvoiceZoomIn = () => {
    setInvoiceZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleInvoiceZoomOut = () => {
    setInvoiceZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleInvoiceRotate = () => {
    setInvoiceRotation((prev) => (prev + 90) % 360);
  };

  const handleInvoiceReset = () => {
    setInvoiceZoom(1);
    setInvoiceRotation(0);
  };

  const handleInvoiceFullscreen = () => {
    setIsInvoiceFullscreen(true);
  };

  const handleInvoiceDownload = () => {
    const sourceUrl = downloadUrl || previewUrl;
    if (sourceUrl) {
      window.open(sourceUrl, "_blank", "noopener,noreferrer");
    }
  };

  const activeInvoiceUrl = downloadUrl || previewUrl;
  const isPdfInvoice = activeInvoiceUrl?.toLowerCase().includes(".pdf") || activeInvoiceUrl?.toLowerCase().includes("pdf");
  const hasInvoice = !!activeInvoiceUrl;
  const isInvoiceFinalized = invoiceStatus === "APPROVED" || invoiceStatus === "REJECTED";
  const isPendingApproval = invoiceStatus === "PENDING_APPROVAL";
  const isFieldDisabled = isApprovalMode || isInvoiceFinalized || isPendingApproval;
  const shouldShowButtons = !tableLoading && (invoiceStatus !== null || !id);

  const calculatedSubtotal = tableRows.reduce((sum, row) => sum + (parseFloat(row.netAmount) || 0), 0);
  const calculatedCgst = tableRows.reduce((sum, row) => sum + (parseFloat(row.cgst) || 0), 0);
  const calculatedSgst = tableRows.reduce((sum, row) => sum + (parseFloat(row.sgst) || 0), 0);
  const calculatedIgst = tableRows.reduce((sum, row) => sum + (parseFloat(row.igst) || 0), 0);
  const calculatedTds = tableRows.reduce((sum, row) => sum + (parseFloat(row.tdsAmount) || 0), 0);
  const calculatedTotalAmount = calculatedSubtotal + calculatedCgst + calculatedSgst + calculatedIgst;
  const calculatedTotalPayable = calculatedTotalAmount - calculatedTds;

  return (
    <div className="flex flex-col min-h-screen bg-sky-100">
      <div className="bg-white border-b px-0 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center hover:bg-gray-100 rounded p-1 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-900" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {isApprovalMode ? "Approval" : invoiceNumber || "Invoice"}
          </h1>
        </div>
      </div>
      <div className="flex flex-shrink-0" style={{ height: 'calc(100vh - 240px)', minHeight: '450px' }}>
        {/* Left Panel - Invoice Document */}
        <div className="w-2/5 border-r overflow-hidden bg-sky-100 p-2 flex flex-col">
          {/* Invoice Document Preview Box */}
          <div className="flex-1 border-2 border-gray-400 rounded-lg bg-white shadow-lg flex flex-col overflow-hidden">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 p-2">
              {invoiceLoading || (tableLoading && id && !uploadedFile && !previewUrl) ? (
                <div className="flex flex-col items-center justify-center gap-3 p-16 text-center h-full">
                  <Loader2 className="h-12 w-12 text-[#0D9C99] animate-spin" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Loading invoice...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Please wait while we fetch the document
                    </p>
                  </div>
                </div>
              ) : hasInvoice ? (
                <div className="flex items-center justify-center p-4 h-full">
                  {isPdfInvoice ? (
                    <embed
                      src={`${activeInvoiceUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      type="application/pdf"
                      className="w-full h-full block rounded-xl border border-gray-200 bg-white"
                      style={{
                        transform: `scale(${invoiceZoom}) rotate(${invoiceRotation}deg)`,
                        transformOrigin: "center",
                      }}
                    />
                  ) : (
                    <img
                      src={activeInvoiceUrl ?? ""}
                      alt="Invoice preview"
                      className="w-[70%] bg-white object-contain"
                      style={{
                        transform: `scale(${invoiceZoom}) rotate(${invoiceRotation}deg)`,
                        transformOrigin: "center",
                      }}
                      onClick={handleInvoiceFullscreen}
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
                  <FileText className="h-14 w-14 text-gray-300" />
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        No invoice uploaded
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Invoice document will appear here
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 p-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {uploadedFile && (
                  <p className="text-sm font-medium text-gray-900">
                    {uploadedFile.name}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={handleInvoiceZoomOut}
                  disabled={!hasInvoice || invoiceZoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={handleInvoiceZoomIn}
                  disabled={!hasInvoice || invoiceZoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={handleInvoiceRotate}
                  disabled={!hasInvoice}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={handleInvoiceReset}
                  disabled={!hasInvoice}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3"
                  onClick={handleInvoiceFullscreen}
                  disabled={!hasInvoice}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  View
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3"
                  onClick={handleInvoiceDownload}
                  disabled={!hasInvoice && !uploadedFile}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Panel - Form Fields */}
        <div className="w-2/5 border-r overflow-y-auto p-3 bg-white">
          <div className="space-y-2">
            {/* Basic Details */}
            <div className="space-y-1.5">
            <h2 className="font-medium text-[12px] leading-[100%] tracking-[0%] text-gray-500 uppercase">CHOOSE BASIC DETAILS</h2>
              <div className="grid grid-cols-2 gap-2 items-end">
                    <div>
                      <Label htmlFor="invoice-number" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                        Invoice Number
                      </Label>
                      <Input
                        id="invoice-number"
                        value={invoiceNumber}
                        onChange={(e) => {
                          setInvoiceNumber(e.target.value);
                          if (validationErrors.invoiceNumber && e.target.value.trim()) {
                            setValidationErrors(prev => ({ ...prev, invoiceNumber: false }));
                          }
                        }}
                        className={`mt-0.5 h-[33px] border-[0.7px] rounded-[4px] py-2 px-3 text-sm font-normal ${getFieldHighlightClass("invoice_number", invoiceNumber)} ${validationErrors.invoiceNumber ? 'border-red-500' : 'border-[#E9EAEE]'}`}
                        style={{ borderWidth: '0.7px' }}
                        placeholder="Enter invoice number"
                        disabled={isFieldDisabled}
                      />
                      {validationErrors.invoiceNumber && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="invoice-date" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                        Invoice Date
                      </Label>
                      <DateField
                        id="invoice-date"
                        value={invoiceDate}
                        onChange={(value) => {
                          setInvoiceDate(value || "");
                          if (validationErrors.invoiceDate && value?.trim()) {
                            setValidationErrors(prev => ({ ...prev, invoiceDate: false }));
                          }
                        }}
                        disabled={isFieldDisabled}
                        className={`mt-0.5 h-[33px] border-[0.7px] rounded-[4px] ${getFieldHighlightClass("invoice_date", invoiceDate)} ${validationErrors.invoiceDate ? '!border-red-500' : 'border-[#E9EAEE]'}`}
                      />
                      {validationErrors.invoiceDate && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="gst-number" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                        GST Number
                      </Label>
                      <Autocomplete
                        id="gst-number"
                        options={vendorSearchResults}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.gstin}
                        value={vendorSearchResults.find(v => v.gstin === gstNumber) || (gstNumber ? gstNumber : null)}
                        inputValue={gstNumber}
                        onInputChange={(_event, newInputValue) => {
                          handleGstNumberChange(newInputValue);
                          if (validationErrors.gstNumber && newInputValue.trim() && newInputValue.length === 15) {
                            setValidationErrors(prev => ({ ...prev, gstNumber: false }));
                          }
                        }}
                        onChange={(_event, newValue) => {
                          handleVendorSelect(newValue);
                          if (validationErrors.gstNumber && newValue && typeof newValue === 'object' && newValue.gstin && newValue.gstin.length === 15) {
                            setValidationErrors(prev => ({ ...prev, gstNumber: false }));
                          }
                        }}
                        loading={vendorSearchLoading}
                        disabled={isFieldDisabled}
                        freeSolo
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Search GST number..."
                            inputProps={{
                              ...params.inputProps,
                              maxLength: 15,
                            }}
                            className="mt-0.5"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                height: '33px',
                                fontSize: '14px',
                                borderRadius: '4px',
                                backgroundColor: (() => {
                                  if (!rawOcrPayload) return 'white';
                                  const ocrGst = rawOcrPayload.gst_number;
                                  if (ocrGst && String(ocrGst).trim() !== String(gstNumber || "").trim()) {
                                    return '#FEF3C7';
                                  }
                                  return 'white';
                                })(),
                                '& fieldset': {
                                  borderColor: validationErrors.gstNumber ? '#EF4444' : '#E9EAEE',
                                  borderWidth: '0.7px',
                                },
                                '&:hover fieldset': {
                                  borderColor: validationErrors.gstNumber ? '#EF4444' : '#E9EAEE',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: validationErrors.gstNumber ? '#EF4444' : '#0D9C99',
                                  borderWidth: '0.7px',
                                },
                              },
                            }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <li {...props} key={option.id}>
                            <div className="flex flex-col w-full">
                              <span className="font-medium">{option.gstin}</span>
                              {option.vendor_name && (
                                <span className="text-xs text-gray-500">{option.vendor_name}</span>
                              )}
                            </div>
                          </li>
                        )}
                        noOptionsText={gstNumber ? "No vendors found" : "Start typing to search..."}
                      />
                      {validationErrors.gstNumber && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="vendor-id" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                        Vendor ID
                      </Label>
                      <Input
                        id="vendor-id"
                        value={vendorId}
                        readOnly
                        className={`mt-0.5 h-[33px] border-[0.7px] rounded-[4px] py-2 px-3 text-sm font-normal bg-gray-50 ${getFieldHighlightClass("vendor_id", vendorId)} ${validationErrors.vendorId ? 'border-red-500' : 'border-[#E9EAEE]'}`}
                        style={{ borderWidth: '0.7px' }}
                        placeholder={gstNumber.length === 15 ? "Vendor ID" : "Fill GST number first"}
                        disabled={isFieldDisabled || gstNumber.length !== 15}
                      />
                      {validationErrors.vendorId && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="vendor-name" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                        Vendor Name
                      </Label>
                      <Input
                        id="vendor-name"
                        value={vendorName}
                        readOnly
                        className={`mt-0.5 h-[33px] border-[0.7px] rounded-[4px] py-2 px-3 text-sm font-normal bg-gray-50 ${validationErrors.vendorName ? 'border-red-500' : 'border-[#E9EAEE]'}`}
                        style={{ borderWidth: '0.7px' }}
                        placeholder={gstNumber.length === 15 ? "Vendor name" : "Fill GST number first"}
                        disabled={isFieldDisabled || gstNumber.length !== 15}
                      />
                      {validationErrors.vendorName && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="vendor-pan" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>PAN</Label>
                      <Input
                        id="vendor-pan"
                        value={vendorPan}
                        readOnly
                        className={`mt-0.5 h-[33px] border-[0.7px] rounded-[4px] py-2 px-3 text-sm font-normal bg-gray-50 ${validationErrors.vendorPan ? 'border-red-500' : 'border-[#E9EAEE]'}`}
                        style={{ borderWidth: '0.7px' }}
                        placeholder={gstNumber.length === 15 ? "PAN number" : "Fill GST number first"}
                        disabled={isFieldDisabled || gstNumber.length !== 15}
                      />
                      {validationErrors.vendorPan && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="vendor-email" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Vendor Email</Label>
                      <Input
                        id="vendor-email"
                        type="email"
                        value={vendorEmail}
                        readOnly
                        className={`mt-0.5 h-[33px] border-[0.7px] rounded-[4px] py-2 px-3 text-sm font-normal bg-gray-50 ${validationErrors.vendorEmail ? 'border-red-500' : 'border-[#E9EAEE]'}`}
                        style={{ borderWidth: '0.7px' }}
                        placeholder={gstNumber.length === 15 ? "Vendor email" : "Fill GST number first"}
                        disabled={isFieldDisabled || gstNumber.length !== 15}
                      />
                      {validationErrors.vendorEmail && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-3 border-t border-gray-200 pt-3">
              <h2 className="font-medium text-[12px] leading-[100%] tracking-[0%] text-gray-500 uppercase">ADDRESSES</h2>
              <div className="space-y-3">
                    <div>
                      <Label htmlFor="billing-address" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Billing Address</Label>
                      <Textarea
                        id="billing-address"
                        value={billingAddress}
                        onChange={(e) => {
                          setBillingAddress(e.target.value);
                          if (validationErrors.billingAddress && e.target.value.trim()) {
                            setValidationErrors(prev => ({ ...prev, billingAddress: false }));
                          }
                        }}
                        className={`mt-1 font-normal min-h-[120px] resize-none border-[0.7px] rounded-[4px] py-2 px-3 ${getFieldHighlightClass("billing_address", billingAddress)} ${validationErrors.billingAddress ? 'border-red-500' : 'border-[#E9EAEE]'}`}
                        style={{ borderWidth: '0.7px' }}
                        placeholder="Enter billing address..."
                        disabled={isFieldDisabled}
                      />
                      {validationErrors.billingAddress && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="shipping-address" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Shipping Address</Label>
                      <Textarea
                        id="shipping-address"
                        value={shippingAddress}
                        onChange={(e) => {
                          setShippingAddress(e.target.value);
                          if (validationErrors.shippingAddress && e.target.value.trim()) {
                            setValidationErrors(prev => ({ ...prev, shippingAddress: false }));
                          }
                        }}
                        className={`mt-1 font-normal min-h-[120px] resize-none border-[0.7px] rounded-[4px] py-2 px-3 ${getFieldHighlightClass("shipping_address", shippingAddress)} ${validationErrors.shippingAddress ? 'border-red-500' : 'border-[#E9EAEE]'}`}
                        style={{ borderWidth: '0.7px' }}
                        placeholder="Enter shipping address..."
                        disabled={isFieldDisabled}
                      />
                      {validationErrors.shippingAddress && (
                        <p className="text-red-500 text-xs mt-0.5">Required field</p>
                      )}
                    </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Validation Tabs */}
        <div className="w-1/5 flex flex-col bg-white border-l border-gray-200">
          <Tabs defaultValue="validation" className="w-full h-full flex flex-col">
            <div className="flex-shrink-0 border-b border-gray-200 px-4 pt-4">
              <TabsList className="w-full border-b-0 mb-0 h-auto p-0 bg-transparent inline-flex items-center justify-start rounded-none gap-0">
                <TabsTrigger
                  value="validation"
                  className="flex-1 text-xs font-medium text-gray-600 data-[state=active]:text-[#0D9C99] data-[state=active]:border-b-2 data-[state=active]:border-[#0D9C99] rounded-none border-b-2 border-transparent pb-2 px-2 data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                >
                  Validation
                </TabsTrigger>
                <TabsTrigger
                  value="comment"
                  className="flex-1 text-xs font-medium text-gray-600 data-[state=active]:text-[#0D9C99] data-[state=active]:border-b-2 data-[state=active]:border-[#0D9C99] rounded-none border-b-2 border-transparent pb-2 px-2 data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                >
                  Comment
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="flex-1 text-xs font-medium text-gray-600 data-[state=active]:text-[#0D9C99] data-[state=active]:border-b-2 data-[state=active]:border-[#0D9C99] rounded-none border-b-2 border-transparent pb-2 px-2 data-[state=active]:shadow-none data-[state=active]:bg-transparent"
                >
                  Activity
                </TabsTrigger>
              </TabsList>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TabsContent value="validation" className="h-full mt-0">
                <InvoiceValidation invoiceId={id} />
              </TabsContent>
              <TabsContent value="comment" className="h-full mt-0">
                <InvoiceComment invoiceId={id} readOnly={false} />
              </TabsContent>
              <TabsContent value="activity" className="h-full mt-0">
                <InvoiceActivity invoiceId={id} activities={pageActivities} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        <LineItemsTable
          rows={tableRows}
          isLoading={tableLoading}
          isApprovalMode={isApprovalMode || isInvoiceFinalized || isPendingApproval}
          onRowUpdate={updateTableRow}
          onAddRow={addTableRow}
          isFieldChanged={isFieldChanged}
          validationErrors={lineItemValidationErrors}
          unmatchedHsnRows={unmatchedHsnRows}
          onValidationErrorChange={(rowId, field, hasError) => {
            setLineItemValidationErrors(prev => {
              const newErrors = { ...prev };
              if (!newErrors[rowId]) {
                newErrors[rowId] = {};
              }
              if (hasError) {
                newErrors[rowId][field] = true;
              } else {
                delete newErrors[rowId][field];
                if (Object.keys(newErrors[rowId]).length === 0) {
                  delete newErrors[rowId];
                }
              }
              return newErrors;
            });
          }}
        />

        {/* Summary Section */}
        <div className="bg-white border-t border-gray-200 pb-20">
          <div className="flex justify-end pr-6 pl-0 py-1">
            <div className="flex flex-col items-end min-w-[140px]">
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">Subtotal</Label>
                <div className={`w-[140px] h-8 flex items-center justify-end px-0 ${getFieldHighlightClass("subtotal_amount", calculatedSubtotal) ? "bg-yellow-100" : "bg-gray-50"}`}>
                  <span className="text-xs font-medium text-right">{formatCurrency(calculatedSubtotal)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">CGST</Label>
                <div className={`w-[140px] h-8 flex items-center justify-end px-0 ${getFieldHighlightClass("cgst_amount", calculatedCgst) ? "bg-yellow-100" : "bg-gray-50"}`}>
                  <span className="text-xs font-medium text-right">{formatCurrency(calculatedCgst)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">SGST</Label>
                <div className={`w-[140px] h-8 flex items-center justify-end px-0 ${getFieldHighlightClass("sgst_amount", calculatedSgst) ? "bg-yellow-100" : "bg-gray-50"}`}>
                  <span className="text-xs font-medium text-right">{formatCurrency(calculatedSgst)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">IGST</Label>
                <div className={`w-[140px] h-8 flex items-center justify-end px-0 ${getFieldHighlightClass("igst_amount", calculatedIgst) ? "bg-yellow-100" : "bg-gray-50"}`}>
                  <span className="text-xs font-medium text-right">{formatCurrency(calculatedIgst)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full border-t border-gray-300 pt-1 py-1">
                <Label className="font-semibold text-xs text-gray-900 whitespace-nowrap">Total Amount</Label>
                <div className={`w-[140px] h-8 flex items-center justify-end px-0 ${getFieldHighlightClass("total_amount", calculatedTotalAmount) ? "bg-yellow-100" : "bg-gray-50"}`}>
                  <span className="text-xs font-semibold text-right">{formatCurrency(calculatedTotalAmount)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">TDS</Label>
                <div className="w-[140px] h-8 bg-gray-50 flex items-center justify-end px-0">
                  <span className="text-xs font-medium text-right">{formatCurrency(calculatedTds)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full border-t border-gray-300 pt-1 py-1">
                <Label className="font-semibold text-xs text-gray-900 whitespace-nowrap">Total Payable</Label>
                <div className="w-[140px] h-8 bg-gray-50 flex items-center justify-end px-0">
                  <span className="text-xs font-semibold text-right">{formatCurrency(calculatedTotalPayable)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isApprovalMode ? (
        <FormActionFooter
          secondaryButton={{
            label: "Reject",
            onClick: () => {
              setActionType("reject");
              setComments("");
              setShowActionDialog(true);
            },
            disabled: isInvoiceFinalized,
          }}
          primaryButton={{
            label: "Approve",
            onClick: () => {
              setActionType("approve");
              setComments("");
              setShowActionDialog(true);
            },
            disabled: isInvoiceFinalized,
          }}
        />
      ) : shouldShowButtons && !isInvoiceFinalized && !isPendingApproval ? (
        <FormActionFooter
          secondaryButton={{
            label: "Update",
            onClick: handleUpdateInvoice,
            disabled: updating || !id,
            loading: updating,
            loadingText: "Updating...",
          }}
          primaryButton={{
            label: "Submit Invoice",
            onClick: handleSubmitInvoice,
            disabled: submitting || !id,
            loading: submitting,
            loadingText: "Submitting...",
          }}
        />
      ) : null}

      {/* Fullscreen Invoice Modal */}
      {isInvoiceFullscreen && hasInvoice && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex flex-col">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Invoice Viewer
                </h3>
                {uploadedFile && (
                  <span className="text-sm text-gray-500">
                    {uploadedFile.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInvoiceZoomOut}
                  disabled={invoiceZoom <= 0.5}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                  {Math.round(invoiceZoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInvoiceZoomIn}
                  disabled={invoiceZoom >= 3}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInvoiceRotate}
                  className="h-8 w-8 p-0"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInvoiceReset}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleInvoiceDownload}
                  className="h-8 px-3 text-xs"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsInvoiceFullscreen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Fullscreen Content */}
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
              {isPdfInvoice ? (
                <div className="w-full h-full bg-white rounded">
                  <embed
                    src={`${activeInvoiceUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0`}
                    type="application/pdf"
                    className="w-full h-full border-0 rounded"
                    style={{
                      transform: `scale(${invoiceZoom}) rotate(${invoiceRotation}deg)`,
                      transformOrigin: "center",
                    }}
                  />
                </div>
              ) : (
                <img
                  src={activeInvoiceUrl || ""}
                  alt="Invoice fullscreen"
                  className="max-w-full max-h-full object-contain"
                  style={{
                    transform: `scale(${invoiceZoom}) rotate(${invoiceRotation}deg)`,
                    transformOrigin: "center",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval/Reject Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Invoice" : "Reject Invoice"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  actionType === "approve"
                    ? "Please provide notes for approval..."
                    : "Please provide reason for rejection..."
                }
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowActionDialog(false);
                setComments("");
              }}
              disabled={actionLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              disabled={actionLoading || !comments.trim()}
              className={`w-full sm:w-auto ${
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {actionType === "approve" ? "Approving..." : "Rejecting..."}
                </>
              ) : (
                <>
                  {actionType === "approve" ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  {actionType === "approve" ? "Approve Invoice" : "Reject Invoice"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

