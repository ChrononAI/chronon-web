import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridOverlay,
} from "@mui/x-data-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { FileText, Upload, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoiceFlowStore, InvoiceListRow } from "@/services/invoice/invoiceflowstore";
import {
  createFileMetadata,
  uploadFileToS3,
  createInvoiceFromFile,
  getAllInvoices,
  type InvoiceResponse,
} from "@/services/invoice/invoice";

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
          <p className="text-muted-foreground">
            There are currently no invoices.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

export function AllInvoicesPage() {
  const navigate = useNavigate();
  const { invoices, prependInvoices, updateInvoice } = useInvoiceFlowStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkInputKey, setBulkInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  const formatCurrency = (currency: string, amount: number = 0): string => {
    if (currency === "INR") {
      return `₹ ${amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "";
    // Safe date parsing: extract YYYY-MM-DD from ISO string to avoid timezone issues
    const datePart = dateString.split("T")[0];
    const [year, month, day] = datePart.split("-");
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${day} ${months[parseInt(month, 10) - 1]}, ${year}`;
  };

  const convertInvoiceToRow = (invoice: InvoiceResponse): InvoiceListRow => {
    // Normalize status: OCR_PENDING -> Pending, OCR_PROCESSED -> Processed
    let normalizedStatus = invoice.status;
    if (invoice.status === "OCR_PENDING") {
      normalizedStatus = "Pending";
    } else if (invoice.status === "OCR_PROCESSED") {
      normalizedStatus = "Processed";
    } else if (invoice.status === "Open") {
      normalizedStatus = "Open";
    } else if (invoice.status === "Approved") {
      normalizedStatus = "Approved";
    } else if (invoice.status === "Rejected") {
      normalizedStatus = "Rejected";
    }
    
    // Parse total_amount from API (can be string or null)
    const totalAmount = invoice.total_amount 
      ? parseFloat(invoice.total_amount) 
      : 0;
    
    return {
      id: invoice.id, // Use invoice ID as stable ID for existing invoices
      invoiceId: invoice.id, // Also store as invoiceId for consistency
      vendorName: invoice.vendor_id || "—", // API only returns vendor_id, not vendor name
      invoiceNumber: invoice.invoice_number || "",
      invoiceDate: formatDate(invoice.invoice_date),
      poNumber: invoice.po_number || "",
      status: normalizedStatus,
      totalAmount: formatCurrency(invoice.currency, totalAmount),
    };
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoadingInvoices(true);
      const response = await getAllInvoices();
      const invoiceRows: InvoiceListRow[] = response.data.map(convertInvoiceToRow);
      useInvoiceFlowStore.setState({ invoices: invoiceRows });
    } catch (error) {
      // Error handled silently
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const hasPendingInvoices = invoices.some((inv) => inv.status === "Pending" || inv.status === "OCR_PENDING" || inv.status === "OCR_PROCESSING");

  useEffect(() => {
    if (!hasPendingInvoices) return;

    const pollInterval = setInterval(() => {
      fetchInvoices();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [hasPendingInvoices, fetchInvoices]);

  const handleRowClick = (params: any) => {
    if (params?.row?.uploadState === "uploading") return;
    const status = params?.row?.status;
    if (status === "Pending" || status === "OCR_PENDING" || status === "OCR_PROCESSING") return;
    const invoiceId = params.row.invoiceId || params.id;
    navigate(`/flow/invoice/${invoiceId}`, { state: { listRow: params.row } });
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (invoice.vendorName || "").toLowerCase().includes(searchLower) ||
      (invoice.invoiceNumber || "").toLowerCase().includes(searchLower) ||
      (invoice.poNumber || "").toLowerCase().includes(searchLower)
    );
  });

  const hasUploading = invoices.some((inv) => inv.uploadState === "uploading");

  useEffect(() => {
    if (!hasUploading) return;
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [hasUploading]);

  const columns: GridColDef[] = useMemo(() => {
    const renderSkeleton = (wClass: string) => (
      <div className="relative overflow-hidden w-full">
        <div
          className={cn(
            "h-4 rounded-md bg-gradient-to-r from-gray-100 via-gray-200/60 to-gray-100 bg-[length:200%_100%]",
            wClass
          )}
          style={{
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      </div>
    );

    const isProcessing = (row: any): boolean => {
      const uploadState = row?.uploadState;
      const status = String(row?.status ?? "");
      return (
        uploadState === "uploading" ||
        status === "Pending" ||
        status === "OCR_PENDING" ||
        status === "OCR_PROCESSING"
      );
    };

    return [
      {
        field: "vendorName",
        headerName: "VENDOR NAME",
        flex: 1,
        minWidth: 200,
        renderCell: (params) => {
          const processing = isProcessing(params.row);
          return (
            <div className="flex items-center h-full">
              {processing ? (
                renderSkeleton("w-40")
              ) : (
                <span className="text-sm">{params.value}</span>
              )}
            </div>
          );
        },
      },
      {
        field: "invoiceNumber",
        headerName: "INVOICE NUMBER",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => {
          const processing = isProcessing(params.row);
          return (
            <div className="flex items-center h-full">
              {processing ? (
                renderSkeleton("w-28")
              ) : (
                <span className="text-sm">{params.value}</span>
              )}
            </div>
          );
        },
      },
      {
        field: "invoiceDate",
        headerName: "INVOICE DATE",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => {
          const processing = isProcessing(params.row);
          return (
            <div className="flex items-center h-full">
              {processing ? (
                renderSkeleton("w-24")
              ) : (
                <span className="text-sm">{params.value}</span>
              )}
            </div>
          );
        },
      },
      {
        field: "poNumber",
        headerName: "PO NUMBER",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => {
          const processing = isProcessing(params.row);
          return (
            <div className="flex items-center h-full">
              {processing ? (
                renderSkeleton("w-24")
              ) : (
                <span className="text-sm">{params.value}</span>
              )}
            </div>
          );
        },
      },
      {
        field: "status",
        headerName: "STATUS",
        flex: 1,
        minWidth: 160,
        renderCell: (params) => {
          const row = params.row as any;
          const uploadState = row.uploadState as "uploading" | "done" | undefined;

          if (uploadState === "uploading") {
            return (
              <div className="flex items-center gap-2 h-full">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                <span className="text-sm font-medium text-purple-700">
                  Uploading
                </span>
              </div>
            );
          }

          const value = String(params.value ?? "");
          
          let normalizedStatus = value;
          if (value === "OCR_PENDING") {
            normalizedStatus = "Pending";
          } else if (value === "OCR_PROCESSED") {
            normalizedStatus = "Processed";
          } else if (value === "OCR_PROCESSING") {
            normalizedStatus = "Processing";
          }

          if (normalizedStatus === "Pending" || normalizedStatus === "Processing" || value === "OCR_PROCESSING") {
            return (
              <div className="flex items-center gap-2 h-full">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                <span className="text-sm font-medium text-purple-700">
                  Processing
                </span>
              </div>
            );
          }

          return (
            <Badge
              className={
                normalizedStatus === "Processed"
                  ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                  : normalizedStatus === "Open"
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : normalizedStatus === "Approved"
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : normalizedStatus === "Rejected" || normalizedStatus === "Failed"
                  ? "bg-red-100 text-red-800 hover:bg-red-100"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
              }
            >
              {normalizedStatus}
            </Badge>
          );
        },
      },
      {
        field: "totalAmount",
        headerName: "TOTAL AMOUNT",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => {
          const processing = isProcessing(params.row);
          return (
            <div className="flex items-center h-full justify-end">
              {processing ? (
                renderSkeleton("w-20")
              ) : (
                <span className="text-sm">{params.value}</span>
              )}
            </div>
          );
        },
      },
    ];
  }, [nowMs]);

  const handleBulkDialogChange = (open: boolean) => {
    setShowBulkUpload(open);
    if (!open) {
      setBulkFiles([]);
      setBulkInputKey((key) => key + 1);
      setUploadingBulk(false);
    }
  };

  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setBulkFiles(files);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkFiles.length === 0) return;

    const createdAt = Date.now();

    const loadingRows: InvoiceListRow[] = bulkFiles.map((file, idx) => {
      // Use stable temp ID that never changes - this prevents DataGrid issues
      const stableId = `uploading-${createdAt}-${idx}`;
      return {
        id: stableId, // Stable ID - never changes
        vendorName: file.name,
        invoiceNumber: "",
        invoiceDate: "",
        poNumber: "",
        status: "Uploading",
        totalAmount: "",
        uploadState: "uploading",
        uploadStartedAt: createdAt,
      };
    });

    // Add loading rows to table immediately
    prependInvoices(loadingRows);

    // Close dialog and reset form immediately so user sees table with loading rows
    const filesToUpload = [...bulkFiles];
    setBulkFiles([]);
    setBulkInputKey((prev) => prev + 1);
    handleBulkDialogChange(false);

    // Upload files sequentially in the background
    for (let idx = 0; idx < filesToUpload.length; idx++) {
      const file = filesToUpload[idx];
      const rowId = loadingRows[idx].id;

      try {
        const fileMetaResponse = await createFileMetadata(file.name);
        const fileId = fileMetaResponse.data.id;
        const uploadUrl = fileMetaResponse.data.upload_url;

        await uploadFileToS3(uploadUrl, file);

        const invoiceResponse = await createInvoiceFromFile(fileId);
        const invoiceData = invoiceResponse.data[0];

        // Normalize status: OCR_PENDING -> Pending, OCR_PROCESSED -> Processed
        let normalizedStatus = invoiceData.status;
        if (invoiceData.status === "OCR_PENDING") {
          normalizedStatus = "Pending";
        } else if (invoiceData.status === "OCR_PROCESSED") {
          normalizedStatus = "Processed";
        }

        // Parse total_amount from API (can be string or null)
        const totalAmount = invoiceData.total_amount 
          ? parseFloat(invoiceData.total_amount) 
          : 0;

        // Keep the stable temp ID, store real invoice ID separately
        updateInvoice(rowId, {
          invoiceId: invoiceData.id, // Store real invoice ID separately
          vendorName: invoiceData.vendor_id || "—", // API only returns vendor_id, not vendor name
          invoiceNumber: invoiceData.invoice_number || "",
          invoiceDate: formatDate(invoiceData.invoice_date),
          poNumber: invoiceData.po_number || "",
          status: normalizedStatus,
          totalAmount: formatCurrency(invoiceData.currency, totalAmount),
          uploadState: "done",
          uploadStartedAt: undefined,
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);

        updateInvoice(rowId, {
          status: "Failed",
          uploadState: "done",
          uploadStartedAt: undefined,
        });
      }
    }
  };

  const removeFile = (index: number) => {
    setBulkFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <ReportsPageWrapper
        title="Invoices"
        showCreateButton={true}
        createButtonText="Upload Invoice"
        onCreateButtonClick={() => handleBulkDialogChange(true)}
        createButtonClassName="bg-[#161B53] hover:bg-[#1a205f] text-white"
        showFilters={false}
        showDateFilter={false}
        marginBottom="mb-0"
      >
        <Box
          sx={{
            height: "calc(100vh - 240px)",
            width: "100%",
          }}
        >
          <DataGrid
            className="rounded h-full"
            rows={filteredInvoices}
            columns={columns}
            loading={loadingInvoices}
            getRowClassName={(params) => {
              const row = params.row as any;
              if (row?.uploadState === "uploading") {
                return "invoice-uploading-row";
              }
              const status = row?.status;
              if (status === "Pending" || status === "OCR_PENDING" || status === "OCR_PROCESSING") {
                return "invoice-processing-row";
              }
              return "";
            }}
            slots={{
              noRowsOverlay: CustomNoRows,
            }}
            sx={{
              border: 0,
              outline: "none",
              "& .MuiDataGrid-root": {
                border: "none",
                outline: "none",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: "12px",
                lineHeight: "100%",
                letterSpacing: "0%",
                textTransform: "uppercase",
                color: "#8D94A2",
              },
              "& .MuiDataGrid-main": {
                border: "none",
                outline: "none",
              },
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "transparent",
                border: "none",
                borderTop: "none",
                borderBottom: "none",
                borderLeft: "none",
                borderRight: "none",
                outline: "none",
              },
              "& .MuiDataGrid-columnHeaders": {
                border: "none",
                borderTop: "none",
                borderBottom: "none",
                outline: "none",
              },
              "& .MuiDataGrid-columnHeader:focus": {
                outline: "none",
              },
              "& .MuiDataGrid-columnHeader:focus-within": {
                outline: "none",
              },
              "& .MuiDataGrid-row:hover": {
                cursor: "pointer",
                backgroundColor: "#f5f5f5",
              },
              "& .invoice-uploading-row": {
                backgroundColor: "#FAF5FF",
                borderLeft: "3px solid #9333ea",
              },
              "& .invoice-uploading-row:hover": {
                cursor: "not-allowed",
                backgroundColor: "#FAF5FF",
              },
              "& .invoice-uploading-row .MuiDataGrid-cell": {
                color: "#6B7280",
              },
              "& .invoice-processing-row": {
                backgroundColor: "#FAF5FF",
                borderLeft: "3px solid #9333ea",
              },
              "& .invoice-processing-row:hover": {
                cursor: "not-allowed",
                backgroundColor: "#FAF5FF",
              },
              "& .invoice-processing-row .MuiDataGrid-cell": {
                color: "#6B7280",
              },
              "& .MuiDataGrid-cell": {
                color: "#2E2E2E",
                border: "0.2px solid #f3f4f6",
              },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
                outline: "none",
              },
              "& .MuiDataGrid-cell:focus-within": {
                outline: "none",
              },
              "& .MuiDataGrid-columnSeparator": {
                display: "none",
              },
            }}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            density="compact"
            disableRowSelectionOnClick
            onRowClick={handleRowClick}
            showCellVerticalBorder
          />
        </Box>
      </ReportsPageWrapper>

      <Dialog open={showBulkUpload} onOpenChange={handleBulkDialogChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upload Bulk Invoices</DialogTitle>
            <DialogDescription>
              Upload invoice files to process them in bulk. Supported formats:
              PDF, images (JPG, PNG).
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-6" onSubmit={handleBulkUpload}>
            <div className="flex flex-col gap-3">
              <input
                key={bulkInputKey}
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleBulkFileSelect}
                className="hidden"
              />
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  bulkFiles.length > 0
                    ? "border-primary/50 bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold mb-2">
                      {bulkFiles.length > 0
                        ? `${bulkFiles.length} file(s) selected`
                        : "Upload Invoice Files"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop files here, or click to browse
                    </p>
                  </div>
                  {bulkFiles.length === 0 && (
                    <Button type="button" variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                  )}
                </div>
              </div>

              {bulkFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Files:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {bulkFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 bg-muted rounded-lg overflow-hidden"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-sm truncate">{file.name}</p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-muted-foreground/20 rounded flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleBulkDialogChange(false)}
                disabled={uploadingBulk}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={bulkFiles.length === 0 || uploadingBulk}
              >
                {uploadingBulk ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
