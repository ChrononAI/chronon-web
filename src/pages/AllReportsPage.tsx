import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Loader2,
  CalendarIcon,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { cn, formatDate, formatFileSize } from "@/lib/utils";
import { toast } from "sonner";
import {
  reportService,
  ReportTemplate,
  GeneratedReport,
} from "@/services/reportService";
import { trackEvent } from "@/mixpanel";
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { Badge } from "@/components/ui/badge";
import CustomNoRows from "@/components/shared/CustomNoRows";
import SkeletonLoaderOverlay from "@/components/shared/SkeletonLoaderOverlay";

const parseCriteria = (criteria: string) => {
  try {
    const parsed = JSON.parse(criteria);
    return {
      start_date: parsed.start_date || "N/A",
      end_date: parsed.end_date || "N/A",
    };
  } catch {
    return {
      start_date: "N/A",
      end_date: "N/A",
    };
  }
};

const columns = (
  handleDownloadGeneratedReport: (id: string | number) => void
): GridColDef[] => [
    {
      field: "report_name",
      headerName: "TITLE",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "criteria",
      headerName: "DATE RANGE",
      flex: 1,
      minWidth: 180,
      renderCell: ({ value }) => {
        const criteria = parseCriteria(value);
        return (
          <span>
            {criteria.start_date} to {criteria.end_date}{" "}
          </span>
        );
      },
    },
    {
      field: "number_of_records",
      headerName: "RECORDS",
      flex: 1,
      minWidth: 80,
    },
    {
      field: "report_size",
      headerName: "SIZE",
      flex: 1,
      minWidth: 120,
      renderCell: ({ value }) => formatFileSize(value),
    },
    {
      field: "status",
      headerName: "STATUS",
      flex: 1,
      minWidth: 130,
      renderCell: ({ value }) => {
        return (
          <Badge
            className={
              value === "GENERATED"
                ? "bg-green-100 text-green-800 hover:bg-green-100"
                : "bg-gray-100 text-gray-800 hover:bg-gray-100"
            }
          >
            {value}
          </Badge>
        );
      },
    },
    {
      field: "created_at",
      headerName: "CREATED ON",
      flex: 1,
      minWidth: 150,
      renderCell: ({ value }) => {
        return <span>{value ? formatDate(value) : "N/A"}</span>;
      },
    },
    {
      field: "action",
      headerName: "ACTION",
      flex: 1,
      minWidth: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const id = params.row.id;
        return (
          <Button
            variant="ghost"
            size="sm"
            title="Download report"
            onClick={() => handleDownloadGeneratedReport(id)}
          >
            <Download className="h-4 w-4" />
          </Button>
        );
      },
    },
  ];

