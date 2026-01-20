import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Download,
  X,
  FileText,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { FormFooter } from "@/components/layout/FormFooter";
import { LineItemsTable, type InvoiceLineRow } from "@/components/invoice/LineItemsTable";
import { getInvoiceById, getFileDownloadUrl } from "@/services/invoice/invoice";
import { DateField } from "@/components/ui/date-field";
import { formatCurrency } from "@/lib/utils";
import { Autocomplete, TextField } from "@mui/material";
import { vendorService, VendorData } from "@/services/vendorService";

type InvoiceUploadState = {
  files?: File[];
};


export function InvoicePage() {
  const { setSidebarCollapsed } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isApprovalMode = location.pathname.startsWith("/flow/approvals/");

  // Minimize sidebar when invoice page opens
  useEffect(() => {
    setSidebarCollapsed(true);
    
    // Cleanup: expand sidebar when leaving the page
    return () => {
      setSidebarCollapsed(false);
    };
  }, [setSidebarCollapsed]);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorPan, setVendorPan] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
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

    let isActive = true;

    const fetchData = async () => {
      try {
        if (shouldLoadFromId && id) {
          const response = await getInvoiceById(id);
          
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
            }
            return;
          }

          const formatDate = (dateString: string | null): string => {
            if (!dateString) return "";
            return dateString.split("T")[0];
          };

          setInvoiceNumber(invoice.invoice_number || "");
          setInvoiceDate(formatDate(invoice.invoice_date));
          setVendorId(invoice.vendor_id || "");
          setBillingAddress(invoice.billing_address || "");
          
          setSubtotalAmount(invoice.subtotal_amount || "0.00");
          setCgstAmount(invoice.cgst_amount || "0.00");
          setSgstAmount(invoice.sgst_amount || "0.00");
          setIgstAmount(invoice.igst_amount || "0.00");
          setTotalAmount(invoice.total_amount || "0.00");
          
          if (invoice.file_ids && invoice.file_ids.length > 0) {
            try {
              const fileId = invoice.file_ids[0];
              const downloadUrlResponse = await getFileDownloadUrl(fileId);
              if (downloadUrlResponse?.data?.download_url) {
                setDownloadUrl(downloadUrlResponse.data.download_url);
              }
            } catch (error) {
              setDownloadUrl(null);
            }
          } else {
            setDownloadUrl(null);
          }
          
          if (invoice.invoice_lineitems && Array.isArray(invoice.invoice_lineitems) && invoice.invoice_lineitems.length > 0) {
            const rowsWithIds: InvoiceLineRow[] = invoice.invoice_lineitems.map((item, idx) => ({
              id: idx + 1,
              itemDescription: item.description || "",
              quantity: item.quantity ? parseFloat(item.quantity).toString() : "",
              rate: item.unit_price || "",
              tdsCode: "",
              tdsAmount: "",
              gstCode: "",
              igst: item.igst_amount || "",
              cgst: item.cgst_amount || "",
              sgst: item.sgst_amount || "",
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
            setTableRows([]);
            setOriginalOcrValues({});
            setSubtotalAmount("0.00");
            setCgstAmount("0.00");
            setSgstAmount("0.00");
            setIgstAmount("0.00");
            setTotalAmount("0.00");
            nextRowIdRef.current = 1;
            setTableLoading(false);
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

  const searchVendors = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
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
    setGstNumber(value);
    
    // Clear previous timeout
    if (vendorSearchTimeoutRef.current) {
      clearTimeout(vendorSearchTimeoutRef.current);
    }

    // Debounce search - wait 300ms after user stops typing
    vendorSearchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        searchVendors(value);
      } else {
        setVendorSearchResults([]);
      }
    }, 300);
  }, [searchVendors]);

  const handleVendorSelect = useCallback((vendor: VendorData | string | null) => {
    if (vendor && typeof vendor === 'object') {
      setGstNumber(vendor.gstin);
      setVendorName(vendor.vendor_name || "");
      setVendorEmail(vendor.email || "");
      setVendorPan(vendor.pan || "");
      setVendorId(vendor.vendor_code || "");
    } else if (typeof vendor === 'string') {
      // User typed a custom GST number
      setGstNumber(vendor);
      setVendorName("");
      setVendorEmail("");
      setVendorPan("");
    } else {
      // Clear vendor data when selection is cleared
      setGstNumber("");
      setVendorName("");
      setVendorEmail("");
      setVendorPan("");
    }
  }, []);

  const addTableRow = useCallback(() => {
    const newRow: InvoiceLineRow = {
      id: nextRowIdRef.current++,
      itemDescription: "",
      quantity: "",
      rate: "",
      tdsCode: "",
      tdsAmount: "",
      gstCode: "",
      igst: "",
      cgst: "",
      sgst: "",
      netAmount: "",
    };
    setTableRows((prev) => [...prev, newRow]);
  }, []);

  const isFieldChanged = useCallback(
    (rowId: number, field: keyof Omit<InvoiceLineRow, "id">, currentValue: string): boolean => {
      const original = originalOcrValues[rowId];
      if (!original) return false;
      const originalValue = original[field];
      if (originalValue === undefined || originalValue === null) return false;
      const normalizedOriginal = String(originalValue).trim();
      const normalizedCurrent = String(currentValue || "").trim();
      if (!normalizedOriginal && !normalizedCurrent) return false;
      return normalizedOriginal !== normalizedCurrent;
    },
    [originalOcrValues]
  );

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

  return (
    <div className="flex flex-col min-h-screen bg-sky-100">
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-gray-900">
          {isApprovalMode ? "Approval" : invoiceNumber || "Invoice"}
        </h1>
      </div>
      <div className="flex flex-shrink-0" style={{ height: 'calc(100vh - 240px)', minHeight: '450px' }}>
        {/* Left Panel - Invoice Document */}
        <div className="w-2/5 border-r overflow-hidden bg-sky-100 p-2 flex flex-col">
          {/* Invoice Document Preview Box */}
          <div className="flex-1 border-2 border-gray-400 rounded-lg bg-white shadow-lg flex flex-col overflow-hidden">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 p-2">
              {hasInvoice ? (
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
                      <Label htmlFor="invoice-number" className="font-medium text-[10px] leading-[100%] tracking-[0%] text-gray-600">
                        Invoice Number
                      </Label>
                      <Input
                        id="invoice-number"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="mt-0.5 h-8 text-sm font-normal"
                        placeholder="Enter invoice number"
                        disabled={isApprovalMode}
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoice-date" className="font-medium text-[10px] leading-[100%] tracking-[0%] text-gray-600">
                        Invoice Date
                      </Label>
                      <DateField
                        id="invoice-date"
                        value={invoiceDate}
                        onChange={(value) => setInvoiceDate(value || "")}
                        disabled={isApprovalMode}
                        className="mt-0.5 h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="vendor" className="font-medium text-[10px] leading-[100%] tracking-[0%] text-gray-600">
                        Vendor ID
                      </Label>
                      <Input
                        id="vendor"
                        value={vendorId}
                        onChange={(e) => setVendorId(e.target.value)}
                        className="mt-0.5 h-8 text-sm font-normal"
                        placeholder="Enter vendor ID"
                        disabled={isApprovalMode}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="gst-number" className="font-medium text-[10px] leading-[100%] tracking-[0%] text-gray-600">
                        GST Number
                      </Label>
                      <Autocomplete
                        id="gst-number"
                        options={vendorSearchResults}
                        getOptionLabel={(option) => typeof option === 'string' ? option : option.gstin}
                        value={vendorSearchResults.find(v => v.gstin === gstNumber) || null}
                        onInputChange={(_event, newInputValue) => {
                          handleGstNumberChange(newInputValue);
                        }}
                        onChange={(_event, newValue) => {
                          handleVendorSelect(newValue);
                        }}
                        loading={vendorSearchLoading}
                        disabled={isApprovalMode}
                        freeSolo
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Search GST number..."
                            className="mt-0.5"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                height: '32px',
                                fontSize: '14px',
                                '& fieldset': {
                                  borderColor: '#e5e7eb',
                                },
                                '&:hover fieldset': {
                                  borderColor: '#d1d5db',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#9333ea',
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
                    {vendorName && (
                      <>
                        <div className="col-span-2">
                          <Label htmlFor="vendor-name" className="font-medium text-[10px] leading-[100%] tracking-[0%] text-gray-600">
                            Vendor Name
                          </Label>
                          <Input
                            id="vendor-name"
                            value={vendorName}
                            onChange={(e) => setVendorName(e.target.value)}
                            className="mt-0.5 h-8 text-sm font-normal"
                            placeholder="Vendor name"
                            disabled={isApprovalMode}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="vendor-email" className="font-medium text-[10px] leading-[100%] tracking-[0%] text-gray-600">
                            Vendor Email
                          </Label>
                          <Input
                            id="vendor-email"
                            type="email"
                            value={vendorEmail}
                            onChange={(e) => setVendorEmail(e.target.value)}
                            className="mt-0.5 h-8 text-sm font-normal"
                            placeholder="Vendor email"
                            disabled={isApprovalMode}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="vendor-pan" className="font-medium text-[10px] leading-[100%] tracking-[0%] text-gray-600">
                            PAN
                          </Label>
                          <Input
                            id="vendor-pan"
                            value={vendorPan}
                            onChange={(e) => setVendorPan(e.target.value)}
                            className="mt-0.5 h-8 text-sm font-normal"
                            placeholder="PAN number"
                            disabled={isApprovalMode}
                          />
                        </div>
                      </>
                    )}
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-3 border-t border-gray-200 pt-3">
              <h2 className="font-medium text-[12px] leading-[100%] tracking-[0%] text-gray-500 uppercase">ADDRESSES</h2>
              <div className="space-y-3">
                    <div>
                      <Label htmlFor="billing-address" className="font-medium text-[10px] leading-[100%] tracking-[0%] text-gray-600">
                        Billing Address
                      </Label>
                      <Textarea
                        id="billing-address"
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        className="mt-1 font-normal min-h-[80px] resize-none"
                        placeholder="Enter billing address..."
                        disabled={isApprovalMode}
                      />
                    </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Validation Tabs */}
        <div className="w-1/5 overflow-y-auto p-4 bg-white">
          <Tabs defaultValue="validation" className="w-full">
            <TabsList className="w-full border-b border-gray-200 mb-3 h-auto p-0 bg-transparent inline-flex items-center justify-start rounded-none">
              <TabsTrigger
                value="validation"
                className="relative text-xs font-medium text-gray-600 data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none border-b-2 border-transparent pb-1.5 px-2 data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                Validation
              </TabsTrigger>
              <TabsTrigger
                value="comment"
                className="text-xs font-medium text-gray-600 data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none border-b-2 border-transparent pb-1.5 px-2 data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                Comment
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="text-xs font-medium text-gray-600 data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none border-b-2 border-transparent pb-1.5 px-2 data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                Activity
              </TabsTrigger>
            </TabsList>
            <TabsContent value="validation" className="space-y-0 mt-0">
              <div className="text-center py-10 text-sm text-gray-500">
                No validation issues found
              </div>
            </TabsContent>
            <TabsContent value="comment" className="mt-0 space-y-0">
              <div className="text-center py-10 text-sm text-gray-500">
                No comments yet
              </div>
            </TabsContent>
            <TabsContent value="activity" className="mt-0">
              <div className="text-center py-10 text-sm text-gray-500">
                No activity yet
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        <LineItemsTable
          rows={tableRows}
          isLoading={tableLoading}
          isApprovalMode={isApprovalMode}
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
                <div className="w-[140px] h-8 bg-gray-50 flex items-center justify-end px-0">
                  <span className="text-xs font-medium text-right">{formatCurrency(parseFloat(subtotalAmount) || 0)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">CGST</Label>
                <div className="w-[140px] h-8 bg-gray-50 flex items-center justify-end px-0">
                  <span className="text-xs font-medium text-right">{formatCurrency(parseFloat(cgstAmount) || 0)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">SGST</Label>
                <div className="w-[140px] h-8 bg-gray-50 flex items-center justify-end px-0">
                  <span className="text-xs font-medium text-right">{formatCurrency(parseFloat(sgstAmount) || 0)}</span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 w-full py-1">
                <Label className="font-medium text-[10px] text-gray-600 whitespace-nowrap">IGST</Label>
                <div className="w-[140px] h-8 bg-gray-50 flex items-center justify-end px-0">
                  <span className="text-xs font-medium text-right">{formatCurrency(parseFloat(igstAmount) || 0)}</span>
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
                <Label className="font-semibold text-xs text-gray-900 whitespace-nowrap">Total</Label>
                <div className="w-[140px] h-8 bg-gray-50 flex items-center justify-end px-0">
                  <span className="text-xs font-semibold text-right">{formatCurrency(parseFloat(totalAmount) || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FormFooter>
        {isApprovalMode ? (
          <>
            <Button 
              variant="outline" 
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={() => {}}
            >
              Reject
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {}}
            >
              Approval
            </Button>
          </>
        ) : (
          <Button className="bg-purple-600 hover:bg-purple-700 text-white">
            Submit Invoice
          </Button>
        )}
      </FormFooter>

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
    </div>
  );
}

