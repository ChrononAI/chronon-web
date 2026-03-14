import CustomCardsToolbar from "@/components/cards-upi/CustomCardsToolbar";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { DataTable } from "@/components/shared/DataTable";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { StatusPill } from "@/components/shared/StatusPill";
import { formatDate } from "@/lib/utils";
import { cardsUpiService, KYCRecord } from "@/services/cardsUpiService";
import { useCardsStore } from "@/store/cardsStore";
import { Menu, MenuItem } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Ellipsis, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { buildBackendQuery } from "../MyExpensesPage";

export interface CardUPIRow {
  id: number;
  userName: string;
  employeeId: string;
  instrument: string | null;
  idNumber: string;
  status: string;
  actions?: string;
}

function CardsUPIPage() {
  const { query } = useCardsStore();
  console.log(buildBackendQuery(query));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [rows, setRows] = useState<KYCRecord[]>([]);
  const [rowCount, setRowCount] = useState([]);
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

  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: any, row: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getKycStatuses = async ({
    limit,
    offset,
    query,
  }: {
    limit: number;
    offset: number;
    query: string;
  }) => {
    try {
      const res = await cardsUpiService.getKycStatuses({
        limit,
        offset,
        query,
      });
      setRows(res.data.data);
      setRowCount(res.data.count);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshKycStatus = async (user_id: string) => {
    try {
      await cardsUpiService.refreshKycStatus(user_id);
      const limit = paginationModel?.pageSize;
      const offset = paginationModel?.page * limit;
      await getKycStatuses({ limit, offset, query: buildBackendQuery(query) });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const limit = paginationModel?.pageSize;
    const offset = paginationModel?.page * limit;
    const apiQuery= buildBackendQuery(query);
    getKycStatuses({ limit, offset, query: apiQuery });
  }, [paginationModel.pageSize, paginationModel.page, query]);

  const columns: GridColDef[] = [
    {
      field: "user_name",
      headerName: "NAME",
      flex: 1.5,
      minWidth: 200,
      renderCell: ({ value }) => {
        return <div>{value || "-"}</div>;
      },
    },
    {
      field: "user_email",
      headerName: "EMAIL",
      flex: 1.5,
      minWidth: 200,
      renderCell: ({ value }) => {
        return <div>{value || "-"}</div>;
      },
    },
    {
      field: "user_phone_number",
      headerName: "PHONE NUMBER",
      flex: 1,
      minWidth: 150,
      renderCell: ({ value }) => {
        return <div>{value ?? "-"}</div>;
      },
    },
    {
      field: "full_kyc_state",
      headerName: "STATUS",
      flex: 1,
      minWidth: 130,
      renderCell: ({ value }) => {
        return (
          <span>
            <StatusPill status={value} />
          </span>
        );
      },
    },
    {
      field: "full_kyc_completed_at",
      headerName: "COMPLETED AT",
      flex: 1,
      minWidth: 130,
      renderCell: ({ value }) => {
        return <span>{formatDate(value)}</span>;
      },
    },
    {
      field: "full_kyc_expires_at",
      headerName: "EXPIRES AT",
      flex: 1,
      minWidth: 130,
      renderCell: ({ value }) => {
        return <span>{formatDate(value)}</span>;
      },
    },
    {
      field: "actions",
      headerName: "ACTIONS",
      sortable: false,
      filterable: false,
      flex: 0.5,
      minWidth: 90,
      renderCell: (params) => {
        return (
          <span className="flex justify-center w-full">
            <Ellipsis
              onClick={(e) => handleMenuOpen(e, params.row)}
              className="h-4 w-4"
            />
          </span>
        );
      },
    },
  ];

  return (
    <InvoicePageWrapper
      title="Cards/UPI Management"
      showDateFilter={false}
      showCreateButton={false}
      marginBottom="mb-0"
    >
      <DataTable
        columns={columns}
        rows={loading ? [] : rows}
        loading={loading}
        slots={{
          toolbar: CustomCardsToolbar,
          loadingOverlay: () => (
            <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
          ),
        }}
        slotProps={{
          toolbar: {
            allStatuses: ["COMPLETED", "PENDING"],
          },
        }}
        paginationMode="server"
        rowCount={rowCount}
        showToolbar
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />
      <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
        <MenuItem
          className="!text-sm flex items-center gap-2"
          onClick={() => {
            refreshKycStatus(selectedRow.user_id);
            handleMenuClose();
          }}
        >
          <RefreshCcw className="h-4 w-4" />
          <span>Refresh KYC</span>
        </MenuItem>
      </Menu>
    </InvoicePageWrapper>
  );
}

export default CardsUPIPage;
