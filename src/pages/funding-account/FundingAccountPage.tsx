import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { GridColDef } from "@mui/x-data-grid";
import { Filter, Plus } from "lucide-react";
import { Typography } from "@mui/material";
import { StatusPill } from "@/components/shared/StatusPill";
import { Input } from "@/components/ui/input";
import { FormActionFooter } from "@/components/layout/FormActionFooter";

function AccountInfoBoxes({
  accountInfo,
}: {
  accountInfo: { id: number; label: string; value: string }[];
}) {
  return (
    <div className="flex w-full">
      {accountInfo.map((item) => (
        <div key={item.id} className="w-1/4">
          <div className="border border-[#e5e7eb] p-4">
            <Typography
              variant="caption"
              sx={{ color: "#6b7280", fontWeight: 500 }}
            >
              {item.label}
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 0.5 }}>
              {item.value}
            </Typography>
          </div>
        </div>
      ))}
    </div>
  );
}

const columns: GridColDef[] = [
  { field: "date", headerName: "Date", flex: 1, minWidth: 130 },
  {
    field: "description",
    headerName: "Description",
    flex: 2,
    minWidth: 250,
    renderCell: ({ value }) => {
      return <span className="!font-bold">{value}</span>;
    },
  },
  {
    field: "transactionId",
    headerName: "Transaction ID",
    flex: 1.5,
    minWidth: 180,
  },
  {
    field: "amount",
    headerName: "Amount",
    flex: 1,
    minWidth: 120,
    renderCell: ({ value }) => {
      const isNegative = value.includes("-");
      return (
        <span className={`${isNegative ? "" : "!text-[#5DC364]"} !font-bold`}>
          {!isNegative && "+"}
          {formatCurrency(value)}
        </span>
      );
    },
  },
  {
    field: "status",
    headerName: "Status",
    flex: 1,
    minWidth: 130,
    renderCell: ({ value }) => {
      return <StatusPill status={value} />;
    },
  },
];

const rows = [
  {
    id: 1,
    date: "Oct 24, 2023",
    description: "Top up via Bank Transfer",
    transactionId: "TRX-94827110",
    amount: "+15000",
    status: "Completed",
  },
  {
    id: 2,
    date: "Oct 23, 2023",
    description: "Batch Salary Payout - Dept A",
    transactionId: "TRX-94826842",
    amount: "-8420",
    status: "Completed",
  },
  {
    id: 3,
    date: "Oct 22, 2023",
    description: "AWS Cloud Services Payment",
    transactionId: "TRX-94825901",
    amount: "-1240",
    status: "Processing",
  },
  {
    id: 4,
    date: "Oct 21, 2023",
    description: "Refund - SaaS Subscription",
    transactionId: "TRX-94824219",
    amount: "+299",
    status: "Completed",
  },
  {
    id: 5,
    date: "Oct 20, 2023",
    description: "Employee Reimbursement - #492",
    transactionId: "TRX-94823100",
    amount: "-156",
    status: "Completed",
  },
  {
    id: 6,
    date: "Oct 19, 2023",
    description: "Office Supplies Requisition",
    transactionId: "TRX-94822088",
    amount: "-89",
    status: "Declined",
  },
];

const accountInfo = [
  {
    id: 1,
    label: "Account Holder",
    value: "Chronon Enterprise Inc.",
  },
  {
    id: 2,
    label: "Virtual Account Number",
    value: "9920 1837 4421",
  },
  {
    id: 3,
    label: "Bank Name",
    value: "Stellar Reserve Bank",
  },
  {
    id: 4,
    label: "IFSC Code",
    value: "STRB0004521",
  },
];

function FundingAccountPage() {
  return (
    <InvoicePageWrapper
      title="Funding Account"
      showDateFilter={false}
      showCreateButton={false}
      marginBottom="mb-0"
    >
      <div className="flex items-center justify-between">
        <div className="p-6">
          <p className="text-gray-400 font-bold text-xs">CURRENT BALANCE</p>
          <span className="font-bold text-black text-4xl">
            {formatCurrency(42650)}
          </span>
        </div>
        <div>
          <Button className="text-xs py-2 px-3 h-[31px] bg-[#0D9C99]">
            <Plus className="w-3 h-3 mr-2" />
            Add Funds
          </Button>
        </div>
      </div>
      <div className="mb-6">
        <AccountInfoBoxes accountInfo={accountInfo} />
      </div>
      <div className="h-full">
        <div className="flex justify-between mb-2">
          <div className="text-xl font-semibold mx-[10px]">Recent Activity</div>
          <div className="flex items-center gap-2">
            <div>
              <Input placeholder="Search transactions" className="h-[31px]" />
            </div>
            <Button className="text-xs py-2 px-3 h-[31px]" variant="outline">
              <Filter className="w-3 h-3 mr-2" />
              Filter
            </Button>
          </div>
        </div>
        <div className="h-[50vh]">
          <DataTable
            columns={columns}
            rows={rows}
          />
        </div>
        {/* <div className="flex justify-end items-center gap-4">
          <Button className="px-3 py-2 h-[31px]" variant="outline">
            Download Statement
          </Button>
          <Button className="px-3 py-2 h-[31px] bg-[#0D9C99]">Ssve View</Button>
        </div> */}
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
  );
}

export default FundingAccountPage;
