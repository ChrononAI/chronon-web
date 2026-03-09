import CustomCardsToolbar from "@/components/cards-upi/CustomCardsToolbar";
import { InvoicePageWrapper } from "@/components/invoice/InvoicePageWrapper";
import { DataTable } from "@/components/shared/DataTable";
import { GridColDef } from "@mui/x-data-grid";
import { DotsVerticalIcon } from "@radix-ui/react-icons";
import { Ban, CreditCard, QrCode } from "lucide-react";

export const columns: GridColDef[] = [
  {
    field: "userName",
    headerName: "USER NAME",
    flex: 1.5,
    minWidth: 200,
  },
  {
    field: "employeeId",
    headerName: "EMPLOYEE ID",
    flex: 1,
    minWidth: 140,
  },
  {
    field: "instrument",
    headerName: "INSTRUMENT",
    flex: 1,
    minWidth: 120,
    renderCell: ({ value }) => {
      let icon;

      if (value === "CARD") {
        icon = <CreditCard className="h-4 w-4" />;
      } else if (value === "UPI") {
        icon = <QrCode className="h-4 w-4" />;
      } else {
        icon = <Ban className="h-4 w-4" />;
      }

      return (
        <span className="flex items-center gap-2">
          {icon}
          {value || "None"}
        </span>
      );
    },
  },
  {
    field: "idNumber",
    headerName: "ID NUMBER",
    flex: 1,
    minWidth: 150,
  },
  {
    field: "status",
    headerName: "STATUS",
    flex: 1,
    minWidth: 130,
  },
  {
    field: "actions",
    headerName: "ACTIONS",
    sortable: false,
    align: "right",
    filterable: false,
    flex: 0.5,
    minWidth: 90,
    renderCell: () => {
      return (
        <span className="flex justify-end">
          <DotsVerticalIcon />
        </span>
      );
    },
  },
];

export interface CardUPIRow {
  id: number;
  userName: string;
  employeeId: string;
  instrument: string | null;
  idNumber: string;
  status: string;
  actions?: string;
}

export const rows: CardUPIRow[] = [
  {
    id: 1,
    userName: "Jane Doe",
    employeeId: "CHR-9021",
    instrument: "CARD",
    idNumber: "**** 5502",
    status: "ISSUED",
  },
  {
    id: 2,
    userName: "Michael Scott",
    employeeId: "CHR-4432",
    instrument: "UPI",
    idNumber: "ms@upi",
    status: "KYC PENDING",
  },
  {
    id: 3,
    userName: "Eleanor Hartley",
    employeeId: "CHR-1298",
    instrument: null,
    idNumber: "N/A",
    status: "NOT ISSUED",
  },
  {
    id: 4,
    userName: "Rajesh Kumar",
    employeeId: "CHR-7781",
    instrument: "UPI",
    idNumber: "**** 1104 / rk@upi",
    status: "ISSUED",
  },
  {
    id: 5,
    userName: "Sarah Tan",
    employeeId: "CHR-3318",
    instrument: "CARD",
    idNumber: "**** 0921",
    status: "ISSUED",
  },
];

function CardsUPIPage() {
  return (
    <InvoicePageWrapper
      title="Cards/UPI Management"
      showDateFilter={false}
      showCreateButton={false}
      marginBottom="mb-0"
    >
      <DataTable
        columns={columns}
        rows={rows}
        slots={{
          toolbar: CustomCardsToolbar,
        }}
        slotProps={{
            toolbar: {
                allStatuses: ["ISSUED", "NOT ISSUED", "KYC PENDING"]
            }
        }}
        showToolbar
      />
    </InvoicePageWrapper>
  );
}

export default CardsUPIPage;
