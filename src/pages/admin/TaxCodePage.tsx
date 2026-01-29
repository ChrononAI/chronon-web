import { useState, useEffect } from "react";
import {
  GridColDef,
  GridPaginationModel,
  GridOverlay,
} from "@mui/x-data-grid";
import { Badge } from "@/components/ui/badge";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import CustomInvoiceToolbar from "@/components/invoice/CustomInvoiceToolbar";
import { itemsCodeService, TaxCodeData } from "@/services/items/itemsCodeService";
import { toast } from "sonner";
import ExpensesSkeletonOverlay from "@/components/expenses/ExpenseSkeletonOverlay";
import { TaxCodeDialog } from "@/components/items/TaxCodeDialog";
import { GridRowParams } from "@mui/x-data-grid";
import { useLayoutStore } from "@/store/layoutStore";
import { DataTable } from "@/components/shared/DataTable";

function CustomNoRows() {
  return (
    <GridOverlay>
      <div className="w-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Tax codes found</h3>
          <p className="text-muted-foreground">
            There are currently no Tax codes.
          </p>
        </div>
      </div>
    </GridOverlay>
  );
}

const columns: GridColDef<TaxCodeData>[] = [
  {
    field: "tax_code",
    headerName: "TAX CODE",
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
    field: "tax_percentage",
    headerName: "TAX PERCENTAGE",
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
    field: "cgst_percentage",
    headerName: "CGST %",
    flex: 1,
    minWidth: 100,
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
    field: "sgst_percentage",
    headerName: "SGST %",
    flex: 1,
    minWidth: 100,
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
    field: "igst_percentage",
    headerName: "IGST %",
    flex: 1,
    minWidth: 100,
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
];

export const TaxCodePage = () => {
  const setNoPadding = useLayoutStore((s) => s.setNoPadding);
  const [rows, setRows] = useState<TaxCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedTaxCode, setSelectedTaxCode] = useState<TaxCodeData | null>(null);
  const [rowsCalculated, setRowsCalculated] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [tableHeight, setTableHeight] = useState<string>("calc(100vh - 160px)");
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
        ? await itemsCodeService.searchTaxCodes(searchTerm, limit, offset)
        : await itemsCodeService.getTaxCodes(limit, offset);
      
      const mappedRows = response.data.map((item) => ({
        ...item,
        id: item.id,
      }));
      setRows(mappedRows);
      setRowCount(response.count);
    } catch (error: any) {
      console.error("Error loading Tax codes:", error);
      toast.error(error?.response?.data?.message || "Failed to load Tax codes");
      setRows([]);
      setRowCount(0);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    if (rowsCalculated) {
      loadData(paginationModel);
    }
  }, [paginationModel, searchTerm, rowsCalculated]);

  useEffect(() => {
    const calculateDimensions = () => {
      const pageHeaderHeight = 56;
      const toolbarHeight = 60;
      const paginationHeight = 52;
      const rowHeight = 41;
      const headerRowHeight = 39;
      const extraPadding = 20;
      
      const availableHeight = window.innerHeight - pageHeaderHeight - toolbarHeight - extraPadding;
      const contentHeight = availableHeight - headerRowHeight - paginationHeight;
      const calculatedPageSize = Math.floor(contentHeight / rowHeight);
      const pageSize = Math.max(calculatedPageSize, 15);
      
      const totalTableHeight = headerRowHeight + (pageSize * rowHeight) + paginationHeight;
      setTableHeight(`${totalTableHeight}px`);
      setPaginationModel((prev) => ({ ...prev, pageSize }));
    };

    if (!rowsCalculated) {
      calculateDimensions();
      setRowsCalculated(true);
    }

    window.addEventListener("resize", calculateDimensions);
    return () => window.removeEventListener("resize", calculateDimensions);
  }, [rowsCalculated]);


  const handleRowClick = (params: GridRowParams<TaxCodeData>) => {
    setSelectedTaxCode(params.row);
    setUpdateDialogOpen(true);
  };

  return (
    <InvoicePageWrapper
      title="Tax Code"
      showCreateButton={false}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search by tax code or description..."
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
        firstColumnField="tax_code"
        emptyStateComponent={<CustomNoRows />}
        rowCount={rowCount}
        paginationMode="server"
        height={tableHeight}
        slots={{
          toolbar: CustomInvoiceToolbar,
          loadingOverlay:
            loading && isInitialLoad
              ? () => (
                  <ExpensesSkeletonOverlay
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
              // Handle filter click
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
            createButtonText: "Create Tax Code",
          } as any,
        }}
        showToolbar
      />
      <TaxCodeDialog
        open={createDialogOpen || updateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setUpdateDialogOpen(false);
            setSelectedTaxCode(null);
          }
        }}
        onSuccess={() => {
          loadData(paginationModel);
          setSelectedTaxCode(null);
        }}
        taxCode={updateDialogOpen ? selectedTaxCode : null}
      />
    </InvoicePageWrapper>
  );
};

