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
import { DataGrid, GridColDef, GridOverlay } from "@mui/x-data-grid";
import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No uploaded files found
          </h3>
          <p className="text-muted-foreground">
            There are currently no uploaded files.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

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
  const [loading, setLoading] = useState(false);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel | null>(null);

  const handleNavigate = ({
    status,
    type,
    fileid,
  }: {
    status: string;
    type: string;
    fileid: string;
  }) => {
    console.log(status, fileid);
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

  useEffect(() => {
    const gridHeight = window.innerHeight - 300;
    const rowHeight = 36;
    const calculatedPageSize = Math.floor(gridHeight / rowHeight);
    setPaginationModel({ page: 0, pageSize: calculatedPageSize });
  }, []);

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
            "& .MuiToolbar-root": {
              paddingX: 0,
            },
            "& .MuiDataGrid-panel .MuiSelect-select": {
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
