import { useEffect, useState } from "react";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge, Box } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridOverlay,
  GridPaginationModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import {
  AccountType,
  AdvanceService,
  LedgerType,
} from "@/services/advanceService";
import { Policy } from "@/types/expense";
import { expenseService } from "@/services/expenseService";
import {
  preApprovalService,
  PreApprovalType,
} from "@/services/preApprovalService";
import { CheckCircle } from "lucide-react";

const columns: GridColDef[] = [
  {
    field: "account_id",
    headerName: "ACCOUNT ID",
    minWidth: 100,
    flex: 1,
  },
  {
    field: "transaction_type",
    headerName: "TN TYPE",
    minWidth: 80,
    flex: 1,
    renderCell: ({ row }) => {
      let type;
      if (+row.credit_amount) {
        type = "Credit";
      } else {
        type = "Debit";
      }
      return <span>{type}</span>;
    },
  },
  {
    field: "created_at",
    headerName: "TN DATE",
    minWidth: 120,
    flex: 1,
    valueFormatter: (val) => formatDate(val),
  },
  {
    field: "amount",
    headerName: "AMOUNT",
    align: "right",
    headerAlign: "right",
    minWidth: 120,
    flex: 1,
    renderCell: ({ row }) => {
      let amount;
      if (+row.credit_amount) {
        amount = row.credit_amount;
      } else {
        amount = row.debit_amount;
      }
      return <span>{formatCurrency(amount)}</span>;
    },
  },
  {
    field: "balance_amount",
    headerName: "BALANCE",
    align: "right",
    headerAlign: "right",
    minWidth: 120,
    flex: 1,
    valueFormatter: (value) => formatCurrency(value),
  },
];

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No entries found</h3>
          <p className="text-muted-foreground">
            There are currently no entries.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

function AccountCard({
  card,
  selectedAccount,
  setSelectedAccount,
  policies,
  preApprovals,
}: {
  card: AccountType;
  selectedAccount: string;
  setSelectedAccount: any;
  policies: any[];
  preApprovals: any[];
}) {
  const policy = policies.find((pol) => pol.id === card.policy_id);
  const preApproval = preApprovals.find(
    (preApp) => preApp.id === card.pre_approval_id
  );
  return (
    <Card
      key={card.id}
      className={
        selectedAccount === card.id
          ? "p-4 cursor-pointer border-2 border-blue-500"
          : "p-4 cursor-pointer"
      }
      onClick={() => setSelectedAccount(card.id)}
    >
      <CardContent className="p-0 space-y-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="truncate">{card.account_name}</span>{" "}
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[12px] p-2 rounded-[8px]">
              Open
            </Badge>
          </CardTitle>
          <CardDescription>
            {policy || preApproval ? (
              <div className="flex items-center gap-6">
                <span>{policy?.name || "NA"}</span>
                <span>{preApproval?.name}</span>
              </div>
            ) : (
              <span>Open Advance</span>
            )}
          </CardDescription>
        </div>
        <div>{formatCurrency(+card.balance_amount)}</div>
      </CardContent>
    </Card>
  );
}

function AdvanceAccounts() {
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);

  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [ledger, setLedger] = useState<LedgerType[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [preApprovals, setPreApprovals] = useState<PreApprovalType[]>([]);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  const getAccounts = async () => {
    try {
      const res = await AdvanceService.getAccounts();
      setSelectedAccount(res.data.data[0].id);
      setAccounts(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getAccountsLedger = async (id: string) => {
    setLoading(true);
    try {
      const res = await AdvanceService.getAccountLedger(id);
      const newRes = JSON.parse(JSON.stringify(res.data.data));
      const newRows = newRes.map((row: LedgerType, idx: number) => {
        return {
          ...row,
          account_id: idx + 1,
        };
      });
      setLedger(newRows);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getPolicies = async () => {
    try {
      const res = await expenseService.getAllPolicies();
      setPolicies(res);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreApprovals = async () => {
    try {
      const res = await preApprovalService.fetchAllPreApprovals();
      setPreApprovals(res.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const gridHeight = window.innerHeight - 400;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([getAccounts(), getPolicies(), fetchPreApprovals()]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      getAccountsLedger(selectedAccount);
    }
    setRowSelection({ type: "include", ids: new Set() });
  }, [selectedAccount]);

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  return (
    <ReportsPageWrapper
      title="Accounts"
      searchTerm={""}
      searchPlaceholder=""
      showFilters={false}
      showDateFilter={false}
      showCreateButton={false}
    >
      <div>
        <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {accounts.map((card) => (
            <div
              key={card.id}
              className="flex-shrink-0 w-full md:w-1/3 lg:w-1/5"
            >
              <AccountCard
                card={card}
                selectedAccount={selectedAccount}
                setSelectedAccount={setSelectedAccount}
                policies={policies}
                preApprovals={preApprovals}
              />
            </div>
          ))}
        </div>
        <Box
          sx={{
            height: "calc(100vh - 260px)",
            width: "100%",
          }}
        >
          <DataGrid
            className="rounded border-[0.2px] border-[#f3f4f6] h-full"
            rows={loading ? [] : ledger}
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
            density="compact"
            checkboxSelection
            disableRowSelectionOnClick
            showCellVerticalBorder
            rowSelectionModel={rowSelection}
            onRowSelectionModelChange={setRowSelection}
            pagination
            paginationModel={paginationModel || { page: 0, pageSize: 0 }}
            onPaginationModelChange={setPaginationModel}
          />
        </Box>
      </div>
    </ReportsPageWrapper>
  );
}

export default AdvanceAccounts;
