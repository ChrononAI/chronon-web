import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Plus } from "lucide-react";
import { Typography } from "@mui/material";
import { Input } from "@/components/ui/input";
import { FormActionFooter } from "@/components/layout/FormActionFooter";
import AddFundsDialog from "@/components/funding-account/AddFundsDialog";
import { useEffect, useState } from "react";
import { Account, cardsUpiService } from "@/services/cardsUpiService";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFundingAccountStore } from "@/store/fundingAccountStore";
import {
  buildBackendQuery,
  FilterMap,
  getFilterValue,
} from "../MyExpensesPage";

function AccountInfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-1/4 overflow-hidden">
      <div className="border border-[#e5e7eb] p-4">
        <Typography
          variant="caption"
          sx={{ color: "#6b7280", fontWeight: 500, whiteSpace: "nowrap" }}
          className="truncate"
        >
          {label}
        </Typography>

        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, mt: 0.5, whiteSpace: "nowrap" }}
          className="truncate"
        >
          {value}
        </Typography>
      </div>
    </div>
  );
}

function FundingAccountDetails() {
  const { id } = useParams();
  const [accountDetails, setAccountDetails] = useState<Account>();
  const [fundsDialogOpen, setFundsDialogOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [rowCount, setRowCount] = useState();
  const [loading, setLoading] = useState(true);

  const GRID_OFFSET = 500;
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

  console.log(paginationModel)

  const { query, setQuery } = useFundingAccountStore();
  const searchValue =
    (getFilterValue(query, "reference_id", "ilike") as string) ?? "";

  const updateSearch = (value: string) => {
    setQuery((prev: FilterMap) => {
      const next: FilterMap = { ...prev };
      if (!value) {
        delete next.reference_id;
      } else {
        next.reference_id = [{ operator: "ilike", value: `${value}` }];
      }
      return next;
    });
  };

  const getAccountTransactions = async ({
    limit,
    offset,
    userId,
  }: {
    limit: number;
    offset: number;
    userId: string | number;
  }) => {
    try {
      setLoading(true);
      const apiQuery = buildBackendQuery(query);
      const res = await cardsUpiService.getAccountTransactions({
        limit,
        offset,
        userId,
        query: apiQuery,
      });
      setTransactions(res.data.data);
      setRowCount(res.data.count);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  const getAccountDetails = async () => {
    try {
      if (id) {
        const res = await cardsUpiService.getAccountById(id);
        setAccountDetails(res.data.data[0]);
      }
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message);
    }
  };

  useEffect(() => {
    if (id) {
      const limit = paginationModel?.pageSize;
      const offset = paginationModel?.page * limit;
      getAccountTransactions({ limit, offset, userId: id });
    }
  }, [paginationModel.page, paginationModel.pageSize, query]);

  useEffect(() => {
    getAccountDetails();
  }, [id]);

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copied Reference ID");
  };

  const columns: GridColDef[] = [
    {
      field: "reference_id",
      headerName: "REFERENCE ID",
      flex: 1.5,
      minWidth: 200,
      renderCell: ({ value }) => {
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span onClick={() => handleCopy(value)}>{value}</span>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="bg-white text-black border border-[0.5]"
            >
              <p>{value}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      field: "created_at",
      headerName: "DATE",
      flex: 1,
      minWidth: 130,
      renderCell: ({ value }) => {
        return <span>{formatDate(value)}</span>;
      },
    },
    {
      field: "description",
      headerName: "DESCRIPTION",
      flex: 2,
      minWidth: 250,
      renderCell: ({ value }) => {
        return <span className="!font-bold">{value}</span>;
      },
    },
    {
      field: "merchant_name",
      headerName: "MERCHANT NAME",
      flex: 1.5,
      minWidth: 180,
      renderCell: ({ row }) => {
        return <span>{row.additional_data?.pine_response?.merchantName}</span>;
      },
    },
    {
      field: "amount",
      headerName: "AMOUNT",
      flex: 1,
      minWidth: 120,
      renderCell: ({ value }) => {
        return (
          <span className="!font-bold">
            {formatCurrency(value, accountDetails?.currency)}
          </span>
        );
      },
    },
    // {
    //   field: "transaction_status",
    //   headerName: "STATUS",
    //   flex: 1,
    //   minWidth: 130,
    //   renderCell: ({ value }) => {
    //     return <StatusPill status={value} />;
    //   },
    // },
  ];

  return (
    <>
      <InvoicePageWrapper
        title="Account Details"
        showDateFilter={false}
        showCreateButton={false}
        marginBottom="mb-0"
      >
        <div className="">
          <div className="flex items-center justify-between">
            <div className="py-6">
              <p className="text-gray-400 font-bold text-xs">CURRENT BALANCE</p>
              <span className="font-bold text-black text-2xl">
                {accountDetails &&
                  formatCurrency(
                    +accountDetails?.ledger_balance,
                    accountDetails?.currency,
                  )}
              </span>
            </div>
            <div>
              <Button
                onClick={() => setFundsDialogOpen(true)}
                className="text-xs py-2 px-3 h-[31px] bg-[#0D9C99] hover:bg-[#0b8a87]"
              >
                <Plus className="w-3 h-3 mr-2" />
                Add Funds
              </Button>
            </div>
          </div>

          <div className="mb-6 flex w-full">
            <AccountInfoBox
              label="Account Holder"
              value={`${accountDetails?.user?.first_name || ""} ${accountDetails?.user?.last_name || ""}`}
            />
            <AccountInfoBox
              label="Virtual Account Number"
              value={accountDetails?.account_number || ""}
            />
            <AccountInfoBox
              label="Email"
              value={accountDetails?.user?.email || ""}
            />
            <AccountInfoBox
              label="Phone Number"
              value={accountDetails?.user?.phone_number || ""}
            />
          </div>

          <div className="flex flex-col flex-1">
            <div className="flex justify-between mb-2">
              <div className="text-xl font-semibold mx-[10px]">
                Recent Activity
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <Input
                    placeholder="Search transactions"
                    value={searchValue}
                    className="!w-[300px]"
                    onChange={(e) => updateSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="!h-[calc(100vh-420px)] overflow-auto">
            <DataTable
              columns={columns}
              rows={loading ? [] : transactions}
              loading={loading}
              height="h-[calc(100vh-120px)]"
              slots={{
                loadingOverlay: () => (
                  <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
                ),
              }}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              paginationMode="server"
              rowCount={rowCount}
            />
          </div>

          <FormActionFooter
            secondaryButton={{
              label: "Download Statement",
              onClick: () => console.log("clicked"),
            }}
            primaryButton={{
              label: "Save View",
              onClick: () => console.log("clicked"),
              type: "button",
            }}
          />
        </div>
      </InvoicePageWrapper>
      {accountDetails && (
        <AddFundsDialog
          open={fundsDialogOpen}
          onOpenChange={setFundsDialogOpen}
          userId={accountDetails?.user?.id}
          onSuccess={getAccountDetails}
        />
      )}
    </>
  );
}

export default FundingAccountDetails;
