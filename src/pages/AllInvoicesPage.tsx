import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Box, useTheme, useMediaQuery } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridOverlay,
} from "@mui/x-data-grid";
import { Badge } from "@/components/ui/badge";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import CustomInvoiceToolbar from "@/components/invoice/CustomInvoiceToolbar";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvoiceFlowStore, InvoiceListRow } from "@/services/invoice/invoiceflowstore";
import {
  getAllInvoices,
  type InvoiceResponse,
} from "@/services/invoice/invoice";
import { useLayoutStore } from "@/store/layoutStore";

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const { invoices } = useInvoiceFlowStore();
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "processed">("all");
  const [rowsCalculated, setRowsCalculated] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

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
    // Check ocr_status first, then normalize status
    let normalizedStatus = invoice.status;
    
    // If ocr_status exists, use it to determine processing state
    if (invoice.ocr_status === "OCR_PROCESSING" || invoice.ocr_status === "OCR_PENDING") {
      normalizedStatus = "Processing";
    } else if (invoice.ocr_status === "OCR_PROCESSED") {
      normalizedStatus = "Processed";
    } else if (invoice.status === "OCR_PENDING") {
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
      id: invoice.id,
      invoiceId: invoice.id,
      vendorName: invoice.vendor_id || "—", 
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


  useEffect(() => {
    const calculatePageSize = () => {
      const headerHeight = 80; // Header height
      const paginationHeight = 52; // Pagination bar height
      const padding = 48; // Top and bottom padding
      const gridHeight = window.innerHeight - headerHeight - paginationHeight - padding;
      const rowHeight = 41; // Row height from Figma specs
      const calculatedPageSize = Math.floor(gridHeight / rowHeight);
      const pageSize = isMobile ? 10 : isTablet ? 15 : Math.max(calculatedPageSize, 10);
      setPaginationModel((prev) => ({ ...prev, pageSize }));
    };

    if (!rowsCalculated) {
      calculatePageSize();
      setRowsCalculated(true);
    }

    window.addEventListener("resize", calculatePageSize);
    return () => window.removeEventListener("resize", calculatePageSize);
  }, [isMobile, isTablet, rowsCalculated]);


  const handleRowClick = (params: any) => {
    if (params?.row?.uploadState === "uploading") return;
    const status = params?.row?.status;
    if (status === "Pending" || status === "OCR_PENDING" || status === "OCR_PROCESSING") return;
    const invoiceId = params.row.invoiceId || params.id;
    navigate(`/flow/invoice/${invoiceId}`, { state: { listRow: params.row } });
  };

  const filteredInvoices = useMemo(() => {
    // First, filter out processing invoices
    let filtered = invoices.filter(
      (invoice) => 
        invoice.status !== "Pending" && 
        invoice.status !== "Processing" &&
        invoice.status !== "OCR_PENDING" && 
        invoice.status !== "OCR_PROCESSING" &&
        invoice.uploadState !== "uploading"
    );

    // Filter by tab
    if (activeTab === "processed") {
      filtered = filtered.filter(
        (invoice) =>
          invoice.status === "Processed" ||
          invoice.status === "OCR_PROCESSED" ||
          invoice.status === "Approved"
      );
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          (invoice.vendorName || "").toLowerCase().includes(searchLower) ||
          (invoice.invoiceNumber || "").toLowerCase().includes(searchLower) ||
          (invoice.poNumber || "").toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [invoices, activeTab, searchTerm]);

  const tabs = useMemo(() => {
    const allCount = invoices.length;
    const processedCount = invoices.filter(
      (invoice) =>
        invoice.status === "Processed" ||
        invoice.status === "OCR_PROCESSED" ||
        invoice.status === "Approved"
    ).length;

    return [
      { key: "all", label: "All", count: allCount },
      { key: "processed", label: "Processed", count: processedCount },
    ];
  }, [invoices]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "all" | "processed");
  };

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
            <div className="flex items-center h-full w-full overflow-hidden">
              {processing ? (
                renderSkeleton("w-40")
              ) : (
                <span 
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "100%",
                    letterSpacing: "0%",
                    textTransform: "capitalize",
                    color: "#1A1A1A",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100%",
                  }}
                  title={params.value}
                >
                  {params.value}
                </span>
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
                <Loader2 className="h-4 w-4 animate-spin text-[#0D9C99]" />
                <span className="text-sm font-medium text-[#0D9C99]">
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
                <Loader2 className="h-4 w-4 animate-spin text-[#0D9C99]" />
                <span className="text-sm font-medium text-[#0D9C99]">
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
        align: "right",
        headerAlign: "right",
        renderCell: (params) => {
          const processing = isProcessing(params.row);
          return (
            <div className="flex items-center h-full" style={{ justifyContent: "flex-end", width: "100%" }}>
              {processing ? (
                renderSkeleton("w-20")
              ) : (
                <span 
                  style={{
                    fontFamily: "Inter",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "100%",
                    letterSpacing: "0%",
                    textTransform: "capitalize",
                    color: "#1A1A1A",
                    textAlign: "right",
                  }}
                >
                  {params.value}
                </span>
              )}
            </div>
          );
        },
      },
    ];
  }, [nowMs]);

  return (
    <>
      <InvoicePageWrapper
        title="Invoices"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showCreateButton={false}
        showFilters={false}
        showDateFilter={false}
        marginBottom="mb-0"
      >
        <Box
          sx={{
            height: "calc(100vh - 160px)",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            paddingLeft: "10px",
          }}
        >
          <DataGrid
            className="rounded h-full"
            rows={filteredInvoices}
            columns={columns}
            loading={loadingInvoices}
            getRowHeight={() => 41}
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
              toolbar: CustomInvoiceToolbar,
            }}
            slotProps={{
              toolbar: {
                searchTerm,
                onSearchChange: setSearchTerm,
                onFilterClick: () => {
                  // Handle filter click - can open filter modal
                },
                onShareClick: () => {
                  // Handle share click
                },
                onDownloadClick: () => {
                  // Handle download click
                },
                onCreateClick: () => navigate("/flow/invoice/bulk-upload"),
                createButtonText: "Upload Invoice",
              } as any,
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
                borderBottom: "0.7px solid #EBEBEB",
                borderLeft: "none",
                borderRight: "none",
                outline: "none",
                height: "39px",
                minHeight: "39px",
                maxHeight: "39px",
                paddingTop: "12px",
                paddingRight: "18px",
                paddingBottom: "12px",
                paddingLeft: "18px",
              },
              "& .MuiDataGrid-columnHeader[data-field='vendorName']": {
                paddingLeft: "12px",
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
              "& .MuiDataGrid-row": {
                height: "41px",
                minHeight: "41px",
                maxHeight: "41px",
                borderBottom: "0.7px solid #EBEBEB",
              },
              "& .MuiDataGrid-row:hover": {
                cursor: "pointer",
                backgroundColor: "#f5f5f5",
              },
              "& .invoice-uploading-row": {
                backgroundColor: "#E6FFFA",
                borderLeft: "3px solid #0D9C99",
              },
              "& .invoice-uploading-row:hover": {
                cursor: "not-allowed",
                backgroundColor: "#E6FFFA",
              },
              "& .invoice-uploading-row .MuiDataGrid-cell": {
                color: "#6B7280",
              },
              "& .invoice-processing-row": {
                backgroundColor: "#E6FFFA",
                borderLeft: "3px solid #0D9C99",
              },
              "& .invoice-processing-row:hover": {
                cursor: "not-allowed",
                backgroundColor: "#E6FFFA",
              },
              "& .invoice-processing-row .MuiDataGrid-cell": {
                color: "#6B7280",
              },
              "& .MuiDataGrid-cell": {
                color: "#1A1A1A",
                border: "none",
                borderBottom: "0.7px solid #EBEBEB",
                paddingTop: "12px",
                paddingRight: "18px",
                paddingBottom: "12px",
                paddingLeft: "18px",
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "100%",
                letterSpacing: "0%",
                textTransform: "capitalize",
              },
              "& .MuiDataGrid-cell[data-field='vendorName']": {
                paddingLeft: "12px",
              },
              "& .MuiDataGrid-cellContent": {
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "100%",
                letterSpacing: "0%",
                textTransform: "capitalize",
                color: "#1A1A1A",
              },
              "& .MuiDataGrid-cell > *": {
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "100%",
                letterSpacing: "0%",
                textTransform: "capitalize",
                color: "#1A1A1A",
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
              "& .MuiDataGrid-columnsContainer": {
                gap: "10px",
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "0.7px solid #EBEBEB",
                minHeight: "52px",
              },
              "& .MuiDataGridToolbar-root": {
                paddingLeft: "0",
                paddingRight: "0",
                width: "100%",
                justifyContent: "start",
              },
              "& .MuiDataGridToolbar": {
                justifyContent: "start",
                border: "none !important",
                paddingLeft: "0",
                paddingRight: "0",
              },
            }}
            showToolbar
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            density="compact"
            disableRowSelectionOnClick
            onRowClick={handleRowClick}
            showCellVerticalBorder={false}
            autoHeight={false}
          />
        </Box>
      </InvoicePageWrapper>
    </>
  );
}
