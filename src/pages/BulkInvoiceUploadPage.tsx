import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import {
  createFileMetadata,
  uploadFileToS3,
  createInvoiceFromFile,
  getInvoiceFiles,
  getInvoiceById,
} from "@/services/invoice/invoice";
import { useInvoiceFlowStore, InvoiceListRow } from "@/services/invoice/invoiceflowstore";

interface FileQueueItem {
  id: string;
  file: File | null;
  fileName: string; // Store filename separately for when file is null
  fileId: string | null;
  invoiceId: string | null;
  status: "UPLOADING" | "EXTRACTING_DATA" | "READY" | "POLICY_VIOLATION" | "UNREADABLE" | "FAILED";
  ocrStatus?: string; // Store API ocr_status (OCR_PROCESSED, OCR_FAILED, OCR_PROCESSING, etc.)
  uploadedOn: Date;
  addedToTable: boolean;
}

export function BulkInvoiceUploadPage() {
  const { prependInvoices, invoices } = useInvoiceFlowStore();
  const { sidebarCollapsed } = useAuthStore();
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQueueTable, setShowQueueTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processSingleFile = async (file: File) => {
    const uploadedOn = new Date();
    const queueItemId = `file-${Date.now()}-${Math.random()}`;
    
    // Add file to queue immediately
    const newQueueItem: FileQueueItem = {
      id: queueItemId,
      file,
      fileName: file.name,
      fileId: null,
      invoiceId: null,
      status: "UPLOADING" as const,
      ocrStatus: undefined,
      uploadedOn,
      addedToTable: false,
    };

    setFileQueue((prev) => [...prev, newQueueItem]);
    setShowQueueTable(true);

    try {
      // Create file metadata
      const fileMetaResponse = await createFileMetadata(file.name);
      const fileId = fileMetaResponse.data.id;
      const uploadUrl = fileMetaResponse.data.upload_url;

      // Update status to uploading
      setFileQueue((prev) =>
        prev.map((item) =>
          item.id === queueItemId ? { ...item, status: "UPLOADING" } : item
        )
      );

      // Upload to S3
      await uploadFileToS3(uploadUrl, file);

      // Update with file ID
      setFileQueue((prev) =>
        prev.map((item) =>
          item.id === queueItemId
            ? { ...item, fileId: fileId, status: "EXTRACTING_DATA", ocrStatus: "OCR_PENDING" }
            : item
        )
      );

      // Create invoice from file
      const invoiceResponse = await createInvoiceFromFile(fileId);
      const invoiceData = invoiceResponse.data[0];

      // Update with invoice ID
      setFileQueue((prev) =>
        prev.map((item) =>
          item.id === queueItemId
            ? {
                ...item,
                invoiceId: invoiceData.id,
                status: "EXTRACTING_DATA",
                ocrStatus: "OCR_PROCESSING",
              }
            : item
        )
      );
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      setFileQueue((prev) =>
        prev.map((item) =>
          item.id === queueItemId ? { ...item, status: "FAILED", ocrStatus: "FAILED" } : item
        )
      );
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Process each file immediately
    for (const file of selectedFiles) {
      await processSingleFile(file);
    }
    
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    // Process each file immediately
    for (const file of droppedFiles) {
      await processSingleFile(file);
    }
  };

  const formatCurrency = (currency: string, amount: number = 0): string => {
    if (currency === "INR") {
      return `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "";
    const datePart = dateString.split("T")[0];
    const [year, month, day] = datePart.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[parseInt(month, 10) - 1]}, ${year}`;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatUploadTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return `Today, ${formatTime(date)}`;
    if (diffMins < 60) return `Today, ${formatTime(date)}`;
    return `Today, ${formatTime(date)}`;
  };

  const getStatusBackgroundColor = (ocrStatus?: string): string => {
    if (!ocrStatus) return "bg-gray-100";
    switch (ocrStatus) {
      case "OCR_PROCESSED":
        return "bg-[#5DC364]/10";
      case "OCR_PROCESSING":
      case "OCR_PENDING":
        return "bg-[#FFF7D6]";
      case "OCR_FAILED":
      case "FAILED":
        return "bg-[#DC2627]/10";
      default:
        return "bg-gray-100";
    }
  };

  const getStatusTextColor = (ocrStatus?: string): string => {
    if (!ocrStatus) return "text-gray-600";
    switch (ocrStatus) {
      case "OCR_PROCESSED":
        return "text-[#5DC364]";
      case "OCR_PROCESSING":
      case "OCR_PENDING":
        return "text-[#F59E0B]";
      case "OCR_FAILED":
      case "FAILED":
        return "text-[#DC2627]";
      default:
        return "text-gray-600";
    }
  };

  const getStatusText = (ocrStatus?: string): string => {
    if (!ocrStatus) return "Unknown";
    // Remove OCR_ prefix and format
    let status = ocrStatus.startsWith("OCR_") 
      ? ocrStatus.replace("OCR_", "") 
      : ocrStatus;
    
    // Convert to proper case (first letter uppercase, rest lowercase)
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const getFileIcon = (fileName: string, ocrStatus?: string) => {
    if (ocrStatus === "OCR_FAILED" || ocrStatus === "FAILED") {
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
    const extension = fileName.split(".").pop()?.toLowerCase();
    if (extension === "pdf") {
      return <FileText className="h-5 w-5 text-red-600" />;
    }
    return <FileText className="h-5 w-5 text-blue-600" />;
  };

  const stats = {
    total: fileQueue.length,
    done: fileQueue.filter((f) => f.ocrStatus === "OCR_PROCESSED").length,
    failed: fileQueue.filter((f) => f.ocrStatus === "OCR_FAILED" || f.ocrStatus === "FAILED").length,
    processing: fileQueue.filter((f) => f.ocrStatus === "OCR_PROCESSING" || f.ocrStatus === "OCR_PENDING" || f.status === "UPLOADING" || f.status === "EXTRACTING_DATA").length,
  };

  // Pagination calculations
  const totalPages = Math.ceil(fileQueue.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedQueue = fileQueue.slice(startIndex, endIndex);

  const pollFileStatuses = async () => {
    try {
      setIsRefreshing(true);
      
      // Fetch all files with pagination
      let allInvoiceFiles: any[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await getInvoiceFiles(offset, limit);
        allInvoiceFiles = [...allInvoiceFiles, ...response.data];
        
        if (response.data.length < limit || allInvoiceFiles.length >= response.count) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      setFileQueue((prevQueue) => {
        return prevQueue.map((queueItem) => {
          // Match by invoice_id first, then by file_name
          const matchedFile = allInvoiceFiles.find(
            (file) => file.invoice_id === queueItem.invoiceId || file.file_name === queueItem.fileName
          );

          if (matchedFile) {
            let newStatus: FileQueueItem["status"] = queueItem.status;
            
            if (matchedFile.ocr_status === "OCR_PENDING" || matchedFile.ocr_status === "OCR_PROCESSING") {
              newStatus = "EXTRACTING_DATA";
            } else if (matchedFile.ocr_status === "OCR_PROCESSED") {
              newStatus = "READY";
            } else if (matchedFile.ocr_status === "OCR_FAILED" || matchedFile.ocr_status === "FAILED" || matchedFile.ocr_status === "Failed") {
              newStatus = "FAILED";
            }

            return {
              ...queueItem,
              invoiceId: matchedFile.invoice_id,
              fileName: matchedFile.file_name,
              status: newStatus,
              ocrStatus: matchedFile.ocr_status,
            };
          }
          return queueItem;
        });
      });
    } catch (error) {
      console.error("Error refreshing file statuses:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const addReadyFilesToInvoiceTable = async () => {
    for (const queueItem of fileQueue) {
      if (
        queueItem.ocrStatus === "OCR_PROCESSED" && 
        queueItem.invoiceId && 
        !queueItem.addedToTable
      ) {
        const invoice = invoices.find((inv) => inv.invoiceId === queueItem.invoiceId);
        if (!invoice) {
          try {
            // Fetch full invoice details
            const invoiceResponse = await getInvoiceById(queueItem.invoiceId);
            const invoiceData = invoiceResponse.data[0];
            
            if (invoiceData && invoiceData.ocr_status === "OCR_PROCESSED") {
              let normalizedStatus = "Processed";
              if (invoiceData.status === "DRAFT") normalizedStatus = "Processed";
              if (invoiceData.status === "Open") normalizedStatus = "Open";
              if (invoiceData.status === "Approved") normalizedStatus = "Approved";
              if (invoiceData.status === "Rejected") normalizedStatus = "Rejected";

              const totalAmount = invoiceData.total_amount ? parseFloat(invoiceData.total_amount) : 0;

              const invoiceRow: InvoiceListRow = {
                id: invoiceData.id,
                invoiceId: invoiceData.id,
                vendorName: invoiceData.vendor_id || "—",
                invoiceNumber: invoiceData.invoice_number || "",
                invoiceDate: formatDate(invoiceData.invoice_date),
                poNumber: invoiceData.po_number || "",
                status: normalizedStatus,
                totalAmount: formatCurrency(invoiceData.currency, totalAmount),
              };

              prependInvoices([invoiceRow]);

              setFileQueue((prev) =>
                prev.map((item) =>
                  item.id === queueItem.id ? { ...item, addedToTable: true } : item
                )
              );
            }
          } catch (error) {
            console.error(`Error fetching invoice ${queueItem.invoiceId}:`, error);
          }
        }
      }
    }
  };



  useEffect(() => {
    // Load file queue from API on mount with pagination
    const loadFileQueue = async () => {
      try {
        let allInvoiceFiles: any[] = [];
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
          const response = await getInvoiceFiles(offset, limit);
          allInvoiceFiles = [...allInvoiceFiles, ...response.data];
          
          if (response.data.length < limit || allInvoiceFiles.length >= response.count) {
            hasMore = false;
          } else {
            offset += limit;
          }
        }

        if (allInvoiceFiles.length > 0) {
          const queueItems: FileQueueItem[] = allInvoiceFiles.map((file) => {
            let status: FileQueueItem["status"] = "EXTRACTING_DATA";
            if (file.ocr_status === "OCR_PROCESSED") {
              status = "READY";
            } else if (file.ocr_status === "OCR_FAILED" || file.ocr_status === "FAILED" || file.ocr_status === "Failed") {
              status = "FAILED";
            }

            // Check if invoice already exists in the invoice table
            const existingInvoice = invoices.find((inv) => inv.invoiceId === file.invoice_id);
            const addedToTable = existingInvoice !== undefined;

            return {
              id: `file-${file.invoice_id}`,
              file: null,
              fileName: file.file_name,
              fileId: null,
              invoiceId: file.invoice_id,
              status,
              ocrStatus: file.ocr_status,
              uploadedOn: new Date(file.created_at),
              addedToTable,
            };
          });

          setFileQueue(queueItems);
          setShowQueueTable(true);
          
          // Add processed invoices to the invoice table
          const processedFiles = allInvoiceFiles.filter((file) => file.ocr_status === "OCR_PROCESSED");
          for (const file of processedFiles) {
            const existingInvoice = invoices.find((inv) => inv.invoiceId === file.invoice_id);
            if (!existingInvoice) {
              try {
                const invoiceResponse = await getInvoiceById(file.invoice_id);
                const invoiceData = invoiceResponse.data[0];
                
                if (invoiceData && invoiceData.ocr_status === "OCR_PROCESSED") {
                  let normalizedStatus = "Processed";
                  if (invoiceData.status === "DRAFT") normalizedStatus = "Processed";
                  if (invoiceData.status === "Open") normalizedStatus = "Open";
                  if (invoiceData.status === "Approved") normalizedStatus = "Approved";
                  if (invoiceData.status === "Rejected") normalizedStatus = "Rejected";

                  const totalAmount = invoiceData.total_amount ? parseFloat(invoiceData.total_amount) : 0;

                  const invoiceRow: InvoiceListRow = {
                    id: invoiceData.id,
                    invoiceId: invoiceData.id,
                    vendorName: invoiceData.vendor_id || "—",
                    invoiceNumber: invoiceData.invoice_number || "",
                    invoiceDate: formatDate(invoiceData.invoice_date),
                    poNumber: invoiceData.po_number || "",
                    status: normalizedStatus,
                    totalAmount: formatCurrency(invoiceData.currency, totalAmount),
                  };

                  prependInvoices([invoiceRow]);
                }
              } catch (error) {
                console.error(`Error fetching invoice ${file.invoice_id}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading file queue:", error);
      }
    };

    loadFileQueue();
  }, []);

  useEffect(() => {
    if (fileQueue.length > 0) {
      addReadyFilesToInvoiceTable();
    }
    // Reset to first page if current page is out of bounds
    const maxPage = Math.ceil(fileQueue.length / itemsPerPage);
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileQueue]);


  return (
    <div className="w-full pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bulk Receipt Upload</h1>
        </div>
      </div>

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          "border-muted-foreground/25 hover:border-[#0D9C99]/50"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 bg-[#0D9C99]/10 rounded-full flex items-center justify-center">
            <Upload className="h-10 w-10 text-[#0D9C99]" />
          </div>
          <div>
            <p className="text-lg font-semibold mb-2">Drag and drop receipts here</p>
            <p className="text-sm text-muted-foreground mb-4">
              AI-powered processing for JPG, PNG, and PDF up to 20MB each.
            </p>
            <Button
              type="button"
              className="bg-[#0D9C99] hover:bg-[#0b8a87] text-white"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              BROWSE FILES
            </Button>
          </div>
        </div>
      </div>


      {showQueueTable && fileQueue.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              PROCESSING QUEUE ({fileQueue.length} FILE{fileQueue.length !== 1 ? "S" : ""})
            </h2>
            <Button
              type="button"
              variant="outline"
              onClick={pollFileStatuses}
              disabled={isRefreshing || fileQueue.length === 0}
              className="flex items-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  REFRESHING...
                </>
              ) : (
                "REFRESH STATUS"
              )}
            </Button>
          </div>

          {/* Statistics */}
          <div className="flex items-center gap-6 mb-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-medium">{stats.total}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Done: </span>
              <span className="font-medium text-[#0D9C99]">{stats.done}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Processing: </span>
              <span className="font-medium text-orange-600">{stats.processing}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Failed: </span>
              <span className="font-medium text-red-600">{stats.failed}</span>
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      FILE NAME
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      UPLOADED ON
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      STATUS
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      INVOICE ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedQueue.map((queueItem) => (
                    <tr key={queueItem.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getFileIcon(queueItem.fileName, queueItem.ocrStatus)}
                          <span className="text-sm font-medium text-gray-900">
                            {queueItem.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatUploadTime(queueItem.uploadedOn)}
                      </td>
                      <td className="px-4 py-3">
                        <div 
                          className={cn(
                            "inline-flex items-center gap-[10px] rounded-lg px-2 py-1",
                            getStatusBackgroundColor(queueItem.ocrStatus)
                          )}
                          style={{
                            width: "fit-content",
                            height: "23px",
                            paddingTop: "4px",
                            paddingRight: "8px",
                            paddingBottom: "4px",
                            paddingLeft: "8px",
                          }}
                        >
                          <span className={cn("text-sm font-medium", getStatusTextColor(queueItem.ocrStatus))}>
                            {queueItem.ocrStatus 
                              ? getStatusText(queueItem.ocrStatus) 
                              : (queueItem.status === "UPLOADING" 
                                  ? "Uploading" 
                                  : "Extracting Data")}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {queueItem.invoiceId ? (
                          <span className="text-[#0D9C99] font-medium">
                            {queueItem.invoiceId}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, fileQueue.length)} of {fileQueue.length} files
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {showQueueTable && fileQueue.length > 0 && (
      <div 
        className={`fixed bottom-0 right-0 bg-white border-t pt-4 pb-4 shadow-lg z-50 ${
          sidebarCollapsed ? "left-[48px]" : "left-[256px]"
        }`}
      >
        <div className="w-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#0D9C99]/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#0D9C99]" />
              </div>
          <p className="text-sm text-muted-foreground">
                Processing happens asynchronously. You'll be notified via email when complete.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

