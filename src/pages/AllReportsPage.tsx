import { useCallback, useEffect, useState, useMemo } from "react";
import { FileText, Loader2, CalendarIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  reportService,
  ReportTemplate,
  GeneratedReport,
} from "@/services/reportService";
import { AllReportsTable } from "@/components/reports/AllReportsTable";
import { FilterControls } from "@/components/reports/FilterControls";
import { trackEvent } from "@/mixpanel";

export function AllReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
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

  const handleDownloadGeneratedReport = async (id: number) => {
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

  const filteredReports = useMemo(() => {
    let filtered = generatedReports;

    if (searchTerm) {
      filtered = filtered.filter((report) =>
        report.report_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((report) => report.status === statusFilter);
    }

    if (selectedDate) {
      const filterDate = selectedDate.toISOString().split("T")[0];
      filtered = filtered.filter((report) => {
        if (!report.created_at) return false;
        const reportDate = new Date(report.created_at)
          .toISOString()
          .split("T")[0];
        return reportDate === filterDate;
      });
    }

    return filtered;
  }, [generatedReports, searchTerm, statusFilter, selectedDate]);

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
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="min-w-[600px] w-full sm:w-auto">
                  <Label className="mb-2 block">Select Report</Label>
                  <Select
                    value={selectedTemplateId?.toString() || ""}
                    onValueChange={(value) =>
                      setSelectedTemplateId(Number(value))
                    }
                    disabled={isGenerating}
                  >
                    <SelectTrigger className="bg-white h-10 w-full">
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

                <div className="flex flex-col sm:flex-row gap-4 items-end sm:ml-auto">
                  <div className="min-w-[160px] w-full sm:w-auto">
                    <Label className="mb-2 block">From</Label>
                    <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white h-10",
                            !fromDate && "text-muted-foreground"
                          )}
                          disabled={isGenerating}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {fromDate ? (
                            format(fromDate, "MMM dd, yyyy")
                          ) : (
                            <span>Pick a date</span>
                          )}
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
                            const isAfterToday = date > today;
                            const isAfterToDate = toDate
                              ? date > toDate
                              : false;
                            return isAfterToday || isAfterToDate;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="min-w-[160px] w-full sm:w-auto">
                    <Label className="mb-2 block">TO</Label>
                    <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-white h-10",
                            !toDate && "text-muted-foreground"
                          )}
                          disabled={isGenerating}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {toDate ? (
                            format(toDate, "MMM dd, yyyy")
                          ) : (
                            <span>Pick a date</span>
                          )}
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
                            const isAfterToday = date > today;
                            const isBeforeFromDate = fromDate
                              ? date < fromDate
                              : false;
                            return isAfterToday || isBeforeFromDate;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="min-w-[100px] w-full sm:w-auto">
                    <div className="mb-2 h-[20px]"></div>
                    <Button
                      onClick={handleGenerateReport}
                      disabled={
                        isGenerating ||
                        !selectedTemplateId ||
                        !fromDate ||
                        !toDate
                      }
                      className="w-full sm:w-auto bg-white h-10 text-gray-900 border border-gray-300 hover:bg-gray-50"
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
              </div>
            )}
          </CardContent>
        </Card>

        {templates.length > 0 && (
          <div className="space-y-4">
            <FilterControls
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search reports..."
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              statusOptions={[
                { value: "all", label: "All" },
                { value: "GENERATED", label: "Generated" },
                { value: "PENDING", label: "Pending" },
              ]}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              className="mt-6 mb-4"
            />

            <Card>
              <CardContent className="p-0 h-[calc(100vh-18rem)] overflow-auto">
                {generatedReportsLoading && generatedReports.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2">Loading generated reports...</span>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">
                      No generated reports found
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm || statusFilter !== "all" || selectedDate
                        ? "Try adjusting your search terms"
                        : "Generate a new report using the templates above to get started."}
                    </p>
                  </div>
                ) : (
                  <AllReportsTable
                    reports={filteredReports}
                    handleDownloadGeneratedReport={
                      handleDownloadGeneratedReport
                    }
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
