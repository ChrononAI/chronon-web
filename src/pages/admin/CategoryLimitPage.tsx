import { Button } from "@/components/ui/button";
import { policyRulesService } from "@/services/admin/policyRulesService";
import { useCategoryLimitStore } from "@/store/admin/categoryLimitStore";
import { Box } from "@mui/material";
import { DataGrid, GridColDef, GridOverlay, GridPaginationModel, GridRowSelectionModel } from "@mui/x-data-grid";
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
          <h3 className="text-lg font-semibold mb-2">No rules found</h3>
          <p className="text-muted-foreground">
            There are currently no rules.
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
    minWidth: 160,
    flex: 1,
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    minWidth: 200,
    flex: 1,
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

  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>({
      page: 0,
      pageSize: 10,
    });
    const [loading, setLoading] = useState(true);
    const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, []);

  const [policyRules, setPolicyRules] = useState([]);

  const getPolicyRules = async () => {
    try {
      setLoading(true);
      const res = await policyRulesService.getPolicyRules();
      setPolicyRules(res.data.data);
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data.message ||
          error.message ||
          "Failed to get policy rules"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = ({ row }: any) => {
    console.log(row);
    setSelectedLimit(row);
    navigate(`/admin-settings/product-config/category-limits/${row.id}`);
  };

  useEffect(() => {
    getPolicyRules();
  }, []);

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Category Limits</h1>
        <Button
          onClick={() =>
            navigate("/admin-settings/product-config/category-limits/create")
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
          onRowClick={handleRowClick}
          rowSelectionModel={rowSelection}
          onRowSelectionModelChange={setRowSelection}
          pagination
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
          onPaginationModelChange={setPaginationModel}
        />
      </Box>
    </div>
  );
}

export default CategoryLimitPage;
