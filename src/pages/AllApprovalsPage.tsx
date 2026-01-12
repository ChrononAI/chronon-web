import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridOverlay,
} from "@mui/x-data-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportsPageWrapper } from "@/components/reports/ReportsPageWrapper";
import { FileText, Upload, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Approval {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  invoiceDate: string;
  submittedBy: string;
  status: string;
  totalAmount: string;
}

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No approvals found</h3>
          <p className="text-muted-foreground">
            There are currently no approvals pending.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

const columns: GridColDef[] = [
  {
    field: "invoiceNumber",
    headerName: "INVOICE NUMBER",
    flex: 1,
    minWidth: 150,
  },
  {
    field: "vendorName",
    headerName: "VENDOR NAME",
    flex: 1,
    minWidth: 200,
  },
  {
    field: "invoiceDate",
    headerName: "INVOICE DATE",
    flex: 1,
    minWidth: 150,
  },
  {
    field: "submittedBy",
    headerName: "SUBMITTED BY",
    flex: 1,
    minWidth: 150,
  },
  {
    field: "status",
    headerName: "STATUS",
    flex: 1,
    minWidth: 120,
    renderCell: ({ value }) => {
      return (
        <Badge
          className={
            value === "Pending"
              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
              : value === "Approved"
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : value === "Rejected"
              ? "bg-red-100 text-red-800 hover:bg-red-100"
              : "bg-gray-100 text-gray-800 hover:bg-gray-100"
          }
        >
          {value}
        </Badge>
      );
    },
  },
  {
    field: "totalAmount",
    headerName: "TOTAL AMOUNT",
    flex: 1,
    minWidth: 150,
  },
];

const dummyApprovals: Approval[] = Array.from({ length: 15 }, (_, i) => ({
  id: String(i + 1),
  invoiceNumber: `INV-${String(i + 1).padStart(4, "0")}`,
  vendorName: "Sri Tattva Industries",
  invoiceDate: "23 Dec, 2023",
  submittedBy: "John Doe",
  status: "Pending",
  totalAmount: "$15,273.12",
}));

export function AllApprovalsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  const handleRowClick = (params: any) => {
    navigate(`/flow/approvals/${params.id}`);
  };

  const filteredApprovals = dummyApprovals.filter((approval) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      approval.invoiceNumber.toLowerCase().includes(searchLower) ||
      approval.vendorName.toLowerCase().includes(searchLower) ||
      approval.submittedBy.toLowerCase().includes(searchLower)
    );
  });

  return (
    <ReportsPageWrapper
      title="Approvals"
      showCreateButton={false}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search by invoice number/vendor/submitted by"
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      showFilters={true}
      showDateFilter={true}
    >
      <Box
        sx={{
          height: "calc(100vh - 240px)",
          width: "100%",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          rows={filteredApprovals}
          columns={columns}
          loading={false}
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
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          density="compact"
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          showCellVerticalBorder
        />
      </Box>
    </ReportsPageWrapper>
  );
}

