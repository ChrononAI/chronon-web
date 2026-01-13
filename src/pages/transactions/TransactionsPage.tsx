import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { transactionService } from "@/services/transactionService";
import { Box } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowParams,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const columns: GridColDef[] = [
  {
    field: "transaction_id",
    headerName: "TRANSACTION ID",
    minWidth: 80,
    flex: 1,
  },
  {
    field: "amount",
    headerName: "AMOUNT",
    minWidth: 80,
    flex: 1,
    type: "number",
    align: "right",
    headerAlign: "right",
    renderCell: ({ value }) => formatCurrency(value),
  },
  {
    field: "message",
    headerName: "MESSAGE",
    minWidth: 120,
    flex: 1,
  },
  {
    field: "transaction_status",
    headerName: "STATUS",
    minWidth: 120,
    flex: 1,
    renderCell: (params) => (
      <Badge className={getStatusColor(params.value)}>
        {params.value.replace("_", " ")}
      </Badge>
    ),
  },
  {
    field: "transaction_type",
    headerName: "TYPE",
    minWidth: 120,
    flex: 1,
  },
  {
    field: "transaction_date",
    headerName: "DATE",
    minWidth: 120,
    flex: 1,
    renderCell: ({ value }) => formatDate(value),
  },
];

function TransactionsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  const GRID_OFFSET = 200;
  const ROW_HEIGHT = 38;
  const HEADER_HEIGHT = 0;

  const calculatePageSize = () => {
    const availableHeight =
      window.innerHeight - GRID_OFFSET - HEADER_HEIGHT;
    return Math.max(1, Math.floor(availableHeight / ROW_HEIGHT));
  };

  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel>({
      page: 0,
      pageSize: calculatePageSize(),
    });

  const getAllTransactions = async () => {
    setLoading(true);
    const limit = paginationModel?.pageSize || 10;
    const offset = (paginationModel?.page || 0) * limit;
    try {
      const res = await transactionService.getAllTransaction({
        limit,
        offset,
      });
      setRowCount(res.data.count);
      setRows(res.data.data);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = ({ id }: GridRowParams) => {
    console.log(id);
    navigate(`/transactions/${id}`);
  };

  useEffect(() => {
    if (paginationModel) {
      getAllTransactions();
    }
  }, [paginationModel?.page, paginationModel?.pageSize]);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
      </div>
      <Box
        sx={{
          height: "calc(100vh - 120px)",
          width: "100%",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          columns={columns}
          rows={loading ? [] : rows}
          loading={loading}
          slots={{
            noRowsOverlay: () => <CustomNoRows title="No transactions found" description="There are currently no transactions." />,
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
          }}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "#9AA0A6",
              fontWeight: "bold",
              fontSize: "12px",
            },
            "& .MuiToolbar-root": {
              paddingX: 0,
            },
            "& .MuiDataGrid-panel .MuiSelect-select": {
              fontSize: "12px",
            },
            "& .MuiDataGrid-virtualScroller": {
              overflow: loading ? "hidden" : "auto",
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
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={rowCount}
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          showCellVerticalBorder
        />
      </Box>
    </>
  );
}

export default TransactionsPage;
