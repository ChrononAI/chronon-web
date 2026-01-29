import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  GridColDef,
  GridPaginationModel,
  GridOverlay,
} from "@mui/x-data-grid";
import { Badge } from "@/components/ui/badge";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import CustomInvoiceToolbar from "@/components/invoice/CustomInvoiceToolbar";
import { FileText } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import {
  getApprovalInvoices,
  type InvoiceResponse,
} from "@/services/invoice/invoice";
import { useLayoutStore } from "@/store/layoutStore";
import { formatCurrency } from "@/lib/utils";

function CustomNoRows() {
  return (
    <GridOverlay>
      <div className="w-full">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No approvals found</h3>
          <p className="text-muted-foreground">
            There are currently no approvals pending.
          </p>
        </div>
      </div>
    </GridOverlay>
  );
}

interface ApprovalRow {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  vendorName: string;
  invoiceDate: string;
  poNumber: string;
  status: string;
  totalAmount: string;
}

export function AllInvoiceApprovalsPage() {
  const navigate = useNavigate();
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");
  const [rowsCalculated, setRowsCalculated] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "";
    const datePart = dateString.split("T")[0];
    const [year, month, day] = datePart.split("-");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${day} ${months[parseInt(month, 10) - 1]}, ${year}`;
  };

  const convertInvoiceToRow = (invoice: InvoiceResponse): ApprovalRow => {
    const totalAmount = invoice.total_amount 
      ? parseFloat(invoice.total_amount) 
      : 0;
    
    return {
      id: invoice.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number || "",
      vendorName: invoice.vendor_id || "—",
      invoiceDate: formatDate(invoice.invoice_date),
      poNumber: invoice.po_number || "",
      status: invoice.status === "PENDING_APPROVAL" ? "Pending" : invoice.status,
      totalAmount: formatCurrency(totalAmount, invoice.currency),
    };
  };

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      let status: string | undefined;
      
      if (activeTab === "all") {
        status = "IN_PROGRESS,APPROVED,REJECTED";
      } else if (activeTab === "pending") {
        status = "IN_PROGRESS";
      }
      
      const response = await getApprovalInvoices(status);
      const approvalRows: ApprovalRow[] = response.data.map(convertInvoiceToRow);
      setApprovals(approvalRows);
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

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
    const invoiceId = params.row.invoiceId || params.id;
    navigate(`/flow/approvals/${invoiceId}`, { state: { listRow: params.row } });
  };

  const filteredApprovals = useMemo(() => {
    let filtered = approvals;

    if (activeTab === "pending") {
      filtered = filtered.filter((approval) => approval.status === "Pending");
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (approval) =>
          (approval.vendorName || "").toLowerCase().includes(searchLower) ||
          (approval.invoiceNumber || "").toLowerCase().includes(searchLower) ||
          (approval.poNumber || "").toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [approvals, activeTab, searchTerm]);

  const tabs = useMemo(() => {
    const allCount = approvals.length;
    const pendingCount = approvals.filter((a) => a.status === "Pending").length;

    return [
      { key: "all", label: "All", count: allCount },
      { key: "pending", label: "Pending", count: pendingCount },
    ];
  }, [approvals]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "all" | "pending");
  };

  const columns: GridColDef[] = useMemo(() => {
    return [
      {
        field: "invoiceNumber",
        headerName: "INVOICE NUMBER",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
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
            {params.value}
          </span>
        ),
      },
      {
        field: "vendorName",
        headerName: "VENDOR NAME",
        flex: 1,
        minWidth: 200,
        renderCell: (params) => (
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
        ),
      },
      {
        field: "invoiceDate",
        headerName: "INVOICE DATE",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
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
            {params.value}
          </span>
        ),
      },
      {
        field: "poNumber",
        headerName: "PO NUMBER",
        flex: 1,
        minWidth: 150,
        renderCell: (params) => (
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
            {params.value || "—"}
          </span>
        ),
      },
      {
        field: "status",
        headerName: "STATUS",
        flex: 1,
        minWidth: 120,
        renderCell: (params) => {
          const status = params.value;
          return (
            <Badge
              className={
                status === "Pending"
                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                  : status === "Approved"
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : status === "Rejected"
                  ? "bg-red-100 text-red-800 hover:bg-red-100"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-100"
              }
            >
              {status}
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
        renderCell: (params) => (
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: 500,
              fontSize: "14px",
              lineHeight: "100%",
              letterSpacing: "0%",
              color: "#1A1A1A",
              textAlign: "right",
            }}
          >
            {params.value}
          </span>
        ),
      },
    ];
  }, []);

  return (
    <InvoicePageWrapper
      title="Approvals"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      showCreateButton={false}
      showFilters={false}
      showDateFilter={false}
      marginBottom="mb-0"
    >
      <DataTable
        rows={filteredApprovals}
        columns={columns}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={handleRowClick}
        firstColumnField="invoiceNumber"
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
          } as any,
        }}
        showToolbar
        paginationMode="client"
      />
    </InvoicePageWrapper>
  );
}

