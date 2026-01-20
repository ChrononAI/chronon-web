import { useState, useEffect, useMemo } from "react";
import { Box } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridOverlay,
} from "@mui/x-data-grid";
import { Badge } from "@/components/ui/badge";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { itemsCodeService, TDSCodeData } from "@/services/items/itemsCodeService";
import { toast } from "sonner";
import ExpensesSkeletonOverlay from "@/components/expenses/ExpenseSkeletonOverlay";
import { CreateTDSCodeDialog } from "@/components/items/CreateTDSCodeDialog";

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No TDS codes found</h3>
          <p className="text-muted-foreground">
            There are currently no TDS codes.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

const columns: GridColDef<TDSCodeData>[] = [
  {
    field: "tds_code",
    headerName: "TDS CODE",
    flex: 1,
    minWidth: 150,
  },
  {
    field: "tds_percentage",
    headerName: "TDS PERCENTAGE",
    flex: 1,
    minWidth: 150,
    renderCell: (params) => (
      <span>{params.value ? `${params.value}%` : "-"}</span>
    ),
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    flex: 1,
    minWidth: 300,
  },
  {
    field: "active_flag",
    headerName: "STATUS",
    flex: 1,
    minWidth: 120,
    renderCell: (params) => (
      <Badge
        className={
          params.value
            ? "bg-green-100 text-green-800 hover:bg-green-100"
            : "bg-gray-100 text-gray-800 hover:bg-gray-100"
        }
      >
        {params.value ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    field: "created_at",
    headerName: "CREATED AT",
    flex: 1,
    minWidth: 160,
    renderCell: (params) => {
      if (!params.value) return "-";
      const date = new Date(params.value);
      return (
        <span className="text-sm text-gray-500">
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </span>
      );
    },
  },
];

export const TDSCodePage = () => {
  const [rows, setRows] = useState<TDSCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await itemsCodeService.getTDSCodes();
      const mappedRows = response.data.map((item) => ({
        ...item,
        id: item.id,
      }));
      setRows(mappedRows);
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
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const searchLower = searchTerm.toLowerCase();
    return rows.filter(
      (row) =>
        row.tds_code?.toLowerCase().includes(searchLower) ||
        row.description?.toLowerCase().includes(searchLower)
    );
  }, [rows, searchTerm]);

  return (
    <ReportsPageWrapper
      title="TDS Code"
      showCreateButton={true}
      createButtonText="Create TDS Code"
      onCreateButtonClick={() => {
        setCreateDialogOpen(true);
      }}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search by TDS code or description..."
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
          rows={loading && isInitialLoad ? [] : filteredRows}
          columns={columns}
          loading={loading}
          slots={{
            noRowsOverlay: CustomNoRows,
            loadingOverlay:
              loading && isInitialLoad
                ? () => (
                    <ExpensesSkeletonOverlay
                      rowCount={paginationModel?.pageSize || 25}
                    />
                  )
                : undefined,
          }}
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
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          density="compact"
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </Box>
      <CreateTDSCodeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          loadData();
        }}
      />
    </ReportsPageWrapper>
  );
};