export function AllReportsPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>(
    []
  );
  const [generatedReportsLoading, setGeneratedReportsLoading] = useState(true);
  const [rowSelection, setRowSelection] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  const GRID_OFFSET = 300;
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

  const fetchTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const response = await reportService.getReportTemplates();

      if (response.success && response.data) {
        setTemplates(response.data);
      } else {
        toast.error(response.message || "Failed to fetch templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const fetchGeneratedReports = useCallback(async () => {
    try {
      setGeneratedReportsLoading(true);
      const response = await reportService.getGeneratedReports();

      if (response.success && response.data) {
        setGeneratedReports(response.data);
      } else {
        toast.error(response.message || "Failed to fetch generated reports");
      }
    } catch (error) {
      console.error("Error fetching generated reports:", error);
      toast.error("Failed to fetch generated reports");
    } finally {
      setGeneratedReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchGeneratedReports();
  }, [fetchTemplates, fetchGeneratedReports]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    if (!fromDate) setFromDate(lastMonth);
    if (!toDate) setToDate(today);
  }, [templates, selectedTemplateId, fromDate, toDate]);

  const handleDownloadGeneratedReport = async (id: string | number) => {
    try {
      await reportService.downloadGeneratedReport(id);
      toast.success("Download started successfully");
    } catch (error) {
      console.error("Error downloading generated report:", error);
      toast.error("Failed to download report");
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a report template");
      return;
    }

    if (!fromDate || !toDate) {
      toast.error("Please select both from and to dates");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromDateOnly = new Date(fromDate);
    fromDateOnly.setHours(0, 0, 0, 0);
    const toDateOnly = new Date(toDate);
    toDateOnly.setHours(0, 0, 0, 0);

    if (fromDateOnly > today) {
      toast.error("From date cannot be in the future");
      return;
    }

    if (toDateOnly > today) {
      toast.error("To date cannot be in the future");
      return;
    }

    if (fromDateOnly > toDateOnly) {
      toast.error("From date cannot be after to date");
      return;
    }

    try {
      setIsGenerating(true);
      trackEvent("Generate Report Button Clicked", {
        button_name: "Generate Report",
      });
      const selectedTemplate = templates.find(
        (t) => t.id === selectedTemplateId
      );
      const reportName = selectedTemplate
        ? `${selectedTemplate.name} - ${format(fromDate, "MMM dd")} to ${format(
          toDate,
          "MMM dd"
        )}`
        : "Report";

      const formattedFromDate = format(fromDate, "yyyy-MM-dd");
      const formattedToDate = format(toDate, "yyyy-MM-dd");

      const response = await reportService.generateReportWithTemplate({
        report_template_id: selectedTemplateId,
        start_date: formattedFromDate,
        end_date: formattedToDate,
        report_name: reportName,
      });

      if (response.success && response.data) {
        toast.success(response.message || "Report generated successfully!");

        try {
          toast.info("Downloading report...");
          await reportService.downloadGeneratedReport(response.data.report_id);
          toast.success(
            `Report "${response.data.filename}" downloaded successfully!`
          );
        } catch (downloadError) {
          console.error("Auto-download failed:", downloadError);
          toast.error(
            "Report generated but download failed. You can download it from the reports list below."
          );
        }

        setTimeout(() => {
          fetchGeneratedReports();
        }, 300);
      } else {
        toast.error(response.message || "Failed to generate report");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFromDateSelect = (date: Date | undefined) => {
    setFromDate(date);
    setFromDateOpen(false);
  };

  const handleToDateSelect = (date: Date | undefined) => {
    setToDate(date);
    setToDateOpen(false);
  };

  useEffect(() => {
    setRowSelection({ type: "include", ids: new Set() });
  }, [paginationModel?.page, paginationModel?.pageSize])

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Report</h1>
      </div>

      <div className="space-y-6">
        <Card className="shadow-none">
          <CardContent className="p-6">
            {templatesLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-muted rounded"></div>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No templates available</h3>
                <p className="text-muted-foreground">
                  Contact your administrator to add report templates.
                </p>
              </div>
            ) : (
              <div
                className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 items-end"
              >
                <div className="lg:col-span-4">
                  <Label className="mb-2 block">Select Report</Label>
                  <Select
                    value={selectedTemplateId?.toString() || ""}
                    onValueChange={(value) => setSelectedTemplateId(Number(value))}
                    disabled={isGenerating}
                  >
                    <SelectTrigger className="bg-white w-full h-11">
                      <SelectValue placeholder="Select report" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem
                          key={template.id}
                          value={template.id.toString()}
                        >
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="lg:col-span-3">
                  <Label className="mb-2 block">From</Label>
                  <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-11 justify-start text-left font-normal bg-white",
                          !fromDate && "text-muted-foreground"
                        )}
                        disabled={isGenerating}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fromDate ? format(fromDate, "MMM dd, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={handleFromDateSelect}
                        initialFocus
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(23, 59, 59, 999);
                          return date > today || (toDate ? date > toDate : false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="lg:col-span-3">
                  <Label className="mb-2 block">To</Label>
                  <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-11 justify-start text-left font-normal bg-white",
                          !toDate && "text-muted-foreground"
                        )}
                        disabled={isGenerating}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {toDate ? format(toDate, "MMM dd, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={handleToDateSelect}
                        initialFocus
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(23, 59, 59, 999);
                          return date > today || (fromDate ? date < fromDate : false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="lg:col-span-2">
                  <div className="mb-2 h-[20px]" />
                  <Button
                    onClick={handleGenerateReport}
                    disabled={
                      isGenerating ||
                      !selectedTemplateId ||
                      !fromDate ||
                      !toDate
                    }
                    className="w-full h-11 bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </div>
              </div>

            )}
          </CardContent>
        </Card>

        {templates.length > 0 && (
          <Box
            sx={{
              height: "calc(100vh - 272px)",
              width: "100%",
              marginTop: "-30px",
            }}
          >
            <DataGrid
              className="rounded border-[0.2px] border-[#f3f4f6] h-full"
              rows={generatedReportsLoading ? [] : generatedReports}
              columns={columns(handleDownloadGeneratedReport)}
              loading={generatedReportsLoading}
              slots={{
                noRowsOverlay: () => <CustomNoRows title="No reports found" description="There are currently no reports" />,
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
                "& .MuiDataGrid-main": {
                  border: "0.2px solid #f3f4f6",
                },
                "& .MuiDataGrid-virtualScroller": {
                  overflow: generatedReportsLoading ? "hidden" : "auto",
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
              density="compact"
              rowSelectionModel={rowSelection}
              onRowSelectionModelChange={setRowSelection}
              checkboxSelection
              disableRowSelectionOnClick
              showCellVerticalBorder
              pagination
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
            />
          </Box>
        )}
      </div>
    </>
  );
}
