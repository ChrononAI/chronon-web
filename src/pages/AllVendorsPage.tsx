import { useState } from "react";
import { Box } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VendorRow {
  id: string;
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  gstin: string;
  status: string;
}

const columns: GridColDef[] = [
  { field: "vendorId", headerName: "VENDOR ID", flex: 1, minWidth: 140 },
  { field: "vendorCode", headerName: "VENDOR CODE", flex: 1, minWidth: 140 },
  { field: "vendorName", headerName: "VENDOR NAME", flex: 1.4, minWidth: 200 },
  { field: "gstin", headerName: "GSTIN", flex: 1, minWidth: 140 },
  { field: "status", headerName: "STATUS", flex: 1, minWidth: 120 },
];

const dummyVendors: VendorRow[] = [
  {
    id: "1",
    vendorId: "Ven_123",
    vendorCode: "VENCODE123",
    vendorName: "OFFICE SUPPLIED LIMITED",
    gstin: "ABCS123456YTGS",
    status: "ACTIVE",
  },
  {
    id: "2",
    vendorId: "Ven_456",
    vendorCode: "VENCODE456",
    vendorName: "GLOBAL TRADERS INC",
    gstin: "ABCS987654YTGS",
    status: "ACTIVE",
  },
  {
    id: "3",
    vendorId: "Ven_789",
    vendorCode: "VENCODE789",
    vendorName: "SUPPLY HUB PVT LTD",
    gstin: "ABCS192837YTGS",
    status: "INACTIVE",
  },
];

export function AllVendorsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const filtered = dummyVendors.filter((v) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      v.vendorId.toLowerCase().includes(q) ||
      v.vendorCode.toLowerCase().includes(q) ||
      v.vendorName.toLowerCase().includes(q) ||
      v.gstin.toLowerCase().includes(q)
    );
  });

  const handleBulkDialogChange = (open: boolean) => {
    setShowBulkUpload(open);
    if (!open) {
      setBulkFiles([]);
      setInputKey((k) => k + 1);
      setUploading(false);
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
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      handleBulkDialogChange(false);
    }, 600);
  };

  const removeFile = (index: number) => {
    setBulkFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <ReportsPageWrapper
        title="Vendors"
        showCreateButton
        createButtonText="Upload Vendor"
        onCreateButtonClick={() => handleBulkDialogChange(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by vendor id/code/name/GSTIN"
        showFilters={true}
        showDateFilter={false}
      >
        <Box
          sx={{
            height: "calc(100vh - 240px)",
            width: "100%",
          }}
        >
          <DataGrid
            className="rounded border-[0.2px] border-[#f3f4f6] h-full"
            rows={filtered}
            columns={columns}
            hideFooterPagination
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaderTitle": {
                color: "#9AA0A6",
                fontWeight: "bold",
                fontSize: "12px",
              },
              "& .MuiDataGrid-main": {
                border: "0.2px solid #f3f4f6",
              },
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "#f3f4f6",
                border: "none",
              },
              "& .MuiDataGrid-columnHeaders": {
                border: "none",
              },
              "& .MuiDataGrid-row:hover": {
                cursor: "pointer",
                backgroundColor: "#f5f5f5",
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
                color: "#f3f4f6",
              },
            }}
            disableRowSelectionOnClick
            density="compact"
            showCellVerticalBorder
          />
        </Box>
      </ReportsPageWrapper>

      <Dialog open={showBulkUpload} onOpenChange={handleBulkDialogChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Vendors</DialogTitle>
            <DialogDescription>
              Upload vendor files to process them in bulk.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-6" onSubmit={handleBulkUpload}>
            <div className="flex flex-col gap-3">
              <input
                key={inputKey}
                type="file"
                accept=".csv,.xlsx"
                multiple
                onChange={handleBulkFileSelect}
                className="hidden"
                id="vendor-upload-input"
              />
              <label
                htmlFor="vendor-upload-input"
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  bulkFiles.length > 0
                    ? "border-primary/50 bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                )}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold mb-2">
                      {bulkFiles.length > 0
                        ? `${bulkFiles.length} file(s) selected`
                        : "Upload Vendor Files"}
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
              </label>
              {bulkFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Files:</p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {bulkFiles.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded"
                      >
                        <span>{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleBulkDialogChange(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={bulkFiles.length === 0 || uploading}>
                {uploading ? (
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

