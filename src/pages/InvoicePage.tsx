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
import { DateField } from "@/components/ui/date-field";
import { formatCurrency } from "@/lib/utils";
import { Autocomplete, TextField } from "@mui/material";
import { vendorService, VendorData } from "@/services/vendorService";
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

  // Force sidebar to stay collapsed on invoice page - not expandable
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
  const [currency, setCurrency] = useState("INR");
  const [invoiceType, setInvoiceType] = useState("PO");
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
  
  // Approval dialog state
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [comments, setComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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
    // Set invoice loading immediately if we're loading from ID
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
            if (isActive) {
              setTableLoading(false);
            }
            return;
          }
          
          const invoice = Array.isArray(response.data) && response.data.length > 0
            ? response.data[0] 
            : null;
          
          if (!invoice || !isActive) {
            if (isActive) {
              setTableLoading(false);
              setInvoiceLoading(false);
            }
            return;
          }

          // Set invoice status
          if (isActive) {
            setInvoiceStatus(invoice.status || null);
          }

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
                const vendorResponse = await vendorService.searchVendorsByGst(invoice.gst_number);
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
              // Loading state already set above, just fetch the URL
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
            const rowsWithIds: InvoiceLineRow[] = invoice.invoice_lineitems.map((item, idx) => ({
              id: idx + 1,
              invoiceLineItemId: item.id || undefined,
              itemDescription: item.description || "",
              quantity: item.quantity ? parseFloat(item.quantity).toString() : "",
              rate: item.rate || item.unit_price || "",
              tdsCode: item.tds_code || "",
              tdsAmount: item.tds_amount || "",
              gstCode: item.tax_code || "",
              igst: item.igst_amount || "",
              cgst: item.cgst_amount || "",
              sgst: item.sgst_amount || "",
              utgst: item.utgst_amount || "",
              netAmount: item.total || "",
            }));
            
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
        // Error handled silently - keep existing data
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (vendorSearchTimeoutRef.current) {
        clearTimeout(vendorSearchTimeoutRef.current);
      }
    };
  }, []);

  // Auto-fill vendor details when GST number reaches exactly 15 characters
  useEffect(() => {
    if (gstNumber.length === 15) {
      // Check if we have a matching vendor in search results
      const matchedVendor = vendorSearchResults.find(v => v.gstin === gstNumber);
      if (matchedVendor) {
        setVendorName(matchedVendor.vendor_name || "");
        setVendorEmail(matchedVendor.email || "");
        setVendorPan(matchedVendor.pan || "");
        setVendorId(matchedVendor.vendor_code || "");
      }
    } else if (gstNumber.length > 0 && gstNumber.length !== 15) {
      // Clear vendor details if GST number is not exactly 15 characters
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
      const response = await vendorService.searchVendorsByGst(searchTerm);
      setVendorSearchResults(response?.data || []);
    } catch (error) {
      console.error("Error searching vendors:", error);
      setVendorSearchResults([]);
    } finally {
      setVendorSearchLoading(false);
    }
  }, []);

  const handleGstNumberChange = useCallback((value: string) => {
    // Limit GST number to 15 characters
    const limitedValue = value.slice(0, 15);
    setGstNumber(limitedValue);
    
    // Clear vendor details if GST number is not exactly 15 characters
    if (limitedValue.length !== 15) {
      setVendorName("");
      setVendorId("");
      setVendorEmail("");
      setVendorPan("");
    }
    
    // Clear previous timeout
    if (vendorSearchTimeoutRef.current) {
      clearTimeout(vendorSearchTimeoutRef.current);
    }

    // Debounce search - wait 300ms after user stops typing
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
      
      // Only fill vendor details if GST number is exactly 15 characters
      if (gstin.length === 15) {
        setVendorName(vendor.vendor_name || "");
        setVendorEmail(vendor.email || "");
        setVendorPan(vendor.pan || "");
        setVendorId(vendor.vendor_code || "");
      } else {
        // Clear vendor details if GST is not 15 characters
        setVendorName("");
        setVendorId("");
        setVendorEmail("");
        setVendorPan("");
      }
    } else if (typeof vendor === 'string') {
      // User typed a custom GST number
      setGstNumber(vendor);
      
      // Only fill vendor details if GST number is exactly 15 characters
      if (vendor.length === 15) {
        // Check if we have cached vendor data for this GST
        const cachedVendor = vendorSearchResults.find(v => v.gstin === vendor);
        if (cachedVendor) {
          setVendorName(cachedVendor.vendor_name || "");
          setVendorEmail(cachedVendor.email || "");
          setVendorPan(cachedVendor.pan || "");
          setVendorId(cachedVendor.vendor_code || "");
        } else {
          setVendorName("");
          setVendorId("");
          setVendorEmail("");
          setVendorPan("");
        }
      } else {
        // Clear vendor details if GST is not 15 characters
        setVendorName("");
        setVendorId("");
        setVendorEmail("");
        setVendorPan("");
      }
    } else {
      // Clear vendor data when selection is cleared
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
      invoiceLineItemId: undefined, // New rows don't have an invoice line item ID yet
      itemDescription: "",
      quantity: "",
      rate: "",
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

  const updateTableRow = useCallback(
    (rowId: number, field: keyof Omit<InvoiceLineRow, "id">, value: string) => {
      setTableRows((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
      );
    },
    []
  );

  const removeUploadedFile = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setUploadedFile(null);
  };

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
      // Navigate back to approvals list
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

  const handleUpdateInvoice = async () => {
    if (!id) {
      toast.error("Invoice ID is missing");
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
            cgst_amount: row.cgst || null,
            sgst_amount: row.sgst || null,
            igst_amount: row.igst || null,
            utgst_amount: row.utgst || null,
            discount: "0.0000",
            
            tax_code: row.gstCode || null,
            tds_code: row.tdsCode || null,
            tds_amount: row.tdsAmount || null,
          };

          // Calculate subtotal from quantity * rate
          const quantity = parseFloat(row.quantity) || 0;
          const rate = parseFloat(row.rate) || 0;
          const subtotal = quantity * rate;

          // Use netAmount as total if provided, otherwise calculate
          const cgst = parseFloat(row.cgst) || 0;
          const sgst = parseFloat(row.sgst) || 0;
          const igst = parseFloat(row.igst) || 0;
          const utgst = parseFloat(row.utgst) || 0;
          const calculatedTotal = subtotal + cgst + sgst + igst + utgst;

          lineItem.subtotal = subtotal.toFixed(2);
          lineItem.total = row.netAmount || calculatedTotal.toFixed(2);

          // Include id if this is an existing line item
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
  const isFieldDisabled = isApprovalMode || isInvoiceFinalized;
  const shouldShowButtons = !tableLoading && (invoiceStatus !== null || !id);

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
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className={`mt-0.5 h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3 text-sm font-normal ${getFieldHighlightClass("invoice_number", invoiceNumber)}`}
                        style={{ borderWidth: '0.7px' }}
                        placeholder="Enter invoice number"
                        disabled={isFieldDisabled}
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoice-date" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                        Invoice Date
                      </Label>
                      <DateField
                        id="invoice-date"
                        value={invoiceDate}
                        onChange={(value) => setInvoiceDate(value || "")}
                        disabled={isFieldDisabled}
                        className={`mt-0.5 h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] ${getFieldHighlightClass("invoice_date", invoiceDate)}`}
                      />
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
                        }}
                        onChange={(_event, newValue) => {
                          handleVendorSelect(newValue);
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
                                  borderColor: '#E9EAEE',
                                  borderWidth: '0.7px',
                                },
                                '&:hover fieldset': {
                                  borderColor: '#E9EAEE',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#0D9C99',
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
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="vendor-id" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                        Vendor ID
                      </Label>
                      <Input
                        id="vendor-id"
                        value={vendorId}
                        readOnly
                        className={`mt-0.5 h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3 text-sm font-normal bg-gray-50 ${getFieldHighlightClass("vendor_id", vendorId)}`}
                        style={{ borderWidth: '0.7px' }}
                        placeholder={gstNumber.length === 15 ? "Vendor ID" : "Fill GST number first"}
                        disabled={isFieldDisabled || gstNumber.length !== 15}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="vendor-name" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>
                        Vendor Name
                      </Label>
                      <Input
                        id="vendor-name"
                        value={vendorName}
                        readOnly
                        className="mt-0.5 h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3 text-sm font-normal bg-gray-50"
                        style={{ borderWidth: '0.7px' }}
                        placeholder={gstNumber.length === 15 ? "Vendor name" : "Fill GST number first"}
                        disabled={isFieldDisabled || gstNumber.length !== 15}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="vendor-pan" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>PAN</Label>
                      <Input
                        id="vendor-pan"
                        value={vendorPan}
                        readOnly
                        className="mt-0.5 h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3 text-sm font-normal bg-gray-50"
                        style={{ borderWidth: '0.7px' }}
                        placeholder={gstNumber.length === 15 ? "PAN number" : "Fill GST number first"}
                        disabled={isFieldDisabled || gstNumber.length !== 15}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="vendor-email" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Vendor Email</Label>
                      <Input
                        id="vendor-email"
                        type="email"
                        value={vendorEmail}
                        readOnly
                        className="mt-0.5 h-[33px] border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3 text-sm font-normal bg-gray-50"
                        style={{ borderWidth: '0.7px' }}
                        placeholder={gstNumber.length === 15 ? "Vendor email" : "Fill GST number first"}
                        disabled={isFieldDisabled || gstNumber.length !== 15}
                      />
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
                        onChange={(e) => setBillingAddress(e.target.value)}
                        className={`mt-1 font-normal min-h-[120px] resize-none border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3 ${getFieldHighlightClass("billing_address", billingAddress)}`}
                        style={{ borderWidth: '0.7px' }}
                        placeholder="Enter billing address..."
                        disabled={isFieldDisabled}
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipping-address" className="h-[15px]" style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 400, lineHeight: '100%', letterSpacing: '0%', color: '#47536C' }}>Shipping Address</Label>
                      <Textarea
                        id="shipping-address"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        className={`mt-1 font-normal min-h-[120px] resize-none border-[0.7px] border-[#E9EAEE] rounded-[4px] py-2 px-3 ${getFieldHighlightClass("shipping_address", shippingAddress)}`}
                        style={{ borderWidth: '0.7px' }}
                        placeholder="Enter shipping address..."
                        disabled={isFieldDisabled}
                      />
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
                <InvoiceComment invoiceId={id} readOnly={isFieldDisabled} />
              </TabsContent>
              <TabsContent value="activity" className="h-full mt-0">
                <InvoiceActivity invoiceId={id} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        <LineItemsTable
          rows={tableRows}
          isLoading={tableLoading}
          isApprovalMode={isApprovalMode || isInvoiceFinalized}
          onRowUpdate={updateTableRow}
          onAddRow={addTableRow}
          isFieldChanged={isFieldChanged}
        />

        {/* Summary Section */}
        <div className="bg-white border-t border-gray-200">
          <div className="flex justify-end pr-6 pl-0 py-1">
            <div className="flex flex-col items-end min-w-[140px]">
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">Subtotal</Label>
                <div className={`w-[140px] h-8 flex items-center justify-end px-0 ${getFieldHighlightClass("subtotal_amount", parseFloat(subtotalAmount) || 0) ? "bg-yellow-100" : "bg-gray-50"}`}>
                  <span className="text-xs font-medium text-right">{formatCurrency(parseFloat(subtotalAmount) || 0)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">CGST</Label>
                <div className={`w-[140px] h-8 flex items-center justify-end px-0 ${getFieldHighlightClass("cgst_amount", parseFloat(cgstAmount) || 0) ? "bg-yellow-100" : "bg-gray-50"}`}>
                  <span className="text-xs font-medium text-right">{formatCurrency(parseFloat(cgstAmount) || 0)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">SGST</Label>
                <div className={`w-[140px] h-8 flex items-center justify-end px-0 ${getFieldHighlightClass("sgst_amount", parseFloat(sgstAmount) || 0) ? "bg-yellow-100" : "bg-gray-50"}`}>
                  <span className="text-xs font-medium text-right">{formatCurrency(parseFloat(sgstAmount) || 0)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">IGST</Label>
                <div className={`w-[140px] h-8 flex items-center justify-end px-0 ${getFieldHighlightClass("igst_amount", parseFloat(igstAmount) || 0) ? "bg-yellow-100" : "bg-gray-50"}`}>
                  <span className="text-xs font-medium text-right">{formatCurrency(parseFloat(igstAmount) || 0)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full border-t border-gray-300 pt-1 py-1">
                <Label className="font-semibold text-xs text-gray-900 whitespace-nowrap">Total Amount</Label>
                <div className={`w-[140px] h-8 flex items-center justify-end px-0 ${getFieldHighlightClass("total_amount", (parseFloat(subtotalAmount) || 0) + (parseFloat(cgstAmount) || 0) + (parseFloat(sgstAmount) || 0) + (parseFloat(igstAmount) || 0)) ? "bg-yellow-100" : "bg-gray-50"}`}>
                  <span className="text-xs font-semibold text-right">{formatCurrency(
                    (parseFloat(subtotalAmount) || 0) +
                    (parseFloat(cgstAmount) || 0) +
                    (parseFloat(sgstAmount) || 0) +
                    (parseFloat(igstAmount) || 0)
                  )}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">TDS</Label>
                <div className="w-[140px] h-8 bg-gray-50 flex items-center justify-end px-0">
                  <span className="text-xs font-medium text-right">{formatCurrency(
                    tableRows.reduce((sum, row) => sum + (parseFloat(row.tdsAmount) || 0), 0)
                  )}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full border-t border-gray-300 pt-1 py-1">
                <Label className="font-semibold text-xs text-gray-900 whitespace-nowrap">Total Payable</Label>
                <div className="w-[140px] h-8 bg-gray-50 flex items-center justify-end px-0">
                  <span className="text-xs font-semibold text-right">{formatCurrency(
                    ((parseFloat(subtotalAmount) || 0) +
                    (parseFloat(cgstAmount) || 0) +
                    (parseFloat(sgstAmount) || 0) +
                    (parseFloat(igstAmount) || 0)) -
                    tableRows.reduce((sum, row) => sum + (parseFloat(row.tdsAmount) || 0), 0)
                  )}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full border-t border-gray-300 pt-1 py-1">
                <Label className="font-semibold text-xs text-gray-900 whitespace-nowrap">Payable Amount</Label>
                <div className="w-[140px] h-8 bg-gray-50 flex items-center justify-end px-0">
                  <span className="text-xs font-semibold text-right">{formatCurrency(parseFloat(totalAmount) || 0)}</span>
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
      ) : shouldShowButtons && !isInvoiceFinalized ? (
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

