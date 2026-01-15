import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBulkUploadStatusColor } from "@/lib/utils";
import { bulkImportService } from "@/services/bulkImportService";
import { Box } from "@mui/material";
import {
  GridPaginationModel,
  GridRowModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const columns: GridColDef[] = [
  {
    field: "source_file_name",
    headerName: "NAME",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "template_name",
    headerName: "TEMPLATE",
    minWidth: 160,
    flex: 1,
  },
  {
    field: "status",
    headerName: "STATUS",
    minWidth: 160,
    flex: 1,
    renderCell: ({ value }) => {
      return (
        <Badge className={getBulkUploadStatusColor(value)}>
          {value.replace("_", " ")}
        </Badge>
      );
    },
  },
  {
    field: "total_errors",
    headerName: "Errors",
    minWidth: 160,
    flex: 1,
  },
];

function BulkUploadedFilesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  const GRID_OFFSET = 200;
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

  const handleNavigate = ({
    status,
    type,
    fileid,
  }: {
    status: string;
    type: string;
    fileid: string;
  }) => {
    if (status === "MAPPING") {
      navigate(`/admin-settings/product-config/bulk-uploads/column-mapping/${type}/${fileid}`);
    } else if (
      status === "NEED_FIXES" ||
      status === "COMPLETED" ||
      status === "VALIDATING"
    ) {
      navigate(`/admin-settings/product-config/bulk-uploads/validate-file/${type}/${fileid}`);
    } else if (status === "FINALISED") {
      navigate(`/admin-settings/product-config/bulk-uploads/validate-file/${type}/${fileid}`);
    }
  };

  const handleRowClick = ({ row }: GridRowModel) => {
    handleNavigate({
      status: row.status,
      type: row.template_key,
      fileid: row.id,
    });
  };

  const getUploadedFiles = async ({
    limit,
    offset,
  }: {
    limit: number;
    offset: number;
  }) => {
    setLoading(true);
    try {
      const res = await bulkImportService.getImportedFiles({
        limit,
        offset,
      });
      setRows(res.data.data);
      setRowCount(res.data.count);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paginationModel) {
      const limit = paginationModel.pageSize || 10;
      const offset = (paginationModel.page || 0) * limit;
      getUploadedFiles({ limit, offset });
    }
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold capitalize">Bulk Uploaded Files</h1>
        <Button onClick={() => navigate('/admin-settings/product-config/bulk-uploads/user')}>Bulk Upload</Button>
      </div>
      <Box
        sx={{
          height: "calc(100vh - 120px)",
          width: "100%",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          columns={columns}
          rows={loading ? [] : rows}
          loading={loading}
          slots={{
            noRowsOverlay: () => <CustomNoRows title="" description="There are currently no uploaded files." />,
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel?.pageSize} />
          }}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "#9AA0A6",
              fontWeight: "bold",
              fontSize: "12px",
            },
            "& .MuiToolbar-root": {
              paddingX: 0,
            },
            "& .MuiDataGrid-panel .MuiSelect-select": {
              fontSize: "12px",
            },
            "& .MuiDataGrid-virtualScroller": {
              overflow: loading ? "hidden" : "auto",
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
          paginationMode="server"
          paginationModel={paginationModel || { page: 0, pageSize: 0 }}
          onPaginationModelChange={setPaginationModel}
          rowCount={rowCount}
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          onRowClick={handleRowClick}
          showCellVerticalBorder
        />
      </Box>
    </div>
  );
}

export default BulkUploadedFilesPage;
