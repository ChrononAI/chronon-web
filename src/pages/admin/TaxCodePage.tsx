import { useState, useEffect, useMemo } from "react";
import { Box } from "@mui/material";
import {
  DataGrid,
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

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Tax codes found</h3>
          <p className="text-muted-foreground">
            There are currently no Tax codes.
          </p>
        </div>
      </Box>
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
    field: "active_flag",
    headerName: "STATUS",
    flex: 1,
    minWidth: 120,
    renderCell: (params) => (
      <div className="flex items-center h-full">
        <Badge
          className={
            params.value
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : "bg-gray-100 text-gray-800 hover:bg-gray-100"
          }
        >
          {params.value ? "Active" : "Inactive"}
        </Badge>
      </div>
    ),
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
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  useEffect(() => {
    setNoPadding(true);
    return () => {
      setNoPadding(false);
    };
  }, [setNoPadding]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await itemsCodeService.getTaxCodes();
      const mappedRows = response.data.map((item) => ({
        ...item,
        id: item.id,
      }));
      setRows(mappedRows);
    } catch (error: any) {
      console.error("Error loading Tax codes:", error);
      toast.error(error?.response?.data?.message || "Failed to load Tax codes");
      setRows([]);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const searchLower = searchTerm.toLowerCase();
    return rows.filter(
      (row) =>
        row.tax_code?.toLowerCase().includes(searchLower) ||
        row.description?.toLowerCase().includes(searchLower)
    );
  }, [rows, searchTerm]);

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
          rows={loading && isInitialLoad ? [] : filteredRows}
          columns={columns}
          loading={loading}
          getRowHeight={() => 41}
          slots={{
            noRowsOverlay: CustomNoRows,
            toolbar: CustomInvoiceToolbar,
            loadingOverlay:
              loading && isInitialLoad
                ? () => (
                    <ExpensesSkeletonOverlay
                      rowCount={paginationModel?.pageSize || 25}
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
          sx={{
            border: 0,
            outline: "none",
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
            "& .MuiDataGrid-columnHeader[data-field='tax_code']": {
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
            },
            "& .MuiDataGrid-cell[data-field='tax_code']": {
              paddingLeft: "12px",
            },
            "& .MuiDataGrid-cellContent": {
              fontFamily: "Inter",
              fontWeight: 500,
              fontSize: "14px",
              lineHeight: "100%",
              letterSpacing: "0%",
              color: "#1A1A1A",
            },
            "& .MuiDataGrid-cell > *": {
              fontFamily: "Inter",
              fontWeight: 500,
              fontSize: "14px",
              lineHeight: "100%",
              letterSpacing: "0%",
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
          }}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          density="compact"
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          showCellVerticalBorder={false}
          autoHeight={false}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </Box>
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
          loadData();
          setSelectedTaxCode(null);
        }}
        taxCode={updateDialogOpen ? selectedTaxCode : null}
      />
    </InvoicePageWrapper>
  );
};

