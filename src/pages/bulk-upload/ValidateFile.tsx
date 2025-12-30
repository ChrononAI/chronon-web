import { FormFooter } from "@/components/layout/FormFooter";
import { Button } from "@/components/ui/button";
import { bulkImportService } from "@/services/bulkImportService";
import { Tooltip } from "@mui/material";
import { DataGrid, GridCellParams, GridColDef } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

function generateHeaders(
  headers: any[],
): GridColDef[] {
  return headers.map(
    (header): GridColDef => ({
      field: header.field_key,
      headerName: header.display_name,
      flex: 1,
      minWidth: 150,
    })
  );
}

function ValidateFile() {
  const { fileid } = useParams();
  const navigate = useNavigate();
  const [needFixes, setNeedFixes] = useState(false);
  const [rows, setRows] = useState<any>([]);
  const [mappedRows, setMappedRows] = useState([]);
  const [issueRows, setIssueRows] = useState<any[]>([]);
  const [fileData, setFileData] = useState<any>();

  const cellErrorMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};

    issueRows.forEach((issue: any) => {
      const rowId = issue.bulk_import_row_id;
      const field = issue.field_key;
      const message = issue.message || "Invalid value";

      if (!map[rowId]) {
        map[rowId] = {};
      }

      map[rowId][field] = message;
    });

    return map;
  }, [issueRows]);

  const columns = useMemo(() => {
    if (!fileData?.template_headers) return [];
    return generateHeaders(fileData.template_headers);
  }, [fileData?.template_headers, cellErrorMap]);

  const validateFile = async (fileid: string) => {
    try {
      const res = await bulkImportService.validateFile(fileid);
      setNeedFixes(res.data.data.status === "NEED_FIXES");
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to validate file"
      );
    }
  };

  const getMappedRows = async (fileid: string) => {
    try {
      // CHECK WITH BACKEND
      const fileData = await bulkImportService.getFileDetailsById(fileid);
      setFileData(fileData.data.data[0]);
      const res = await bulkImportService.getMappedData(fileid);
      setMappedRows(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getMappedRowIssues = async (fileid: string) => {
    try {
      const res = await bulkImportService.getMappedRowIssues(fileid);
      setIssueRows(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const processRowUpdate = async (newRow: any, oldRow: any) => {
    const editedField = Object.keys(newRow).find(
      (key) => newRow[key] !== oldRow[key]
    );

    if (!editedField || !fileid) return oldRow;

    const rowId = newRow.id;

    try {
      await bulkImportService.updateMappedRow({
        fileid,
        rowId,
        data: {
          [editedField]: newRow[editedField],
        },
      });

      // 🔥 REMOVE issues for this row locally
      setIssueRows((prev: any[]) =>
        prev.filter((issue) => issue.bulk_import_row_id !== rowId)
      );

      return newRow;
    } catch (err) {
      toast.error("Failed to update row");
      return oldRow;
    }
  };

  useEffect(() => {
    const rowsWithIssues = mappedRows.filter((row: any) => {
      const hasIssue = issueRows.find(
        (issueRow: any) => issueRow.bulk_import_row_id === row.id
      );
      if (hasIssue) {
        return row;
      }
    });
    const tableRows = rowsWithIssues.map((row: any) => {
      return { ...row.data, id: row.id };
    });
    setRows(tableRows);
  }, [issueRows, mappedRows]);

  useEffect(() => {
    if (fileid) {
      validateFile(fileid);
      getMappedRows(fileid);
      getMappedRowIssues(fileid);
    }
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold capitalize">Validate File</h1>
      </div>
      <DataGrid
        columns={columns}
        rows={rows || []}
        isCellEditable={(params: GridCellParams) => {
          return issueRows.some(
            (issue: any) =>
              issue.bulk_import_row_id === params.id &&
              issue.field_key === params.field
          );
        }}
        disableRowSelectionOnClick
        processRowUpdate={processRowUpdate}
      />
      <FormFooter>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button onClick={() => validateFile(fileid || "")}>Revalidate</Button>
      </FormFooter>
    </div>
  );
}

export default ValidateFile;
