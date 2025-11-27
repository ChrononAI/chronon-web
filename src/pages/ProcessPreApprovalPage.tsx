import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import CreatePreApprovalForm from "@/components/pre-approval/CreatePreApprovalForm";
import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatDate, getStatusColor } from "@/lib/utils";
import { trackEvent } from "@/mixpanel";
import { preApprovalService } from "@/services/preApprovalService";
import { useAuthStore } from "@/store/authStore";
import { usePreApprovalStore } from "@/store/preApprovalStore";
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
  usd: z.string({ required_error: "This field is required" }),
  eur: z.string({ required_error: "This field is required" }),
});

export interface CurrencyConversionRate {
  currency: string;
  rate: number;
}

export interface CurrencyConversionPayload {
  currency_conversion_rates: CurrencyConversionRate[];
}

type CurrencyConversionFormValues = z.infer<typeof currencyConversionSchema>;

function ProcessPreApprovalPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { selectedPreApprovalToApprove } = usePreApprovalStore();

  const form = useForm<CurrencyConversionFormValues>({
    resolver: zodResolver(currencyConversionSchema),
    defaultValues: {
      usd: undefined,
      eur: undefined,
    },
  });

  const handleCurrencyConversionSubmit = async (
    formData: CurrencyConversionFormValues
  ) => {
    const payload = {
      currency_conversion_rates: Object.entries(formData).map(
        ([key, value]) => ({
          currency: key.toUpperCase(),
          rate: Number(value),
        })
      ),
    };
    processAdvance("approve", payload);
  };

  const report = selectedPreApprovalToApprove;

  const [approvalWorkflow, setApprovalWorkflow] =
    useState<ApprovalWorkflow | null>(null);
  const [showCurrencyAlert, setShowCurrencyAlert] = useState(false);

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

  const getApprovalWorkflow = async (id: string) => {
    try {
      const approvalWorkflowRes: any =
        await preApprovalService.getPreApprovalWorkflow(id);
      setApprovalWorkflow(approvalWorkflowRes.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (id) getApprovalWorkflow(id);
  }, [id]);

  const processAdvance = async (
    action: string,
    payload?: CurrencyConversionPayload
  ) => {
    if (!selectedPreApprovalToApprove?.id) return;
    try {
      await preApprovalService.processPreApproval({
        id: selectedPreApprovalToApprove.id,
        action,
        payload,
      });
      if (action === "approve") {
        toast.success("Expense approved successfully");
      } else {
        toast.success("Expense rejected successfully");
      }
      setTimeout(() => {
        navigate("/approvals/pre-approvals");
      }, 100);
    } catch (error) {
      console.log(error);
      toast.error("Failed to process expense");
    }
  };
  const handleAction = async (action: string) => {
    const text = action === 'approve' ? "Approve Pre Approval" : "Reject Pre Approval";
    trackEvent(text + " Button Clicked", {
      button_name: text,
    });
    if (
      approvalWorkflow?.current_step === approvalWorkflow?.total_steps &&
      action === "approve"
    ) {
      setShowCurrencyAlert(true);
    } else {
      processAdvance(action);
    }
  };
  return (
    <>
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
          <div className="col-span-1 lg:col-span-2 space-y-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Pre Approval Information
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
                      <Badge
                        className={getStatusColor(getUserSpecificStatus())}
                      >
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
            </div>
            <div className="lg:col-span-2">
              <CreatePreApprovalForm
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
      </div>
      <AlertDialog open={showCurrencyAlert} onOpenChange={setShowCurrencyAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-900">
              Currency Conversion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-3 leading-relaxed">
              Please enter conversion rates for below currencies into INR
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCurrencyConversionSubmit)}
              className="space-y-3"
            >
              <FormField
                control={form.control}
                name="usd"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-8">
                    <FormLabel>USD</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="Enter USD Conversion"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="eur"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-8">
                    <FormLabel>EUR</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="Enter EUR Conversion"
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
                  Approve
                </Button>
              </div>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ProcessPreApprovalPage;
