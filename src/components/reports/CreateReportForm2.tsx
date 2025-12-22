import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, Loader2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

import { reportService } from "@/services/reportService";
import { Expense, ApprovalWorkflow } from "@/types/expense";
import { AdditionalFieldMeta, CustomAttribute } from "@/types/report";
import { useAuthStore } from "@/store/authStore";
import { formatDate, formatCurrency, getStatusColor, cn } from "@/lib/utils";
import { DynamicCustomField } from "./DynamicCustomField";
import { ReportTabs } from "./ReportTabs";
import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import {
  DataGrid,
  ExportCsv,
  FilterPanelTrigger,
  GridColDef,
  GridExpandMoreIcon,
  GridFilterListIcon,
  GridRowId,
} from "@mui/x-data-grid";
import { Badge } from "../ui/badge";
import { GridPaginationModel } from "@mui/x-data-grid";
import { Box, Toolbar } from "@mui/material";
import { categoryService } from "@/services/admin/categoryService";
import { SearchableSelect } from "./SearchableSelect";
import { trackEvent } from "@/mixpanel";
import { FormFooter } from "../layout/FormFooter";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";

// Dynamic form schema creation function
const createReportSchema = (customAttributes: CustomAttribute[]) => {
  const baseSchema = {
    reportName: z.string().min(1, "Report name is required"),
    description: z.string().min(1, "Description is required"),
  };

  // Add dynamic fields based on custom attributes
  const dynamicFields: Record<string, z.ZodTypeAny> = {};
  customAttributes.forEach((attr) => {
    const fieldName = attr.name;
    dynamicFields[fieldName] = z
      .string()
      .min(1, `${attr.display_name} is required`);
  });
  return z.object({ ...baseSchema, ...dynamicFields });
};

type ReportFormValues = {
  reportName: string;
  description: string;
  [key: string]: string | undefined;
};

interface CreateReportFormProps {
  editMode?: boolean;
  reportData?: {
    id: string;
    title: string;
    description: string;
    custom_attributes?: Record<string, string>;
    expenses?: Expense[];
  };
}

const columns: GridColDef[] = [
  {
    field: "vendor",
    headerName: "VENDOR",
    minWidth: 200,
    flex: 1,
    renderCell: (params) => {
      const expense = params.row;
      const displayVendor =
        expense.expense_type === "MILEAGE_BASED"
          ? "Mileage Reimbursement"
          : expense.expense_type === "PER_DIEM"
          ? "Per Diem"
          : expense.vendor || "—";
      return <span>{displayVendor}</span>;
    },
  },
  {
    field: "category",
    headerName: "CATEGORY",
    minWidth: 140,
    flex: 1,
  },
  {
    field: "description",
    headerName: "DESCRIPTION",
    minWidth: 140,
    flex: 1,
  },
  {
    field: "amount",
    headerName: "AMOUNT",
    minWidth: 120,
    flex: 1,
    align: "right",
    headerAlign: "right",
    valueFormatter: (val) => formatCurrency(val),
  },
  {
    field: "expense_date",
    headerName: "DATE",
    minWidth: 120,
    flex: 1,
    valueFormatter: (val) => formatDate(val),
  },
  {
    field: "status",
    headerName: "STATUS",
    minWidth: 180,
    flex: 1,
    renderCell: (params) => (
      <Badge className={`${getStatusColor(params.value)} whitespace-nowrap`}>
        {params.value.replace("_", " ")}
      </Badge>
    ),
  },
];

function CustomToolbar({
  categories,
  selectedCategory,
  setSelectedCategory,
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
}: any) {
  return (
    <Toolbar
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: 1,
        gap: 2,
        backgroundColor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SearchableSelect
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-11 w-full justify-between gap-3 pl-3 text-left font-normal",
                !dateFrom && "text-muted-foreground"
              )}
            >
              {dateFrom ? format(new Date(dateFrom), "PPP") : <span>From</span>}
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 opacity-50" />
                <X
                  className="h-4 w-4 opacity-50"
                  onClick={() => setDateFrom("")}
                />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={new Date(dateFrom)}
              onSelect={(date: any) => setDateFrom(date)}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-11 w-full justify-between gap-3 pl-3 text-left font-normal",
                !dateTo && "text-muted-foreground"
              )}
            >
              {dateTo ? format(new Date(dateTo), "PPP") : <span>To</span>}
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 opacity-50" />
                <X
                  className="h-4 w-4 opacity-50"
                  onClick={() => setDateTo("")}
                />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={new Date(dateTo)}
              onSelect={(date: any) => setDateTo(date)}
            />
          </PopoverContent>
        </Popover>
      </Box>

      <Box className="flex items-center gap-2">
        <FilterPanelTrigger
          size="small"
          startIcon={<GridFilterListIcon className="text-gray-500" />}
        >
          <span className="text-gray-500">Filter</span>
        </FilterPanelTrigger>

        <ExportCsv
          size="small"
          startIcon={<GridExpandMoreIcon className="text-gray-500" />}
        >
          <span className="text-gray-500">Export CSV</span>
        </ExportCsv>
      </Box>
    </Toolbar>
  );
}

