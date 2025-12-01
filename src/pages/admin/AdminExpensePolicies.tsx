import { Button } from "@/components/ui/button";
import { policyService } from "@/services/admin/policyService";
import { PaginationInfo } from "@/store/expenseStore";
import { PolicyCategory } from "@/types/expense";
import { Box } from "@mui/material";
import { GridOverlay } from "@mui/x-data-grid";
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { CheckCircle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No policies found</h3>
          <p className="text-muted-foreground">
            There are currently no policies.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

const columns: GridColDef[] = [
  {
    field: "name",
    headerName: "NAME",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "is_pre_approval_required",
    headerName: "PRE APPROVAL",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "categories",
    headerName: "CATEGORIES",
    minWidth: 200,
    flex: 1,
    renderCell: ({ value }) => {
      return (
        <span>{value.map((cat: PolicyCategory) => cat.name).join(", ")}</span>
      );
    },
  },
];

function AdminExpensePolicies() {
  const navigate = useNavigate();
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>({
      page: 0,
      pageSize: 10,
    });
    const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, []);

  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>();

  const [rows, setRows] = useState([]);

  const getPolicies = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      setLoading(true);
      const res = await policyService.getPolicies({ page, perPage });
      setRows(res.data.data);
      setPaginationInfo(res.data.pagination);
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to get policies"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPolicies({
      page: (paginationModel?.page || 0) + 1,
      perPage: paginationModel?.pageSize || 0,
    });
  }, [paginationModel?.page, paginationModel?.pageSize]);
  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Policies</h1>
        <Button
          onClick={() =>
            navigate("/admin/product-config/expense-policies/create")
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Policy
        </Button>
      </div>
      <Box sx={{ height: "calc(100vh - 100px)", width: "100%" }}>
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
            "& .MuiDataGrid-main": {
              border: "0.2px solid #f3f4f6",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#f3f4f6",
              border: "none",
            },
            "& .MuiDataGrid-columnHeaders": {
              border: "none",
              borderTop: "none",
              borderBottom: "none",
            },
            "& .MuiCheckbox-root": {
              color: "#9AA0A6",
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
          paginationMode="server"
          rowCount={paginationInfo ? paginationInfo.total : 0}
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
          onPaginationModelChange={setPaginationModel}
        />
      </Box>
    </div>
  );
}

export default AdminExpensePolicies;
