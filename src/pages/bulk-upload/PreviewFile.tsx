import { bulkImportService } from "@/services/bulkImportService";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { DataGrid, GridColDef, GridRowsProp } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import { FormFooter } from "@/components/layout/FormFooter";

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
            ...row.raw_data
        }
    })
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
        const res = await bulkImportService.getMappedData(fileid);
        setRows(generateRows(res.data.data))
    } catch (error) {
        console.log(error);
    }
  }

  const proceedToMapping = () => {
    navigate(`/bulk-upload/column-mapping/${type}/${fileid}`);
  };

  useEffect(() => {
    if (fileid) {
      fetchFileData("biteGmpNbxWf");
      fetchRows("biteGmpNbxWf");
    }
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold capitalize">Preview File</h1>
      </div>
      <DataGrid
        columns={columns || []}
        rows={rows || []}
        disableRowSelectionOnClick
      />
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