export function CreateReportForm2({
  editMode = false,
  reportData,
}: CreateReportFormProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const additionalFields: AdditionalFieldMeta[] = [];
  const [customAttributes, setCustomAttributes] = useState<CustomAttribute[]>(
    []
  );
  const [formSchema, setFormSchema] = useState(createReportSchema([]));
  const [markedExpenses, setMarkedExpenses] = useState<Expense[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [selectedIds, setSelectedIds] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>();
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] =
    useState<ApprovalWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState<"expenses" | "history">(
    "expenses"
  );
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const filteredExpenses = allExpenses
    .filter((exp) =>
      selectedCategory ? exp.category_id === selectedCategory.id : true
    )
    .filter((exp) => {
      if (!dateFrom && !dateTo) return true;
      const expDate = exp.expense_date ? new Date(exp.expense_date) : null;
      if (!expDate || isNaN(expDate.getTime())) return false;
      const fromOk = dateFrom ? expDate >= new Date(dateFrom) : true;
      const toOk = dateTo ? expDate <= new Date(dateTo) : true;
      return fromOk && toOk;
    });

  const [categories, setCategories] = useState([]);

  const showTabs =
    editMode &&
    reportData &&
    ["SENT_BACK", "APPROVED", "REJECTED"].includes(
      (reportStatus || "").toUpperCase()
    );

  const getAllCategories = async () => {
    try {
      const res = await categoryService.getAllCategories();
      setCategories(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getAllCategories();
  }, []);

  const [rowSelection, setRowSelection] = useState<any>({
    type: "include",
    ids: new Set<GridRowId>(),
  });

  useEffect(() => {
    setRowSelection({
      type: "include",
      ids: new Set(markedExpenses.map((exp) => exp.id)),
    });
  }, [markedExpenses]);

  useEffect(() => {
    if (rowSelection.type === "include") {
      const ids = Array.from(rowSelection.ids);
      setSelectedIds(ids);
    } else {
      const ids = Array.from(rowSelection.ids);
      const filteredExpenses = allExpenses.filter(
        (expense) => !ids.includes(expense.id)
      );
      const idArr = filteredExpenses.map((exp) => exp.id);
      setSelectedIds(idArr);
    }
  }, [rowSelection]);

  useEffect(() => {
    if (selectedCategory) {
      setSelectedIds([]);
      setRowSelection({ type: "include", ids: new Set([]) });
    }
  }, [selectedCategory]);

  // Determine if Hospital Name and Campaign Code should be shown
  const userDept = user?.department?.toLowerCase() || "";
  const showHospitalAndCampaign =
    userDept === "operations" || userDept === "sales";

  // Create default values for dynamic form
  const createDefaultValues = (attributes: CustomAttribute[]) => {
    const defaults: ReportFormValues = {
      reportName: editMode && reportData ? reportData.title : "",
      description: editMode && reportData ? reportData.description : "",
    };

    // Set custom attribute values if in edit mode
    if (editMode && reportData?.custom_attributes) {
      Object.entries(reportData.custom_attributes).forEach(([key, value]) => {
        defaults[key] = value;
      });
    }

    // Set default empty values for other attributes
    attributes.forEach((attr) => {
      if (defaults[attr.name] === undefined) {
        defaults[attr.name] = "";
      }
    });

    return defaults;
  };

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues(customAttributes),
  });

  // Re-initialize form when custom attributes change
  useEffect(() => {
    if (customAttributes.length > 0) {
      const newSchema = createReportSchema(customAttributes);
      setFormSchema(newSchema);

      // Reset form with new default values
      const newDefaultValues = createDefaultValues(customAttributes);
      form.reset(newDefaultValues);
    }
  }, [customAttributes, form]);

  useEffect(() => {
    const amt = allExpenses
      .filter((exp) => selectedIds.includes(exp.id))
      .reduce((sum, exp) => +sum + +exp.amount, 0);
    setTotalAmount(amt);
  }, [selectedIds, allExpenses]);

  const fetchData = async () => {
    try {
      setLoadingExpenses(true);
      setLoadingMeta(true);

      if (editMode && reportData) {
        // In edit mode, fetch the full report with expenses
        const fullReportResponse = await reportService.getReportWithExpenses(
          reportData.id
        );
        const reportExpenses = fullReportResponse.success
          ? fullReportResponse.data?.expenses || []
          : reportData.expenses || [];
        setMarkedExpenses([...reportExpenses]);
        setSelectedIds(reportExpenses.map((exp: any) => exp.id));

        if (fullReportResponse.success && fullReportResponse.data) {
          const currentStatus = (
            fullReportResponse.data.status || ""
          ).toUpperCase();
          setReportStatus(currentStatus);

          if (["SENT_BACK", "APPROVED", "REJECTED"].includes(currentStatus)) {
            try {
              const workflowResponse =
                await reportService.getReportApprovalWorkflow(reportData.id);
              if (workflowResponse.success && workflowResponse.data) {
                const getAllApprovalSteps = (data: any) => {
                  return data
                    .reverse()
                    .flatMap((item: any) =>
                      item.approval_steps.filter(
                        (step: any) => step.status !== "ABORTED"
                      )
                    );
                };
                const newSteps = getAllApprovalSteps(workflowResponse.data);
                const currentStepIdx = newSteps.findIndex(
                  (step: any) => step.status === "IN_PROGRESS"
                );
                setApprovalWorkflow({
                  report_id: reportData.id,
                  approval_steps: newSteps,
                  total_steps: newSteps.length,
                  current_step: currentStepIdx !== -1 ? currentStepIdx + 1 : 0,
                });
              }
            } catch (error) {
              console.error("Error fetching approval workflow:", error);
            }
          }
        }

        // Fetch all available expenses (unassigned)
        const unassignedExpenses = await reportService.getUnassignedExpenses();
        setAllExpenses([...reportExpenses, ...unassignedExpenses]);
      } else {
        // In create mode, fetch unassigned expenses
        const unassignedExpenses = await reportService.getUnassignedExpenses();
        setAllExpenses(unassignedExpenses);
        setMarkedExpenses([]);
        setSelectedIds([]);
      }

      const customAttrs = await reportService.getCustomAttributes(
        user?.organization?.id?.toString() || "5"
      );
      setCustomAttributes(customAttrs);

      // Update form schema with custom attributes
      const newSchema = createReportSchema(customAttrs);
      setFormSchema(newSchema);

      // Reset form with new default values if in edit mode
      if (editMode && reportData) {
        const newDefaultValues = createDefaultValues(customAttrs);
        form.reset(newDefaultValues);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoadingExpenses(false);
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getFieldMeta = (fieldName: string) => {
    return additionalFields.find((field) => field.name === fieldName);
  };

  const onSave = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please add at least one expense to the report");
      return;
    }

    setSaving(true);
    try {
      const formData = form.getValues();

      // Check if required fields are selected
      const costCenterField = getFieldMeta("Cost Center");
      const expenseHeadField = getFieldMeta("Expense Head");

      if (costCenterField && !formData.costCenter) {
        toast.error("Please select a Cost Center");
        return;
      }

      if (expenseHeadField && !formData.expenseHead) {
        toast.error("Please select an Expense Head");
        return;
      }

      // Always send all additional fields, with empty string if not shown/selected
      const allFieldNames = [
        "Cost Center",
        "Expense Head",
        "Hospital Name",
        "Campaign Code",
      ];
      const additionalFieldsData: Record<string, string> = {};

      for (const name of allFieldNames) {
        const meta = getFieldMeta(name);
        if (meta) {
          // Only show value if field is visible, else empty string
          if (name === "Hospital Name" || name === "Campaign Code") {
            additionalFieldsData[meta.id] = showHospitalAndCampaign
              ? formData.hospitalName || formData.campaignCode || ""
              : "";
          } else if (name === "Cost Center") {
            additionalFieldsData[meta.id] = formData.costCenter || "";
          } else if (name === "Expense Head") {
            additionalFieldsData[meta.id] = formData.expenseHead || "";
          }
        }
      }

      // Add dynamic custom fields
      customAttributes.forEach((attr) => {
        additionalFieldsData[attr.name] = formData[attr.name] || "";
      });

      // Create custom_attributes object for the API
      const customAttributesData: Record<string, string> = {};
      customAttributes.forEach((attr) => {
        const value = formData[attr.name];
        if (value) {
          customAttributesData[attr.name] = value;
        }
      });

      if (editMode && reportData) {
        // Update existing report
        const updateData = {
          title: formData.reportName,
          description: formData.description,
          custom_attributes: customAttributesData,
          expense_ids: selectedIds,
        };
        const updateResponse = await reportService.updateReport(
          reportData.id,
          updateData
        );

        if (updateResponse.success) {
          toast.success("Report updated successfully");
          navigate("/reports");
        } else {
          toast.error(updateResponse.message);
        }
      } else {
        // Create new report
        const newReportData = {
          reportName: formData.reportName,
          description: formData.description,
          expenseIds: selectedIds,
          additionalFields: additionalFieldsData,
          customAttributes: customAttributesData,
        };

        const createResponse = await reportService.createReport(newReportData);

        if (createResponse.success) {
          toast.success("Report saved as draft");
          navigate("/reports");
        } else {
          toast.error(createResponse.message);
        }
      }
    } catch (error) {
      console.error("Failed to save report", error);
      toast.error("Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = async () => {
    if (!reportData?.id) return;

    setIsDeleting(true);
    try {
      const response = await reportService.deleteReport(reportData.id);
      if (response.success) {
        toast.success("Report deleted successfully");
        navigate("/reports");
      } else {
        toast.error(response.message || "Failed to delete report");
        setShowDeleteDialog(false);
      }
    } catch (error) {
      console.error("Failed to delete report:", error);
      toast.error("Failed to delete report");
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (data: ReportFormValues) => {
    if (selectedIds.length === 0) {
      toast.error("Please add at least one expense to the report");
      return;
    }

    setLoading(true);
    try {
      // Always send all additional fields, with empty string if not shown/selected
      const allFieldNames = [
        "Cost Center",
        "Expense Head",
        "Hospital Name",
        "Campaign Code",
      ];
      const additionalFieldsData: Record<string, string> = {};

      for (const name of allFieldNames) {
        const meta = getFieldMeta(name);
        if (meta) {
          // Only show value if field is visible, else empty string
          if (name === "Hospital Name" || name === "Campaign Code") {
            additionalFieldsData[meta.id] = showHospitalAndCampaign
              ? data.hospitalName || data.campaignCode || ""
              : "";
          } else if (name === "Cost Center") {
            additionalFieldsData[meta.id] = data.costCenter || "";
          } else if (name === "Expense Head") {
            additionalFieldsData[meta.id] = data.expenseHead || "";
          }
        }
      }

      // Add dynamic custom fields
      customAttributes.forEach((attr) => {
        additionalFieldsData[attr.name] = data[attr.name] || "";
      });

      // Create custom_attributes object for the API
      const customAttributesData: Record<string, string> = {};
      customAttributes.forEach((attr) => {
        const value = data[attr.name];
        if (value) {
          customAttributesData[attr.name] = value;
        }
      });

      const reportData2 = {
        reportName: data.reportName,
        description: data.description,
        expenseIds: selectedIds,
        additionalFields: additionalFieldsData,
        customAttributes: customAttributesData,
      };

      // 1. Create report
      if (editMode && reportData) {
        trackEvent("Update Report Button Clicked", {
          button_name: "Update Report",
        });
        await reportService.updateReport(reportData.id, {
          title: data.reportName,
          description: data.description,
          custom_attributes: customAttributesData,
          expense_ids: selectedIds,
        });
        // await reportService.addExpensesToReport(reportData.id, markedExpenses.map(expense => expense.id))
        const submitReport = await reportService.submitReport(reportData.id);
        if (submitReport.success) {
          toast.success("Report submitted successfully");
          navigate("/reports");
        } else {
          toast.error("Failed to submit report");
        }
      } else {
        trackEvent("Create Report Button Clicked", {
          button_name: "Create Report",
        });
        const createResponse = await reportService.createReport(reportData2);
        if (createResponse.success && createResponse.reportId) {
          // 2. Submit report immediately
          const submitResponse = await reportService.submitReport(
            createResponse.reportId
          );

          if (submitResponse.success) {
            toast.success("Report created and submitted successfully!");
          } else {
            toast.success("Report created successfully!");
          }

          // 3. Navigate to reports page (this will refresh the table)
          navigate("/reports");
        } else {
          toast.error(createResponse.message);
        }
      }
    } catch (error) {
      console.error("Failed to create report", error);
      toast.error("Failed to create report");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {editMode ? "Edit Report" : "Create Report"}
      </h1>

      <div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 lg:grid-cols-2 lg:col-span-2 gap-4"
          >
            <FormField
              control={form.control}
              name="reportName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter report name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter report description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {loadingMeta && (
              <div className="flex items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-muted-foreground">
                  Loading additional fields...
                </span>
              </div>
            )}

            {/* Dynamic Custom Fields */}
            {customAttributes.length > 0 && (
              <div className="space-y-4 lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {customAttributes.map((attribute) => (
                    <DynamicCustomField
                      key={attribute.id}
                      control={form.control}
                      name={attribute.name as any}
                      attribute={attribute}
                    />
                  ))}
                </div>
              </div>
            )}
          </form>
        </Form>
      </div>

      <div>
        {showTabs ? (
          <>
            <ReportTabs
              activeTab={activeTab}
              onTabChange={(tabId) =>
                setActiveTab(tabId as "expenses" | "history")
              }
              tabs={[
                {
                  key: "expenses",
                  label: "Expenses",
                  count: markedExpenses.length,
                },
                { key: "history", label: "Audit History", count: 0 },
              ]}
              className="mb-2"
            />
            {activeTab === "expenses" && (
              <div className="space-y-6">
                <DataGrid
                  className="rounded border-[0.2px] border-[#f3f4f6] h-full"
                  rows={loadingExpenses ? [] : filteredExpenses}
                  columns={columns}
                  loading={loadingExpenses}
                  slots={{
                    toolbar: () => (
                      <CustomToolbar
                        categories={categories}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        setDateFrom={setDateFrom}
                        setDateTo={setDateTo}
                      />
                    ),
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
                    "& .MuiToolbar-root": {
                      paddingX: 0,
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
                  showToolbar
                  density="compact"
                  getRowClassName={(params) =>
                    params.row.original_expense_id ? "bg-yellow-50" : ""
                  }
                  // disableRowSelectionExcludeModel
                  checkboxSelection
                  rowSelectionModel={rowSelection}
                  onRowSelectionModelChange={(newSelection) => {
                    if (
                      newSelection.type !== "exclude" &&
                      newSelection.ids.size === 0 &&
                      rowSelection.ids.size > 0
                    )
                      return;
                    setRowSelection(newSelection);
                  }}
                  disableRowSelectionOnClick
                  showCellVerticalBorder
                  pagination
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  pageSizeOptions={[10, 15, 20]}
                />
                <div className="flex">
                  <div className="bg-gray-50 rounded-lg px-8 py-3 w-full flex items-center justify-end gap-6">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(totalAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "history" && (
              <div className="mt-6">
                {approvalWorkflow && approvalWorkflow.approval_steps ? (
                  <WorkflowTimeline approvalWorkflow={approvalWorkflow} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No audit history available
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <DataGrid
              className="rounded border-[0.2px] border-[#f3f4f6] h-full"
              rows={loadingExpenses ? [] : filteredExpenses}
              columns={columns}
              loading={loadingExpenses}
              slots={{
                toolbar: () => (
                  <CustomToolbar
                    categories={categories}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    setDateFrom={setDateFrom}
                    setDateTo={setDateTo}
                  />
                ),
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
                "& .MuiToolbar-root": {
                  paddingX: 0,
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
              showToolbar
              density="compact"
              getRowClassName={(params) =>
                params.row.original_expense_id ? "bg-yellow-50" : ""
              }
              checkboxSelection
              rowSelectionModel={rowSelection}
              onRowSelectionModelChange={(newSelection) => {
                if (
                  newSelection.type !== "exclude" &&
                  newSelection.ids.size === 0 &&
                  rowSelection.ids.size > 0
                )
                  return;
                setRowSelection(newSelection);
              }}
              disableRowSelectionOnClick
              showCellVerticalBorder
              pagination
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 15, 20]}
            />
            {/* Total Amount Display */}
            <div className="flex mt-6">
              <div className="bg-gray-50 rounded-lg px-8 py-3 w-full flex items-center justify-end gap-6">
                <span className="text-gray-600">Total Amount:</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(totalAmount || 0)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons - At the very bottom of the page */}
      <FormFooter>
        {/* Delete Button - Only show in edit mode for draft reports */}
        {editMode && reportData && (
          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="px-10 py-3 border-red-500 text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Report</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this report? This action
                  cannot be undone.
                  {reportData.title && (
                    <span className="block mt-2 font-medium">
                      Report: {reportData.title}
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteReport}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/reports")}
          className="px-6 py-2"
        >
          Back
        </Button>
        <Button onClick={onSave} disabled={saving} variant="outline">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {editMode ? "Updating..." : "Saving..."}
            </>
          ) : editMode ? (
            "Update Report"
          ) : (
            "Save Draft"
          )}
        </Button>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={loading}
          className="px-10 py-3"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </FormFooter>
    </div>
  );
}
