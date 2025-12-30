import { bulkImportService } from "@/services/bulkImportService";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import { FormFooter } from "@/components/layout/FormFooter";
import { Box } from "@mui/material";

function generateHeaders(data: string[]) {
  return data.map((header) => ({
    field: header,
    headerName: header,
    flex: 1,
    minWidth: 150,
    editable: true,
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
      console.log(res.data.data);
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

  useEffect(() => {
    if (fileid) {
      fetchFileData(fileid);
      fetchRows(fileid);
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
          rows={rows || []}
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
          pageSizeOptions={[10]}
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
