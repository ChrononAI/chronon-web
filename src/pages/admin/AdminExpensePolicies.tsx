import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { Button } from "@/components/ui/button";
import { policyService } from "@/services/admin/policyService";
import { PaginationInfo } from "@/store/expenseStore";
import { PolicyCategory } from "@/types/expense";
import { Box } from "@mui/material";
import { GridRowSelectionModel } from "@mui/x-data-grid";
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(true);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  const GRID_OFFSET = 190;
  const ROW_HEIGHT = 38;
  const HEADER_HEIGHT = 0;

  const calculatePageSize = () => {
    const availableHeight =
      window.innerHeight - GRID_OFFSET - HEADER_HEIGHT;
    return Math.max(1, Math.floor(availableHeight / ROW_HEIGHT));
  };

  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel>({
      page: 0,
      pageSize: calculatePageSize(),
    });

  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>();

  const [rows, setRows] = useState([]);

  const handleRowClick = ({ row }: any) => {
    navigate(
      `/admin-settings/product-config/expense-policies/create/${row.id}`,
      { state: row }
    );
  };

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
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);
  return (
    <div>
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Policies</h1>
        <Button
          onClick={() =>
            navigate("/admin-settings/product-config/expense-policies/create")
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
          rows={loading ? [] : rows}
          loading={loading}
          slots={{
            noRowsOverlay: () => <CustomNoRows title="No policies found" description="There are currently no policies" />,
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
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
            "& .MuiDataGrid-virtualScroller": {
              overflow: loading ? "hidden" : "auto",
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
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          showCellVerticalBorder
          rowSelectionModel={rowSelection}
          onRowClick={handleRowClick}
          onRowSelectionModelChange={setRowSelection}
          pagination
          paginationMode="server"
          rowCount={paginationInfo ? paginationInfo.total : 0}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
        />
      </Box>
    </div>
  );
}

export default AdminExpensePolicies;
