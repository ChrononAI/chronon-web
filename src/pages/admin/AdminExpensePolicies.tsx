import AdminLayout from "@/components/layout/AdminLayout";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { policyService } from "@/services/admin/policyService";
import { PaginationInfo } from "@/store/expenseStore";
import { PolicyCategory } from "@/types/expense";
import { Box } from "@mui/material";
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const columns: GridColDef[] = [
  {
    field: "name",
    headerName: "NAME",
    width: 240,
  },
  {
    field: "is_pre_approval_required",
    headerName: "PRE APPROVAL",
    minWidth: 240,
  },
  {
    field: "categories",
    headerName: "CATEGORIES",
    flex: 1,
    minWidth: 240,
    renderCell: ({ value }) => {
      return (
        <span>{value.map((cat: PolicyCategory) => cat.name).join(", ")}</span>
      );
    },
  },
];

function AdminExpensePolicies() {
  const navigate = useNavigate();
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
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
    }
  };

  useEffect(() => {
    getPolicies({
      page: paginationModel.page + 1,
      perPage: paginationModel.pageSize,
    });
  }, [paginationModel.page, paginationModel.pageSize]);
  return (
    <Layout>
      <AdminLayout>
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
          <Box sx={{ height: "calc(100vh - 160px)", width: "100%" }}>
            <DataGrid
              className="rounded border-[0.2px] border-[#f3f4f6] h-full"
              columns={columns}
              rows={rows}
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
                "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus":
                  {
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
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              autoPageSize
            />
          </Box>
        </div>
      </AdminLayout>
    </Layout>
  );
}

export default AdminExpensePolicies;
