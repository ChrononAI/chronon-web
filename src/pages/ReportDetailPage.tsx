import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Calendar,
  Building,
  CheckCircle,
  AlertCircle,
  XCircle,
  IndianRupee,
  Receipt,
  Activity,
  Target,
  Undo,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { approvalService } from "@/services/approvalService";
import { reportService } from "@/services/reportService";
import { ReportWithExpenses, ApprovalWorkflow, Expense } from "@/types/expense";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import { ViewExpenseWindow } from "@/components/expenses/ViewExpenseWindow";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getExpenseType } from "./MyExpensesPage";

const columns: GridColDef[] = [
  {
    field: "sequence_number",
    headerName: "EXPENSE ID",
    width: 150,
    renderCell: (params) => {
      const expense = params.row;
      return (
        <div className="flex items-center gap-2">
          {expense.original_expense_id && (
            <TooltipProvider>
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <div className="relative cursor-pointer">
                    <AlertTriangle
                      className="h-4 w-4 text-yellow-400"
                      fill="currentColor"
                      stroke="none"
                    />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-800 text-[8px] font-bold">
                      !
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="center"
                  className="bg-yellow-100 border-yellow-300 text-yellow-800"
                >
                  <p>Duplicate expense</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <span>{expense.sequence_number}</span>
        </div>
      );
    },
  },
  {
    field: "expense_type",
    headerName: "TYPE",
    width: 120,
    renderCell: (params) => getExpenseType(params.row.expense_type),
  },
  {
    field: "policy",
    headerName: "POLICY",
    width: 140,
    valueGetter: (params: any) => params?.name || "No Policy",
  },
  {
    field: "category",
    headerName: "CATEGORY",
    width: 140,
  },
  {
    field: "vendor",
    headerName: "VENDOR",
    width: 200,
    renderCell: (params) => {
      const { vendor, expense_type } = params.row;
      if (vendor) return vendor;
      if (expense_type === "RECEIPT_BASED") {
        return <span className="text-gray-600 italic">Unknown Vendor</span>;
      }
      return "NA";
    },
  },
  {
    field: "expense_date",
    headerName: "DATE",
    width: 120,
    valueFormatter: (params: any) => formatDate(params),
  },
  {
    field: "amount",
    headerName: "AMOUNT",
    width: 120,
    type: "number",
    align: "right",
    headerAlign: "right",
    valueFormatter: (params: any) => formatCurrency(params, "INR"),
  },
  {
    field: "currency",
    headerName: "CURRENCY",
    width: 80,
    renderCell: () => "INR",
  },
  {
    field: "status",
    headerName: "STATUS",
    flex: 1,
    minWidth: 180,
    renderCell: (params) => (
      <Badge className={getStatusColor(params.value)}>
        {params.value.replace("_", " ")}
      </Badge>
    ),
  },
];

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isFromApprovals = searchParams.get("from") === "approvals";
  const { user } = useAuthStore();

  const [report, setReport] = useState<ReportWithExpenses | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] =
    useState<ApprovalWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "send_back" | null
  >(null);
  const [comments, setComments] = useState("");
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showViewExpense, setShowViewExpense] = useState(false);
  const [expenseToView, setExpenseToView] = useState<Expense | null>(null);

  const fetchReport = async () => {
    if (!id) {
      console.error("Report ID is missing");
      setLoading(false);
      return;
    }

    try {
      const [reportResponse, workflowResponse] = await Promise.all([
        reportService.getReportWithExpenses(id),
        reportService.getReportApprovalWorkflow(id),
      ]);

      if (reportResponse.success && reportResponse.data) {
        setReport(reportResponse.data);
      } else {
        console.error(
          "Failed to fetch report details:",
          reportResponse.message
        );
        toast.error(reportResponse.message || "Failed to fetch report details");
      }

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
          report_id: reportResponse.data.id,
          approval_steps: newSteps,
          total_steps: newSteps.length,
          current_step: currentStepIdx !== -1 ? currentStepIdx + 1 : 0,
        });
      } else {
        console.warn(
          "Failed to fetch approval workflow:",
          workflowResponse.message
        );
      }
    } catch (error) {
      console.error("Failed to fetch report details", error);
      toast.error("Failed to fetch report details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  // Redirect to edit mode if report is DRAFT
  useEffect(() => {
    if (report && report.status === "DRAFT" && !isFromApprovals) {
      navigate("/reports/create", {
        state: {
          editMode: true,
          reportData: {
            id: report.id,
            title: report.title,
            description: report.description,
            custom_attributes: report.custom_attributes,
            expenses: report.expenses,
          },
        },
        replace: true,
      });
    }
  }, [report, isFromApprovals, navigate]);

  const handleAction = (type: "approve" | "reject" | "send_back") => {
    setActionType(type);
    setComments("");
    setShowActionDialog(true);
  };

  const executeAction = async () => {
    if (!report || !actionType) return;

    if (!comments.trim()) {
      toast.error("Comments are required");
      return;
    }

    setActionLoading(true);
    try {
      let result;
      if (actionType === "approve") {
        result = await approvalService.approveReport(report.id, comments);
      } else if (actionType === "reject") {
        result = await approvalService.rejectReport(report.id, comments);
      } else {
        result = await approvalService.sendBackReport(report.id, comments);
      }
      toast.success(result.message);
      setShowActionDialog(false);
      // Refresh data
      await fetchReport();
    } catch (error) {
      console.error(`Failed to ${actionType} report`, error);
      toast.error(`Failed to ${actionType} report`);
    } finally {
      setActionLoading(false);
    }
  };
  // Check if user can approve any expense in the report
  const canApproveReport = () => {
    if (!report || !user) return false;

    // Check if report is in a state that allows approval
    if (report.status === "DRAFT" || report.status === "SUBMITTED") {
      return false; // Can't approve draft or already submitted reports
    }

    // Check if there are pending expenses
    const pendingExpenses = report.expenses.filter(
      (exp) => exp.status === "PENDING" || exp.status === "PENDING_APPROVAL"
    ).length;

    const isUserInCurrentStep = approvalWorkflow?.approval_steps
      .find((step) => step.status === "IN_PROGRESS")
      ?.approvers.some((approver) => approver.user_id === user.id.toString());

    return pendingExpenses > 0 && (isUserInCurrentStep || !approvalWorkflow);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Report Not Found</h3>
            <p className="text-muted-foreground">
              The report you're looking for doesn't exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    {
      label: isFromApprovals ? "Reports for Approval" : "Expense Reports",
      href: isFromApprovals ? "/approvals/reports" : "/reports",
    },
    { label: "View Report" },
  ];

  const totalAmount = report.expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount.toString()),
    0
  );
  const pendingExpenses = report.expenses.filter(
    (exp) => exp.status === "PENDING" || exp.status === "PENDING_APPROVAL"
  ).length;

  const handleViewExpense = async (expense: Expense) => {
    setShowViewExpense(true);
    console.log(expense);
    setExpenseToView(expense);
  };

  return (
    <>
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />

        {/* Action Buttons Header */}
        {isFromApprovals && canApproveReport() && (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-700">
                  {report?.title}
                </h1>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction("approve")}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleAction("reject")}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleAction("send_back")}
                  disabled={actionLoading}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Undo className="h-4 w-4 mr-2" />
                  Send Back
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Report Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Submitted By
                    </div>
                    <p className="text-lg font-semibold">
                      {report.created_by.email}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <IndianRupee className="h-4 w-4" />
                      Total Amount
                    </div>
                    <p className="text-lg font-semibold">
                      {formatCurrency(totalAmount)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Created Date
                    </div>
                    <p className="text-lg font-semibold">
                      {formatDate(report.created_at)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Submitted Date
                    </div>
                    <p className="text-lg font-semibold">
                      {report.submitted_at
                        ? formatDate(report.submitted_at)
                        : "Not submitted"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Description
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-sm leading-relaxed">
                      {report.description}
                    </p>
                  </div>
                </div>

                {/* Custom Attributes */}
                {report.custom_attributes &&
                  Object.keys(report.custom_attributes).length > 0 && (
                    <>
                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Custom Attributes
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(report.custom_attributes).map(
                            ([key, value]) => (
                              <div key={key} className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground capitalize">
                                  {key.replace(/_/g, " ")}
                                </label>
                                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                                  <Target className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{value}</span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </>
                  )}
              </CardContent>
            </Card>

            {/* Expenses Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Expenses in this Report ({report.expenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <DataGrid
                    className="rounded border-[0.2px] border-[#f3f4f6] h-full"
                    rows={report.expenses}
                    columns={columns}
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
                    getRowClassName={(params) =>
                      params.row.original_expense_id ? "bg-yellow-50" : ""
                    }
                    hideFooter
                    disableRowSelectionOnClick
                    showCellVerticalBorder
                    onRowClick={(params) => handleViewExpense(params.row)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Workflow Timeline */}
          {approvalWorkflow && approvalWorkflow.approval_steps && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Approval Workflow Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WorkflowTimeline approvalWorkflow={approvalWorkflow} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : actionType === "reject" ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <Undo className="h-5 w-5 text-orange-600" />
              )}
              {actionType === "approve"
                ? "Approve"
                : actionType === "reject"
                ? "Reject"
                : "Send Back"}{" "}
              Report
            </DialogTitle>
          </DialogHeader>

          {report && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Report:
                    </span>
                    <span className="text-sm font-medium">{report.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Value:
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Pending Expenses:
                    </span>
                    <span className="text-sm font-medium">
                      {pendingExpenses}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="comments">
                      Comments <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {comments.length}/500 characters
                    </span>
                  </div>
                  <Textarea
                    id="comments"
                    placeholder={
                      actionType === "approve"
                        ? "Please provide comments for approval..."
                        : actionType === "reject"
                        ? "Please provide reason for rejection..."
                        : "Please provide reason for sending back to draft..."
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="resize-none"
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 w-full text-center">
                <div className="flex flex-row gap-3 justify-center w-full">
                  <Button
                    variant="outline"
                    onClick={() => setShowActionDialog(false)}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-6 py-2.5 border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={executeAction}
                    disabled={actionLoading || !comments.trim()}
                    className={`w-full sm:w-auto px-6 py-2.5 font-medium transition-all duration-200 ${
                      actionType === "approve"
                        ? "bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md"
                        : actionType === "reject"
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md"
                        : "bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        {actionType === "approve"
                          ? "Approving..."
                          : actionType === "reject"
                          ? "Rejecting..."
                          : "Sending Back..."}
                      </>
                    ) : (
                      <>
                        {actionType === "approve" ? (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        ) : actionType === "reject" ? (
                          <XCircle className="h-4 w-4 mr-2" />
                        ) : (
                          <Undo className="h-4 w-4 mr-2" />
                        )}
                        {actionType === "approve"
                          ? "Approve Report"
                          : actionType === "reject"
                          ? "Reject Report"
                          : "Send Back"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ViewExpenseWindow
        open={showViewExpense}
        onOpenChange={setShowViewExpense}
        data={expenseToView}
      />
    </>
  );
}
