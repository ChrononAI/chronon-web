import { useEffect, useState } from "react";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge, Box } from "@mui/material";
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import {
  AccountType,
  AdvanceService,
  LedgerType,
} from "@/services/advanceService";

const columns: GridColDef[] = [
  {
    field: "account_id",
    headerName: "ACCOUNT ID",
    flex: 1,
  },
  {
    field: "transaction_type",
    headerName: "TN TYPE",
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
    flex: 1,
    valueFormatter: (val) => formatDate(val)
  },
  {
    field: "amount",
    headerName: "AMOUNT",
    align: "right",
    headerAlign: "right",
    flex: 0.8,
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
    flex: 0.8,
    valueFormatter: (value) => formatCurrency(value),
  },
];

function AdvanceAccounts() {
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);

  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [ledger, setLedger] = useState<LedgerType[]>([]);

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
    try {
      const res = await AdvanceService.getAccountLedger(id);
      const newRes = JSON.parse(JSON.stringify(res.data.data));
      const newRows = newRes.map((row: LedgerType, idx: number) => {
        return {
          ...row,
          account_id: `ACC${idx + 1}`,
        };
      });
      setLedger(newRows);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, []);

  useEffect(() => {
    getAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      getAccountsLedger(selectedAccount);
    }
  }, [selectedAccount]);
  return (
    <ReportsPageWrapper
      title="Accounts"
      searchTerm={""}
      searchPlaceholder=""
      showFilters={false}
      showDateFilter={false}
      showCreateButton={false}
    >
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {accounts.map((card) => {
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
                      <span className="truncate">{card.policy_id}</span>{" "}
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[12px] p-2 rounded-[8px]">
                        Open
                      </Badge>
                    </CardTitle>
                  </div>
                  <div>{formatCurrency(+card.balance_amount)}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Box
          sx={{
            height: "calc(100vh - 260px)",
            width: "100%",
            marginTop: "-32px",
          }}
        >
          <DataGrid
            className="rounded border-[0.2px] border-[#f3f4f6] h-full"
            rows={ledger}
            columns={columns}
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
            checkboxSelection
            disableRowSelectionOnClick
            showCellVerticalBorder
            pagination
            // paginationMode="server"
            paginationModel={paginationModel || { page: 0, pageSize: 0 }}
            onPaginationModelChange={setPaginationModel}
            // rowCount={
            //   (activeTab === "all"
            //     ? allExpensesPagination?.total
            //     : activeTab === "draft"
            //     ? draftExpensesPagination?.total
            //     : reportedExpensesPagination?.total) || 0
            // }
            // rowCount={rows.length}
          />
        </Box>
      </div>
    </ReportsPageWrapper>
  );
}

export default AdvanceAccounts;
