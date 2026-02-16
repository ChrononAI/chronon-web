import { useState, useEffect } from "react";
import {
  GridColDef,
  GridPaginationModel,
  GridOverlay,
} from "@mui/x-data-grid";
import { Badge } from "@/components/ui/badge";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import CustomInvoiceToolbar from "@/components/invoice/CustomInvoiceToolbar";
import { itemsCodeService, TDSCodeData } from "@/services/items/itemsCodeService";
import { toast } from "sonner";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { TDSCodeDialog } from "@/components/items/TDSCodeDialog";
import { GridRowParams } from "@mui/x-data-grid";
import { useLayoutStore } from "@/store/layoutStore";
import { DataTable } from "@/components/shared/DataTable";

function CustomNoRows() {
  return (
    <GridOverlay>
      <div className="w-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No TDS codes found</h3>
          <p className="text-muted-foreground">
            There are currently no TDS codes.
          </p>
        </div>
      </div>
    </GridOverlay>
  );
}

const columns: GridColDef<TDSCodeData>[] = [
  {
    field: "tds_code",
    headerName: "TDS CODE",
    flex: 1,
    minWidth: 150,
    renderCell: (params) => (
      <div className="flex items-center h-full w-full overflow-hidden">
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
      </div>
    ),
  },
  {
    field: "tds_percentage",
    headerName: "TDS PERCENTAGE",
    flex: 1,
    minWidth: 150,
    renderCell: (params) => (
      <div className="flex items-center h-full">
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
          {params.value ? `${params.value}%` : "-"}
        </span>
      </div>
    ),
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    flex: 1,
    minWidth: 300,
    renderCell: (params) => (
      <div className="flex items-center h-full w-full overflow-hidden">
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
          {params.value || "-"}
        </span>
      </div>
    ),
  },
  {
    field: "is_active",
    headerName: "STATUS",
    flex: 1,
    minWidth: 120,
    renderCell: (params) => {
      const isActive = params.row.is_active ?? false;
      return (
        <div className="flex items-center h-full">
          <Badge
            className={
              isActive
                ? "bg-green-100 text-green-800 hover:bg-green-100"
                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
            }
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      );
    },
  },
  {
    field: "created_at",
    headerName: "CREATED AT",
    flex: 1,
    minWidth: 160,
    renderCell: (params) => {
      if (!params.value) return (
        <div className="flex items-center h-full">
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
            -
          </span>
        </div>
      );
      const date = new Date(params.value);
      return (
        <div className="flex items-center h-full">
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
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </span>
        </div>
      );
    },
  },
];

export const TDSCodePage = () => {
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const [rows, setRows] = useState<TDSCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedTdsCode, setSelectedTdsCode] = useState<TDSCodeData | null>(null);
  const [rowsCalculated, setRowsCalculated] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

  const loadData = async (paginationModel: GridPaginationModel) => {
    try {
      setLoading(true);
      const limit = paginationModel.pageSize;
      const offset = paginationModel.page * limit;
      
      const response = searchTerm.trim()
        ? await itemsCodeService.searchTDSCodes(searchTerm, limit, offset)
        : await itemsCodeService.getTDSCodes(limit, offset);
      
      const mappedRows = response.data.map((item) => ({
        ...item,
        id: item.id,
        is_active: item.is_active ?? false,
      }));
      setRows(mappedRows);
      setRowCount(response.count);
    } catch (error: any) {
      console.error("Error loading TDS codes:", error);
      toast.error(error?.response?.data?.message || "Failed to load TDS codes");
      setRows([]);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    loadData(paginationModel);
  }, [paginationModel, searchTerm]);

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


  const handleRowClick = (params: GridRowParams<TDSCodeData>) => {
    setSelectedTdsCode(params.row);
    setUpdateDialogOpen(true);
  };

  return (
    <InvoicePageWrapper
      title="TDS Code"
      showCreateButton={false}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search by TDS code or description..."
      showFilters={false}
      showDateFilter={false}
      marginBottom="mb-0"
    >
      <DataTable
        rows={loading && isInitialLoad ? [] : rows}
        columns={columns}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={handleRowClick}
        firstColumnField="tds_code"
        emptyStateComponent={<CustomNoRows />}
        rowCount={rowCount}
        paginationMode="server"
        slots={{
          toolbar: CustomInvoiceToolbar,
          loadingOverlay:
            loading && isInitialLoad
              ? () => (
                  <SkeletonLoaderOverlay
                    rowCount={paginationModel?.pageSize || 10}
                  />
                )
              : undefined,
        }}
        slotProps={{
          toolbar: {
            searchTerm,
            onSearchChange: setSearchTerm,
            onFilterClick: () => {
            },
            onShareClick: () => {
              // Handle share click
            },
            onDownloadClick: () => {
              // Handle download click
            },
            onCreateClick: () => {
              setCreateDialogOpen(true);
            },
            createButtonText: "Create TDS Code",
          } as any,
        }}
        showToolbar
      />
      <TDSCodeDialog
        open={createDialogOpen || updateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setUpdateDialogOpen(false);
            setSelectedTdsCode(null);
          }
        }}
        onSuccess={() => {
          loadData(paginationModel);
          setSelectedTdsCode(null);
        }}
        tdsCode={updateDialogOpen ? selectedTdsCode : null}
      />
    </InvoicePageWrapper>
  );
};

