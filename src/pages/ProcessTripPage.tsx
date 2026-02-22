import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";
import CreateTripJourneyForm from "@/components/trip/CreateTripJourneyForm";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatDate, getStatusColor } from "@/lib/utils";
import { trackEvent } from "@/mixpanel";
import { tripService, TripType } from "@/services/tripService";
import { useAuthStore } from "@/store/authStore";
import { useTripStore } from "@/store/tripStore";
import { ApprovalWorkflow } from "@/types/expense";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  CheckCircle,
  Clock,
  Loader2,
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

function ProcessTripPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { selectedTripToApprove } = useTripStore();

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
    processPreApproval("approve", payload);
  };

  const report = selectedTripToApprove;

  const [trip, setTrip] = useState<TripType | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] =
    useState<ApprovalWorkflow | null>(null);
  const [showCurrencyAlert, setShowCurrencyAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [comments, setComments] = useState("");
  const [showActionDialog, setShowActionDialog] = useState(false);

  const getUserSpecificStatus = (): string => {
    if (!user || !approvalWorkflow?.approval_steps?.length) {
      return report?.status || "UNDER_REVIEW";
    }

    const currentUserId = user.id.toString();
    const steps = approvalWorkflow.approval_steps;

    const anyRejected = steps.some((step) => step.status === "REJECTED");
    if (anyRejected) return "REJECTED";

    const userStep = steps.find((step) =>
      step.approvers?.some((a) => a.user_id?.toString() === currentUserId)
    );

    if (!userStep) {
      return report?.status || "UNDER_REVIEW";
    }

    const userStepOrder = userStep.step_order;
    const currentStepOrder = approvalWorkflow.current_step;

    if (userStepOrder > currentStepOrder) return "PENDING_APPROVAL";

    if (
      userStep.status === "PENDING" ||
      userStep.status === "PENDING_APPROVAL"
    ) {
      return "PENDING";
    }

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
      const approvalWorkflowRes: any = await tripService.getTripApprovalWorkflow(id);
      if (approvalWorkflowRes.data && approvalWorkflowRes.data.data && approvalWorkflowRes.data.data.length > 0) {
        const workflowData = approvalWorkflowRes.data.data[0];
        setApprovalWorkflow({
          report_id: id,
          approval_steps: workflowData.approval_steps || [],
          current_step: workflowData.current_step || 1,
          total_steps: workflowData.total_steps || 0,
          workflow_status: workflowData.workflow_status || "RUNNING",
          workflow_execution_id: workflowData.workflow_execution_id || "",
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTripData = async (tripId: string) => {
    try {
      setLoadingTrip(true);
      const response: any = await tripService.getTripRequestByIdForAdmin(tripId);
      if (response.data?.data && response.data.data.length > 0) {
        const tripData = response.data.data[0];
        setTrip(tripData);
      }

    } catch (error: any) {
      console.error("Error fetching trip data:", error);
      toast.error("Failed to load trip details");
    } finally {
      setLoadingTrip(false);
    }
  };

  useEffect(() => {
    if (id) {
      getApprovalWorkflow(id);
      fetchTripData(id);
    }
  }, [id]);

  const processPreApproval = async (
    action: string,
    _payload?: CurrencyConversionPayload,
    _approvalComments?: string
  ) => {
    if (!selectedTripToApprove?.id) return;
    setLoading(true);
    try {
      const actionValue = action === "approve" ? "approved" : "rejected";
      await tripService.processTripAction(selectedTripToApprove.id, actionValue);
      
      if (action === "approve") {
        toast.success("Trip approved successfully");
      } else {
        toast.success("Trip rejected successfully");
      }
      navigate("/approvals/trips");
    } catch (error: any) {
      console.log(error);
      toast.error(
        error?.response?.data?.message || "Failed to process trip"
      );
    } finally {
      setLoading(false);
    }
  };
  const handleAction = (action: "approve" | "reject") => {
    const text =
      action === "approve" ? "Approve Trip" : "Reject Trip";
    trackEvent(text + " Button Clicked", {
      button_name: text,
    });
    setActionType(action);
    setComments("");
    setShowActionDialog(true);
  };

  const executeAction = async () => {
    if (!selectedTripToApprove?.id || !actionType) return;

    if (actionType !== "approve" && !comments.trim()) {
      toast.error("Comments are required for rejection");
      return;
    }

    setActionLoading(true);
    try {
      if (
        approvalWorkflow?.current_step === approvalWorkflow?.total_steps &&
        actionType === "approve"
      ) {
        setShowCurrencyAlert(true);
        setShowActionDialog(false);
      } else {
        await processPreApproval(actionType, undefined, comments);
        setShowActionDialog(false);
      }
    } catch (error: any) {
      console.error(`Failed to ${actionType} trip`, error);
      toast.error(
        error?.response?.data?.message || `Failed to ${actionType} trip`
      );
    } finally {
      setActionLoading(false);
    }
  };
  return (
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                {report?.title || "Trip Request"}
              </h1>
              <div className="flex items-center gap-3">
                {getStatusIcon(getUserSpecificStatus())}
                <Badge
                  className={`${getStatusColor(
                    getUserSpecificStatus()
                  )} text-xs px-2.5 py-1 font-medium`}
                >
                  {getUserSpecificStatus().replace("_", " ")}
                </Badge>
                {report?.created_at && (
                  <span className="text-xs text-gray-500">
                    Created {formatDate(report.created_at)}
                  </span>
                )}
              </div>
            </div>
            {canApprove() && (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleAction("approve")}
                  className="bg-green-600 hover:bg-green-700 text-white px-6"
                  disabled={
                    loading &&
                    approvalWorkflow?.current_step !==
                      approvalWorkflow?.total_steps
                  }
                >
                  {loading &&
                  approvalWorkflow?.current_step !==
                    approvalWorkflow?.total_steps ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleAction("reject")}
                  className="bg-red-600 hover:bg-red-700 text-white px-6"
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
            {loadingTrip ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </CardContent>
              </Card>
            ) : (
              <CreateTripJourneyForm
                mode="view"
                showOnlyJourneys={false}
                tripData={trip || undefined}
                tripId={id}
              />
            )}
          </div>
          {approvalWorkflow && approvalWorkflow.approval_steps && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                    <Activity className="h-5 w-5" />
                    Approval Workflow
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
                  disabled={loading}
                  type="submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    "Approve"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {actionType === "approve" ? "Approve" : "Reject"} Trip
            </DialogTitle>
          </DialogHeader>

          {report && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg space-y-4 p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Trip:
                    </span>
                    <span className="text-sm font-medium">{report.title}</span>
                  </div>
                  {report.purpose && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Purpose:
                      </span>
                      <span className="text-sm font-medium">{report.purpose}</span>
                    </div>
                  )}
                  {report.advance_amount && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Advance Amount:
                      </span>
                      <span className="text-sm font-medium">
                        {report.currency} {report.advance_amount}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="comments">
                      Comments {actionType !== "approve" && <span className="text-red-500">*</span>}
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
                        : "Please provide reason for rejection..."
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
                <div className="flex flex-row gap-3 justify-end w-full">
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
                    disabled={actionLoading || (actionType !== "approve" && !comments.trim())}
                    className={`w-full sm:w-auto px-6 py-2.5 font-medium transition-all duration-200 ${
                      actionType === "approve"
                        ? "bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md"
                        : "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        {actionType === "approve" ? "Approving..." : "Rejecting..."}
                      </>
                    ) : (
                      <>
                        {actionType === "approve" ? (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        {actionType === "approve" ? "Approve Trip" : "Reject Trip"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProcessTripPage;
