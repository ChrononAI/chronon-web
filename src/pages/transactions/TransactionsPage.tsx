import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusPill } from "@/components/shared/StatusPill";
import { transactionService } from "@/services/transactionService";
import {
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";

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
      <div className="flex items-center h-full">
        <StatusPill status={params.value} />
      </div>
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

  const handleRowClick = (params: any) => {
    navigate(`/transactions/${params.id}`);
  };

  useEffect(() => {
    if (paginationModel) {
      getAllTransactions();
    }
  }, [paginationModel?.page, paginationModel?.pageSize]);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Transactions</h1>
      </div>
      <DataTable
        rows={loading ? [] : rows}
        columns={columns}
        loading={loading}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={handleRowClick}
        rowCount={rowCount}
        paginationMode="server"
        firstColumnField="transaction_id"
        emptyStateComponent={
          <CustomNoRows
            title="No transactions found"
            description="There are currently no transactions."
          />
        }
        slots={{
          loadingOverlay: () => (
            <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
          ),
        }}
        checkboxSelection
        rowSelectionModel={rowSelection}
        onRowSelectionModelChange={setRowSelection}
        showCellVerticalBorder
      />
    </>
  );
}

export default TransactionsPage;
