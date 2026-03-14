import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { DataTable } from "@/components/shared/DataTable";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { StatusPill } from "@/components/shared/StatusPill";
import { formatCurrency } from "@/lib/utils";
import { cardsUpiService } from "@/services/cardsUpiService";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const columns: GridColDef[] = [
  {
    field: "user",
    headerName: "NAME",
    flex: 1,
    minWidth: 180,
    renderCell: ({ value }) => {
      return <div>{`${value?.first_name} ${value?.last_name}`}</div>;
    },
  },
  {
    field: "email",
    headerName: "EMAIL",
    flex: 1,
    minWidth: 180,
    renderCell: (params) => {
      return <div>{`${params?.row?.user?.email}`}</div>;
    },
  },
  {
    field: "number",
    headerName: "PHONE NUMBER",
    flex: 1,
    minWidth: 180,
    renderCell: (params) => {
      return <div>{`${params?.row?.user?.phone_number}`}</div>;
    },
  },
  {
    field: "account_number",
    headerName: "ACCOUNT NUMBER",
    flex: 1,
    minWidth: 180,
  },
  {
    field: "account_type",
    headerName: "ACCOUNT TYPE",
    flex: 1,
    minWidth: 140,
  },
  {
    field: "currency",
    headerName: "CURRENCY",
    flex: 1,
    minWidth: 140,
  },
  {
    field: "source_balance",
    headerName: "SOURCE BALANCE",
    flex: 1,
    minWidth: 140,
    renderCell: (params) => {
      return <div>{formatCurrency(params?.value, params?.row?.currency)}</div>;
    },
  },
  {
    field: "ledger_balance",
    headerName: "LEDGER BALANCE",
    flex: 1,
    minWidth: 140,
    renderCell: (params) => {
      return <div>{formatCurrency(params?.value, params?.row?.currency)}</div>;
    },
  },
  {
    field: "is_active",
    headerName: "STATUS",
    flex: 1,
    minWidth: 140,
    renderCell: ({ value }) => {
      return (
        <div>
          <StatusPill status={value ? "Active" : "Inactive"} />
        </div>
      );
    },
  },
];

function FundingAccountPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState();
  const [loading, setLoading] = useState(true);

  const GRID_OFFSET = 240;
  const ROW_HEIGHT = 38;
  const HEADER_HEIGHT = 56;

  const calculatePageSize = () => {
    const availableHeight = window.innerHeight - GRID_OFFSET - HEADER_HEIGHT;
    return Math.max(1, Math.floor(availableHeight / ROW_HEIGHT));
  };

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: calculatePageSize(),
  });

  const getAccounts = async () => {
    try {
      const limit = paginationModel?.pageSize;
      const offset = paginationModel?.page * limit;
      const res = await cardsUpiService.getAccounts({ limit, offset });
      setRows(res.data.data);
      setRowCount(res.data.count);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
        setLoading(false);
    }
  };

  const handleRowClick = ({ id }: { id: string }) => {
    navigate(`/admin/funding-account/${id}`);
  };

  useEffect(() => {
    getAccounts();
  }, []);
  return (
    <InvoicePageWrapper
      title="Funding Account"
      showDateFilter={false}
      showCreateButton={false}
      marginBottom="mb-0"
    >
      <DataTable
        rows={loading ? [] : rows}
        columns={columns}
        loading={loading}
        slots={{
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
        }}
        paginationMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        rowCount={rowCount}
        onRowClick={handleRowClick}
      />
    </InvoicePageWrapper>
  );
}

export default FundingAccountPage;
