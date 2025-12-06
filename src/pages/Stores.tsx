import { useEffect, useState } from "react";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { Box } from "@mui/material";
import { DataGrid, GridColDef, GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";
import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { GridOverlay } from "@mui/x-data-grid";
import { storesService } from "@/services/storeService";
import { useStoreStore } from "@/store/storeStore";
import { GridRowModel } from "@mui/x-data-grid";

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No stores found</h3>
          <p className="text-muted-foreground">
            There are currently no stores.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

const columns: GridColDef[] = [
  {
    field: "name",
    headerName: "NAME",
    minWidth: 120,
    flex: 1,
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    minWidth: 140,
    flex: 1,
  },
  {
    field: "address",
    headerName: "ADDRESS",
    minWidth: 140,
    flex: 1,
  },
  {
    field: "city",
    headerName: "CITY",
    minWidth: 120,
    flex: 1,
  },
  {
    field: "status",
    headerName: "STATUS",
    flex: 1,
    minWidth: 180,
    renderCell: (params) => (
      <Badge className={getStatusColor(params.value)}>
        {params.value.replace("_", " ")}
      </Badge>
    ),
  },
];

export default function Stores() {
  const navigate = useNavigate();
  const { setSelectedStore } = useStoreStore();
  const [loading, setLoading] = useState(true);

  // Tab and filter states
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "processed">(
    "all"
  );

  const [allRows, setAllRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [processedRows, setProcessedRows] = useState([]);
  const [allCount, setAllCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });

    const rows =
    activeTab === "all"
      ? allRows
      : activeTab === "pending"
      ? pendingRows
      : processedRows;

  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, [activeTab]);

  const fetchAllStores = async () => {
    setLoading(true);
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const res = await storesService.getStores({ limit, offset });
      setAllRows(res.data.data);
      setAllCount(res.data.count);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingStores = async () => {
    setLoading(true);
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const res = await storesService.getStoresByStatus({
        limit,
        offset,
        status: "PENDING_APPROVAL",
      });
      setPendingRows(res.data.data);
      setPendingCount(res.data.count);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessedStores = async () => {
    setLoading(true);
    try {
      const limit = paginationModel?.pageSize || 10;
      const offset = (paginationModel?.page || 0) * limit;
      const res = await storesService.getStoresByStatus({
        limit,
        offset,
        status: "APPROVED,REJECTED",
      });
      setProcessedRows(res.data.data);
      setProcessedCount(res.data.count);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = ({ row }: GridRowModel) => {
    setSelectedStore(row);
    navigate(`/requests/stores/${row.id}`);
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAllStores(),
        fetchPendingStores(),
        fetchProcessedStores(),
      ]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paginationModel) {
      fetchStores();
    }
    setRowSelection({type: "include", ids: new Set()});
  }, [paginationModel?.page, paginationModel?.pageSize]);

  const tabs = [
    { key: "all", label: "All", count: allCount || 0 },
    { key: "pending", label: "Pending", count: pendingCount || 0 },
    { key: "processed", label: "Processed", count: processedCount || 0 },
  ];

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [activeTab])

  return (
    <ReportsPageWrapper
      title="Stores"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as "all")}
      showFilters={false}
      showDateFilter={false}
      showCreateButton={true}
      createButtonText="Create New Store"
      createButtonLink="/requests/stores/create"
    >
      <Box
        sx={{
          height: "calc(100vh - 160px)",
          width: "100%",
          marginTop: "-32px",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          rows={loading ? [] : rows}
          columns={columns}
          loading={loading}
          slots={{
            noRowsOverlay: CustomNoRows,
          }}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "#9AA0A6",
              fontWeight: "bold",
              fontSize: "12px",
            },
            "& .MuiDataGrid-panel .MuiSelect-select": {
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
          showToolbar
          density="compact"
          getRowClassName={(params) =>
            params.row.original_expense_id ? "bg-yellow-50" : ""
          }
          checkboxSelection
          disableRowSelectionOnClick
          showCellVerticalBorder
          onRowClick={handleRowClick}
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          pagination
          paginationMode="server"
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
          onPaginationModelChange={setPaginationModel}
          rowCount={
            (activeTab === "all"
              ? allCount
              : activeTab === "pending"
              ? pendingCount
              : processedCount) || 0
          }
        />
      </Box>
    </ReportsPageWrapper>
  );
}
