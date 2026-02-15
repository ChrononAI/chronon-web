import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  GridColDef,
  GridPaginationModel,
  GridOverlay,
} from "@mui/x-data-grid";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import CustomInvoiceToolbar from "@/components/invoice/CustomInvoiceToolbar";
import { FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/shared/StatusPill";
import { DataTable } from "@/components/shared/DataTable";
import { useInvoiceFlowStore, InvoiceListRow } from "@/services/invoice/invoiceflowstore";
import {
  getAllInvoices,
  type InvoiceResponse,
} from "@/services/invoice/invoice";
import { useLayoutStore } from "@/store/layoutStore";
import { useAuthStore } from "@/store/authStore";

function CustomNoRows() {
  return (
    <GridOverlay>
      <div className="w-full">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
          <p className="text-muted-foreground">
            There are currently no invoices.
          </p>
        </div>
      </div>
    </GridOverlay>
  );
}

export function AllInvoicesPage() {
  const navigate = useNavigate();
  const { invoices } = useInvoiceFlowStore();
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const { setSidebarCollapsed } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"osc_processed" | "osc_pending" | "booked">("osc_processed");
  const [rowsCalculated, setRowsCalculated] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [tabCounts, setTabCounts] = useState({
    osc_processed: 0,
    osc_pending: 0,
    booked: 0,
  });
  // Cache invoices data for each tab
  const [cachedInvoices, setCachedInvoices] = useState<{
    osc_processed: InvoiceListRow[];
    osc_pending: InvoiceListRow[];
    booked: InvoiceListRow[];
  }>({
    osc_processed: [],
    osc_pending: [],
    booked: [],
  });
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Open sidebar when on AllInvoicesPage
  useEffect(() => {
    setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

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
    let displayStatus = invoice.status || "";
    
    if (invoice.ocr_status === "OCR_PROCESSING" || invoice.ocr_status === "OCR_PENDING") {
      displayStatus = "OCR_PROCESSING";
    }
    
    const totalAmount = invoice.total_amount 
      ? parseFloat(invoice.total_amount) 
      : 0;
    
    return {
      id: invoice.id,
      invoiceId: invoice.id,
      vendorName: invoice.gst_number || "—", 
      invoiceNumber: invoice.invoice_number || "",
      invoiceDate: formatDate(invoice.invoice_date),
      currency: invoice.currency || "INR",
      status: displayStatus,
      ocrStatus: invoice.ocr_status,
      sequenceNumber: invoice.sequence_number || null,
      totalAmount: formatCurrency(invoice.currency, totalAmount),
    };
  };

  const fetchAllTabData = useCallback(async () => {
    try {
      setLoadingInvoices(true);
      // Fetch all three tabs' data in parallel
      const [processedResponse, pendingResponse, bookedResponse] = await Promise.all([
        getAllInvoices("ocr_status=in.(OCR_PROCESSED)"),
        getAllInvoices("ocr_status=in.(OCR_PROCESSING,OCR_PENDING)"),
        getAllInvoices("status=in.(REJECTED,APPROVED,PENDING_APPROVAL)"),
      ]);

      // Convert all responses to rows
      const processedRows: InvoiceListRow[] = processedResponse.data.map(convertInvoiceToRow);
      const pendingRows: InvoiceListRow[] = pendingResponse.data.map(convertInvoiceToRow);
      const bookedRows: InvoiceListRow[] = bookedResponse.data.map(convertInvoiceToRow);

      // Cache all data
      setCachedInvoices({
        osc_processed: processedRows,
        osc_pending: pendingRows,
        booked: bookedRows,
      });

      // Set counts
      setTabCounts({
        osc_processed: processedResponse.count || 0,
        osc_pending: pendingResponse.count || 0,
        booked: bookedResponse.count || 0,
      });

      // Set the active tab's data to the store
      useInvoiceFlowStore.setState({ invoices: processedRows });
      
      setInitialLoadComplete(true);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  const fetchInvoices = useCallback(async (tab: "osc_processed" | "osc_pending" | "booked", forceRefresh: boolean = false) => {
    // If we have cached data and not forcing refresh, use cached data
    if (!forceRefresh && initialLoadComplete) {
      useInvoiceFlowStore.setState({ invoices: cachedInvoices[tab] });
      return;
    }
    try {
      setLoadingInvoices(true);
      let queryParams = "";
      
      if (tab === "booked") {
        queryParams = "status=in.(REJECTED,APPROVED,PENDING_APPROVAL)";
      } else if (tab === "osc_pending") {
        queryParams = "ocr_status=in.(OCR_PROCESSING,OCR_PENDING)";
      } else if (tab === "osc_processed") {
        queryParams = "ocr_status=in.(OCR_PROCESSED)";
      }
      
      const response = await getAllInvoices(queryParams);
      const invoiceRows: InvoiceListRow[] = response.data.map(convertInvoiceToRow);
      
      // Update cache
      setCachedInvoices(prev => ({
        ...prev,
        [tab]: invoiceRows,
      }));
      
      useInvoiceFlowStore.setState({ invoices: invoiceRows });
    } catch (error) {
      // Error handled silently
    } finally {
      setLoadingInvoices(false);
    }
  }, [initialLoadComplete, cachedInvoices]);

  // Fetch all tab data on initial load
  useEffect(() => {
    if (!initialLoadComplete) {
      fetchAllTabData();
    }
  }, [fetchAllTabData, initialLoadComplete]);

  // When tab changes, use cached data (no API call)
  useEffect(() => {
    if (initialLoadComplete) {
      fetchInvoices(activeTab, false);
    }
  }, [activeTab, fetchInvoices, initialLoadComplete]);


  useEffect(() => {
    const calculatePageSize = () => {
      const headerHeight = 80;
      const paginationHeight = 52; 
      const padding = 48; 
      const gridHeight = window.innerHeight - headerHeight - paginationHeight - padding;
      const rowHeight = 41; 
      const calculatedPageSize = Math.floor(gridHeight / rowHeight);
      const pageSize = Math.max(calculatedPageSize, 10);
      setPaginationModel((prev) => ({ ...prev, pageSize }));
    };

    if (!rowsCalculated) {
      calculatePageSize();
      setRowsCalculated(true);
    }

    window.addEventListener("resize", calculatePageSize);
    return () => window.removeEventListener("resize", calculatePageSize);
  }, [rowsCalculated]);


  const handleRowClick = (params: any) => {
    if (params?.row?.uploadState === "uploading") return;
    const status = params?.row?.status?.toUpperCase() || "";
    if (status === "PENDING" || status === "OCR_PENDING" || status === "OCR_PROCESSING") return;
    const invoiceId = params.row.invoiceId || params.id;
    navigate(`/flow/invoice/${invoiceId}`, { state: { listRow: params.row } });
  };

  const filteredInvoices = useMemo(() => {
    let filtered = invoices.filter(
      (invoice) => invoice.uploadState !== "uploading"
    );

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          (invoice.vendorName || "").toLowerCase().includes(searchLower) ||
          (invoice.invoiceNumber || "").toLowerCase().includes(searchLower) ||
          (invoice.currency || "").toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [invoices, searchTerm]);

  const tabs = useMemo(() => {
    return [
      { key: "osc_processed", label: "OCR Processed", count: tabCounts.osc_processed },
      { key: "osc_pending", label: "OCR Pending", count: tabCounts.osc_pending },
      { key: "booked", label: "Booked", count: tabCounts.booked },
    ];
  }, [tabCounts]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "osc_processed" | "osc_pending" | "booked");
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
      const status = String(row?.status ?? "").toUpperCase();
      return (
        uploadState === "uploading" ||
        status === "PENDING" ||
        status === "OCR_PENDING" ||
        status === "OCR_PROCESSING"
      );
    };

    return [
      {
        field: "vendorName",
        headerName: "GST NUMBER",
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
        field: "sequenceNumber",
        headerName: "SEQUENCE NUMBER",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => {
          const processing = isProcessing(params.row);
          return (
            <div className="flex items-center h-full">
              {processing ? (
                renderSkeleton("w-28")
              ) : (
                <span className="text-sm">{params.value || "—"}</span>
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
        field: "currency",
        headerName: "CURRENCY",
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
          
          if (value === "OCR_PROCESSING" || value === "OCR_PENDING") {
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
            <div className="flex items-center h-full">
              <StatusPill status={value} />
            </div>
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
        <DataTable
          rows={filteredInvoices}
          columns={columns}
          loading={loadingInvoices}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          onRowClick={handleRowClick}
          getRowClassName={(params) => {
            const row = params.row as any;
            if (row?.uploadState === "uploading") {
              return "invoice-uploading-row";
            }
            const status = String(row?.status ?? "").toUpperCase();
            if (status === "PENDING" || status === "OCR_PENDING" || status === "OCR_PROCESSING") {
              return "invoice-processing-row";
            }
            return "";
          }}
          firstColumnField="vendorName"
          emptyStateComponent={<CustomNoRows />}
          slots={{
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
          showToolbar
        />
      </InvoicePageWrapper>
    </>
  );
}
