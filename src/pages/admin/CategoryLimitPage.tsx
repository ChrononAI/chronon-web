import AdminLayout from "@/components/layout/AdminLayout";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { policyRulesService } from "@/services/admin/policyRulesService";
import { useCategoryLimitStore } from "@/store/admin/categoryLimitStore";
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
    width: 160,
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    width: 200,
  },
  {
    field: "created_by",
    headerName: "CREATED BY",
    flex: 1,
    minWidth: 150,
    renderCell: ({ value }) => {
      return value.email;
    },
  },
];

function CategoryLimitPage() {
  const navigate = useNavigate();
  const { setSelectedLimit } = useCategoryLimitStore();

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  const [policyRules, setPolicyRules] = useState([]);

  const getPolicyRules = async () => {
    try {
      const res = await policyRulesService.getPolicyRules();
      setPolicyRules(res.data.data);
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data.message ||
          error.message ||
          "Failed to get policy rules"
      );
    }
  };

  const handleRowClick = ({row}: any) => {
    console.log(row);
    setSelectedLimit(row);
    navigate(`/admin/product-config/category-limits/${row.id}`)
  }

  useEffect(() => {
    getPolicyRules();
  }, []);

  return (
    <Layout noPadding>
      <AdminLayout>
        <div>
          {/* HEADER */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Categories</h1>
            <Button
              onClick={() =>
                navigate("/admin/product-config/category-limits/create")
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Category Limits
            </Button>
          </div>
          <Box
            sx={{
              height: "calc(100vh - 100px)",
              width: "100%",
            }}
          >
            <DataGrid
              className="rounded border-[0.2px] border-[#f3f4f6] h-full"
              columns={columns}
              rows={policyRules}
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
                "& .MuiCheckbox-root svg": {
                  width: 16,
                  height: 16,
                  backgroundColor: "transparent",
                  border: "0.2px solid #d9d9d9",
                  borderRadius: 1,
                },
                "& .MuiCheckbox-root svg path": {
                  display: "none",
                },
                "& .MuiCheckbox-root.Mui-checked:not(.MuiCheckbox-indeterminate) svg":
                  {
                    backgroundColor: "#1890ff",
                    borderColor: "#1890ff",
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
              //   slots={{
              //     baseCheckbox: ThinBorderCheckbox,
              //   }}
              showToolbar
              density="compact"
              checkboxSelection
              disableRowSelectionOnClick
              showCellVerticalBorder
                onRowClick={handleRowClick}
              pagination
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

export default CategoryLimitPage;
