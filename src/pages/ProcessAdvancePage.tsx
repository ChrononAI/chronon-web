import { CreateAdvanceForm } from "@/components/advances/CreateAdvanceForm";
import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCurrency,
  formatDate,
  getOrgCurrency,
  getStatusColor,
} from "@/lib/utils";
import { trackEvent } from "@/mixpanel";
import { AdvanceService } from "@/services/advanceService";
import { useAdvanceStore } from "@/store/advanceStore";
import { useAuthStore } from "@/store/authStore";
import { ApprovalWorkflow } from "@/types/expense";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import * as z from "zod";

const currencyConversionSchema = z.object({
  rate: z.coerce
    .number({ required_error: "Rate is required" })
    .positive("Rate must be greater than 0"),
});
type CurrencyConversionFormValues = z.infer<typeof currencyConversionSchema>;

function ProcessAdvancePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const baseCurrency = getOrgCurrency();
  const { selectedAdvanceToApprove } = useAdvanceStore();
  const [showCurrencyAlert, setShowCurrencyAlert] = useState(false);
  const [comments, setComments] = useState("");
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<CurrencyConversionFormValues>({
    resolver: zodResolver(currencyConversionSchema),
    defaultValues: {
      rate: undefined,
    },
  });

  // const [report, setReport] = useState<PreApprovalType | null>(null);
  const report = selectedAdvanceToApprove;

  const [approvalWorkflow, setApprovalWorkflow] =
    useState<ApprovalWorkflow | null>(null);

  const getUserSpecificStatus = (): string => {
    if (!user || !approvalWorkflow?.approval_steps?.length) {
      return report?.status || "UNDER_REVIEW";
    }

    const currentUserId = user.id.toString();
    const steps = approvalWorkflow.approval_steps;

    // 1️⃣ If any step or approver has REJECTED → everyone sees REJECTED
    const anyRejected = steps.some((step) => step.status === "REJECTED");
    if (anyRejected) return "REJECTED";

    // 2️⃣ Find the step that contains the current user
    const userStep = steps.find((step) =>
      step.approvers?.some((a) => a.user_id?.toString() === currentUserId)
    );

    if (!userStep) {
      // user not part of approval chain → show global status or UNDER_REVIEW
      return report?.status || "UNDER_REVIEW";
    }

    // 4️⃣ If user’s step hasn’t started yet → UNDER_REVIEW
    const userStepOrder = userStep.step_order;
    const currentStepOrder = approvalWorkflow.current_step;

    if (userStepOrder > currentStepOrder) return "PENDING_APPROVAL";

    // 5️⃣ Otherwise, user’s step is active but pending
    if (
      userStep.status === "PENDING" ||
      userStep.status === "PENDING_APPROVAL"
    ) {
      return "PENDING";
    }

    // 6️⃣ Fallback to report’s overall status or UNDER_REVIEW
    return report?.status || "PENDING_APPROVAL";
  };

  const canApprove = () => {
    if (!user || !approvalWorkflow || !approvalWorkflow.approval_steps) {
      return false;
    }

    const currentUserId = user.id.toString();
    const userStep = approvalWorkflow.approval_steps.find((step) =>
      step.approvers.some((approver) => approver.user_id === currentUserId)
    );
    if (userStep?.status === "IN_PROGRESS") return true;

    return false;
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "APPROVED":
      case "FULLY_APPROVED":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "PENDING":
      case "PENDING_APPROVAL":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "REJECTED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-blue-600" />;
    }
  };

  const getAdvance = async (id: string) => {
    try {
      const approvalWorkflowRes: any = await AdvanceService.getAdvanceWorkflow(
        id
      );
      setApprovalWorkflow(approvalWorkflowRes.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (id) getAdvance(id);
  }, [id]);

  const processAdvance = async (action: string, payload?: any) => {
    if (!selectedAdvanceToApprove?.id) return;
    setLoading(true);
    try {
      await AdvanceService.processAdvance({
        id: selectedAdvanceToApprove.id,
        action,
        payload,
      });
      setTimeout(() => {
        navigate("/approvals/advances");
      }, 100);
      if (action === "approve") {
        toast.success("Advance approved successfully");
      } else {
        toast.success("Advance rejected successfully");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to process expense");
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyConversionSubmit = async (
    formData: CurrencyConversionFormValues
  ) => {
    const payload = {
      currency_conversion_rates: [
        {
          currency: selectedAdvanceToApprove?.currency,
          rate: Number(formData.rate),
        },
      ],
    };
    processAdvance("approve", payload);
  };

  const handleAction = async (action: string) => {
    const text =
      action === "approve" ? "Approve Advance" : "Reject Advance";
    trackEvent(text + " Button Clicked", {
      button_name: text,
    });
    if (action === "reject") {
      setShowActionDialog(true);
    } else if (
      approvalWorkflow?.current_step === approvalWorkflow?.total_steps &&
      action === "approve" &&
      baseCurrency !== selectedAdvanceToApprove?.currency
    ) {
      setShowCurrencyAlert(true);
    } else {
      processAdvance(action);
      // Show confirmation modal
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-700">
              {report?.title}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              {getStatusIcon(getUserSpecificStatus())}
              <Badge
                className={`${getStatusColor(
                  getUserSpecificStatus()
                )} text-sm px-3 py-1`}
              >
                {getUserSpecificStatus().replace("_", " ")}
              </Badge>
            </div>
          </div>
          {canApprove() && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleAction("approve")}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => handleAction("reject")}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Advance Information
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
                    {report?.created_by.email}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    Status
                  </div>
                  <Badge className={getStatusColor(getUserSpecificStatus())}>
                    {getUserSpecificStatus().replace("_", " ")}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Created Date
                  </div>
                  <p className="text-lg font-semibold">
                    {report?.created_at && formatDate(report.created_at)}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Submitted Date
                  </div>
                  <p className="text-lg font-semibold">
                    {report?.created_at
                      ? formatDate(report.created_at)
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
                    {report?.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="lg:col-span-2">
            <CreateAdvanceForm
              mode="view"
              showHeader={false}
              maxWidth="w-full"
            />
          </div>
        </div>
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
      <AlertDialog open={showCurrencyAlert} onOpenChange={setShowCurrencyAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-900">
              Currency Conversion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-3 leading-relaxed">
              Please enter conversion rates for below currencies into{" "}
              {baseCurrency}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCurrencyConversionSubmit)}
              className="space-y-3"
            >
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-8 space-y-0">
                    <FormLabel>{selectedAdvanceToApprove?.currency}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="Enter conversion rate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-end gap-8 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCurrencyAlert(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  type="submit"
                >
                  {loading ? "Approving..." : "Approve"}
                </Button>
              </div>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject Advance
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
                      Amount:
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(
                        +selectedAdvanceToApprove?.amount,
                        selectedAdvanceToApprove?.currency
                      )}
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
                    placeholder="Please provide reason for rejection..."
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
                    className="w-full sm:w-auto px-6 py-2.5 border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      processAdvance("reject", {
                        action: "reject",
                        approval_notes: comments,
                      })
                    }
                    disabled={!comments.trim()}
                    className={`w-full sm:w-auto px-6 py-2.5 font-medium transition-all duration-20 bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {loading ? "Rejecting..." : "Reject"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProcessAdvancePage;
