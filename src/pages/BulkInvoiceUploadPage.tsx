import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/shared/StatusPill";
import { DataTable } from "@/components/shared/DataTable";
import {
  GridColDef,
  GridPaginationModel,
  GridOverlay,
} from "@mui/x-data-grid";
import {
  createFileMetadata,
  uploadFileToS3,
  createInvoiceFromFile,
  getInvoiceFiles,
} from "@/services/invoice/invoice";
import { useInvoiceFlowStore } from "@/services/invoice/invoiceflowstore";

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

function CustomNoRows() {
  return (
    <GridOverlay>
      <div className="w-full">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No files found</h3>
          <p className="text-muted-foreground">
            There are currently no files in the queue.
          </p>
        </div>
      </div>
    </GridOverlay>
  );
}

export function BulkInvoiceUploadPage() {
  const { invoices } = useInvoiceFlowStore();
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQueueTable, setShowQueueTable] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 7,
  });
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


  const stats = {
    total: fileQueue.length,
    done: fileQueue.filter((f) => f.ocrStatus === "OCR_PROCESSED").length,
    failed: fileQueue.filter((f) => f.ocrStatus === "OCR_FAILED" || f.ocrStatus === "FAILED").length,
    processing: fileQueue.filter((f) => f.ocrStatus === "OCR_PROCESSING" || f.ocrStatus === "OCR_PENDING" || f.status === "UPLOADING" || f.status === "EXTRACTING_DATA").length,
  };

  const columns: GridColDef[] = useMemo(() => {
    return [
      {
        field: "fileName",
        headerName: "FILE NAME",
        flex: 1,
        minWidth: 200,
        renderCell: (params) => {
          const queueItem = params.row as FileQueueItem;
          return (
            <span
              style={{
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "100%",
                letterSpacing: "0%",
                color: "#1A1A1A",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
              title={queueItem.fileName}
            >
              {queueItem.fileName}
            </span>
          );
        },
      },
      {
        field: "uploadedOn",
        headerName: "UPLOADED ON",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => {
          const queueItem = params.row as FileQueueItem;
          return (
            <span
              style={{
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "100%",
                letterSpacing: "0%",
                color: "#1A1A1A",
              }}
            >
              {formatUploadTime(queueItem.uploadedOn)}
            </span>
          );
        },
      },
      {
        field: "status",
        headerName: "STATUS",
        flex: 1,
        minWidth: 160,
        renderCell: (params) => {
          const queueItem = params.row as FileQueueItem;
          return (
            <div className="flex items-center h-full">
              <StatusPill
                status={
                  queueItem.ocrStatus
                    ? queueItem.ocrStatus
                    : queueItem.status === "UPLOADING"
                    ? "UPLOADING"
                    : "EXTRACTING_DATA"
                }
              />
            </div>
          );
        },
      },
      {
        field: "invoiceId",
        headerName: "INVOICE ID",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => {
          const queueItem = params.row as FileQueueItem;
          return (
            <span
              style={{
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "100%",
                letterSpacing: "0%",
                color: queueItem.invoiceId ? "#0D9C99" : "#9CA3AF",
              }}
            >
              {queueItem.invoiceId || "—"}
            </span>
          );
        },
      },
    ];
  }, []);

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
    // Removed getInvoiceById API call - invoices will be loaded from the main invoice list
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
          
          // Removed getInvoiceById API call - invoices will be loaded from the main invoice list
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileQueue]);


  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bulk Receipt Upload</h1>
        </div>
      </div>

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
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
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 bg-[#0D9C99]/10 rounded-full flex items-center justify-center">
            <Upload className="h-8 w-8 text-[#0D9C99]" />
          </div>
          <div>
            <p className="text-lg font-semibold mb-1">Drag and drop receipts here</p>
            <p className="text-sm text-muted-foreground mb-3">
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
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            {/* Statistics */}
            <div className="flex items-center gap-6 text-sm">
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

          {/* Table */}
          <DataTable
            rows={fileQueue}
            columns={columns}
            loading={isRefreshing}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            height="400px"
            firstColumnField="fileName"
            emptyStateComponent={<CustomNoRows />}
            hoverCursor="default"
            pageSizeOptions={[7]}
          />
        </div>
      )}
    </div>
  );
}

