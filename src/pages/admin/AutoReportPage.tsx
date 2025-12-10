import { DataGrid, GridColDef, GridOverlay, GridPaginationModel } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import { CheckCircle, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAutoReportSchedule,
  getAutoReportSchedules,
  type AutoReportSubmission,
} from "@/services/admin/autoReportSubmissions";
import { toast } from "sonner";
import { Box } from "@mui/material";

const getOrdinalSuffix = (day: number) => {
  if (day % 100 >= 11 && day % 100 <= 13) {
    return "th";
  }
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

function CustomNoRows() {
  return (
    <GridOverlay>
      <Box className="w-full">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No entries found</h3>
          <p className="text-muted-foreground">
            There are currently no entries.
          </p>
        </div>
      </Box>
    </GridOverlay>
  );
}

const WEEKLY_DAY_OPTIONS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

const WEEKLY_DAY_LABEL_MAP = WEEKLY_DAY_OPTIONS.reduce<Record<string, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {}
);

export const AutoReportPage = () => {
  type SubmissionScheduleRow = {
    id: string;
    submitOn: string;
    createdBy: string;
    description?: string;
    status: string;
  };

  const [scheduleRows, setScheduleRows] = useState<SubmissionScheduleRow[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleType, setScheduleType] = useState<"weekly" | "monthly">(
    "weekly"
  );
  const [selectedDay, setSelectedDay] = useState<string | undefined>();
  const [selectedMonthDate, setSelectedMonthDate] = useState<
    string | undefined
  >();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const columns: GridColDef<SubmissionScheduleRow>[] = [
    {
      field: "submitOn",
      headerName: "Submit expense report date",
      minWidth: 280,
      flex: 1,
    },
    {
      field: "createdBy",
      headerName: "Created by",
      minWidth: 220,
      flex: 1,
    },
    {
      field: "description",
      headerName: "Description",
      minWidth: 260,
      flex: 1,
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 160,
      flex: 1,
    },
  ];

  const monthlyDateOptions = useMemo(
    () =>
      Array.from({ length: 31 }, (_, index) => {
        const day = index + 1;
        return {
          value: day.toString(),
          label: `${day}${getOrdinalSuffix(day)}`,
        };
      }),
    []
  );

  const cadenceCopy =
    scheduleType === "monthly" ? "of every month" : "of every week";

  const canSubmit =
    (scheduleType === "weekly" && !!selectedDay) ||
    (scheduleType === "monthly" && !!selectedMonthDate);

  const selectedDayLabel =
    selectedDay &&
    WEEKLY_DAY_OPTIONS.find((option) => option.value === selectedDay)?.label;

  const selectedMonthLabel =
    selectedMonthDate &&
    monthlyDateOptions.find((option) => option.value === selectedMonthDate)
      ?.label;

  const summaryText =
    scheduleType === "monthly"
      ? selectedMonthLabel
        ? `${selectedMonthLabel} of every month`
        : "Select a Date"
      : selectedDayLabel
      ? `${selectedDayLabel} of every week`
      : "Select a Day";

  const resolveSubmitOn = useCallback((submission: AutoReportSubmission) => {
    const when = submission.schedule?.config?.when;

    if (!when) {
      return "—";
    }

    if (when.day_of_week) {
      const key = when.day_of_week.toLowerCase();
      const label = WEEKLY_DAY_LABEL_MAP[key] || when.day_of_week;
      return `${label} of every week`;
    }

    if (when.day) {
      const parsedDay = parseInt(when.day, 10);
      if (!Number.isNaN(parsedDay)) {
        return `${parsedDay}${getOrdinalSuffix(parsedDay)} of every month`;
      }
      return `${when.day} of every month`;
    }

    return "—";
  }, []);

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getAutoReportSchedules();
      const rows = response.data.map((submission) => ({
        id: submission.id,
        submitOn: resolveSubmitOn(submission),
        createdBy: submission.created_by?.email ?? "—",
        description: submission.description ?? "—",
        status: submission.schedule?.is_enabled ? "Active" : "Paused",
      }));
      setScheduleRows(rows);
    } catch (error) {
      console.error("Failed to load auto report schedules:", error);
      toast.error("Failed to load automated submissions.");
    } finally {
      setIsLoading(false);
    }
  }, [resolveSubmitOn]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreateSchedule = async () => {
    if (!canSubmit) {
      toast.error("Select a date before continuing.");
      return;
    }

    const description =
      scheduleType === "monthly"
        ? `Expense reports will be submitted automatically for approval on ${selectedMonthLabel} of every month.`
        : `Expense reports will be submitted automatically for approval on ${selectedDayLabel} of every week.`;

    const payload =
      scheduleType === "monthly"
        ? {
            description,
            schedule_config: {
              type: "cron" as const,
              when: {
                day: selectedMonthDate!,
              },
            },
          }
        : {
            description,
            schedule_config: {
              type: "cron" as const,
              when: {
                day_of_week: selectedDay!,
              },
            },
          };

    try {
      setIsSubmitting(true);
      await createAutoReportSchedule(payload);
      await fetchSchedules();

      toast.success("Auto submission schedule created.");
      setShowScheduleModal(false);
      setSelectedDay(undefined);
      setSelectedMonthDate(undefined);
      setScheduleType("weekly");
    } catch (error) {
      toast.error("Failed to create schedule. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Automated expense reports submissions
        </h1>
        <Button onClick={() => setShowScheduleModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Submission Schedule
        </Button>
      </div>

      {/* <div className="bg-gray-100 rounded-md p-4 mb-6">
        <p className="text-sm text-gray-600">
          Create submission schedules to automatically submit expense reports at
          specified intervals.
        </p>
      </div> */}
      <Box
        sx={{
          height: "calc(100vh - 160px)",
          width: "100%",
          marginTop: "-20px",
        }}
      >
        <DataGrid
          className="rounded border-[0.2px] border-[#f3f4f6] h-full"
          columns={columns}
          rows={scheduleRows}
          slots={{ noRowsOverlay: CustomNoRows }}
          loading={isLoading}
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
          showToolbar
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          showCellVerticalBorder
          pagination
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
        />
      </Box>
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Create Submission Schedule</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Schedule Type <span className="text-red-500">*</span>
                </label>
              </div>
              <Select
                value={scheduleType}
                onValueChange={(value) => {
                  setScheduleType(value as typeof scheduleType);
                  setSelectedDay(undefined);
                  setSelectedMonthDate(undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Auto-Submit Expense Reports on
              </label>
              <div className="flex items-center gap-2">
                {scheduleType === "monthly" ? (
                  <Select
                    value={selectedMonthDate}
                    onValueChange={setSelectedMonthDate}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a date" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {monthlyDateOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a day" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {WEEKLY_DAY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {cadenceCopy}
                </span>
              </div>
            </div>

            {/* <Button variant="ghost" className="justify-start px-0 text-green-600 hover:text-green-700 hover:bg-transparent">
                + Add Another Date
              </Button> */}

            <div className="rounded-md border bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Expense Reports will be submitted on{" "}
              <span className="font-medium text-gray-900">{summaryText}</span>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setShowScheduleModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSchedule}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Creating…" : "Create schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
