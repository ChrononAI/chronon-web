import { bulkImportService } from "@/services/bulkImportService";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import { FormFooter } from "@/components/layout/FormFooter";
import { Box } from "@mui/material";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";
import { GridPaginationModel } from "@mui/x-data-grid";

function generateHeaders(data: string[]) {
  return data.map((header) => ({
    field: header,
    headerName: header,
    flex: 1,
    minWidth: 150,
  }));
}

function generateRows(data: any[]) {
  return data.map((row, idx) => {
    return {
      id: idx,
      ...row.raw_data,
    };
  });
}

function PreviewFile() {
  const navigate = useNavigate();
  const { fileid, type } = useParams();
  const [columns, setColumns] = useState<GridColDef[]>([]);
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [loading, setLoading] = useState(true);

  const GRID_OFFSET = 280;
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

  const fetchFileData = async (fileid: string) => {
    try {
      const res = await bulkImportService.getFileDetailsById(fileid);
      setColumns(generateHeaders(res.data.data[0].detected_headers));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error.message ||
        "Error fetching file details"
      );
    }
  };

  const fetchRows = async (fileid: string) => {
    try {
      const res = await bulkImportService.getMappedData(fileid, 10, 0);
      setRows(generateRows(res.data.data));
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  const proceedToMapping = () => {
    navigate(
      `/admin-settings/product-config/bulk-uploads/column-mapping/${type}/${fileid}`
    );
  };

  const fetchData = async (fileid: string) => {
    try {
      await Promise.all([fetchFileData(fileid), fetchRows(fileid)]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fileid) {
      fetchData(fileid);
    }
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold capitalize">Preview File</h1>
      </div>
      <Box
        sx={{
          height: "calc(100vh - 196px)",
          width: "100%",
        }}
      >
        <DataGrid
          columns={columns || []}
          rows={loading ? [] : (rows || [])}
          loading={loading}
          slots={{
            noRowsOverlay: () => <CustomNoRows title="No entries found" description="There are currently no entries" />,
            loadingOverlay: () => <SkeletonLoaderOverlay rowCount={paginationModel.pageSize} />
          }}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaderTitle": {
              color: "#9AA0A6",
              fontWeight: "bold",
              fontSize: "12px",
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
          density="compact"
          pagination
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          disableRowSelectionOnClick
        />
      </Box>
      <FormFooter>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button onClick={proceedToMapping}>Proceed To Mapping</Button>
      </FormFooter>
    </div>
  );
}

export default PreviewFile;
