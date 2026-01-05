import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { transactionService } from "@/services/transactionsService";
import { Box, Skeleton } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridOverlay,
  GridPaginationModel,
  GridRowParams,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { CheckCircle, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
          <p className="text-muted-foreground">
            There are currently no transactions.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

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
  const [loading, setLoading] = useState(true);
  const [rowsCalculated, setRowsCalculated] = useState(false);
  const TOTAL_BALANCE = 10000;
  const [balance, setBalance] = useState<number>();
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);

  const getAllTransactions = async () => {
    setLoading(true);
    try {
      const res = await transactionService.getAllTransaction({
        limit: 100,
        offset: 0,
      });
      const rows = res.data.data;
      const totalSpent = rows.reduce((sum: number, e: Record<string, any>) => sum + Number(e.amount), 0);
      setBalance(TOTAL_BALANCE - totalSpent);
      setRows(rows);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = ({ id }: GridRowParams) => {
    navigate(`/admin/accounts/${id}`);
  };

  useEffect(() => {
    if (rowsCalculated) {
      getAllTransactions();
    }
  }, [rowsCalculated]);

  useEffect(() => {
    const gridHeight = window.innerHeight - 340;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
    setRowsCalculated(true);
  }, []);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Accounts</h1>
      </div>
      <div className="mb-6">
        <Card className="p-4 border w-1/4">
          <CardContent className="p-0 space-y-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center justify-between gap-2">
                <span className="truncate">Account Balance</span>
                <Button variant="ghost">
                  <RefreshCcw
                    className="h-4 w-4"
                    onClick={getAllTransactions}
                  />
                </Button>
              </CardTitle>
              <CardDescription></CardDescription>
            </div>
            <div className="flex items-center justify-between">
            {loading ? <Skeleton className="w-1/2 !h-[28px]" /> : <div className="text-xl">{formatCurrency(balance ?? 0)}</div>}
            <div>
                <p className="text-xs font-normal text-gray">Last refreshed: 1 hour ago</p>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Box
        sx={{
          height: "calc(100vh - 240px)",
          width: "100%",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          columns={columns}
          rows={rows}
          loading={loading}
          slots={{ noRowsOverlay: CustomNoRows }}
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
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
          onPaginationModelChange={setPaginationModel}
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
