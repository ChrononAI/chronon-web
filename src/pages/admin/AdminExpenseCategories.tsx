import AdminLayout from "@/components/layout/AdminLayout";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { categoryService } from "@/services/admin/categoryService";
import { Box } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
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
    field: "category_type",
    headerName: "TYPE",
    minWidth: 240,
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    flex: 1,
    minWidth: 240,
  },
];

function AdminExpenseCategories() {
  const navigate = useNavigate();
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const [rows, setRows] = useState([]);

  const getCategories = async ({
    page,
    perPage,
  }: {
    page: number;
    perPage: number;
  }) => {
    try {
      const res = await categoryService.getCategories({ page, perPage });
      setRows(res.data.data);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error.message || 'Failed to get categories')
    }
  };

  useEffect(() => {
    // Get categories
    getCategories({ page: 1, perPage: 10 });
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
                navigate("/admin/product-config/expense-categories/create")
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Categories
            </Button>
          </div>
          <Box sx={{ height: "calc(100vh - 100px)", width: "100%" }}>
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

export default AdminExpenseCategories;
