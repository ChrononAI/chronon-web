import { Loader2, Activity, CheckCircle, Send, Edit, FilePlus, FileClock, ScanEye, FileOutput, FileX } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useEffect, useState } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { WorkflowTimeline } from "@/components/expenses/WorkflowTimeline";

interface InvoiceActivityProps {
  invoiceId: string | undefined;
  className?: string;
  activities?: any[];
}

const getActivityIcon = (type: string, status?: string) => {
  const statusUpper = (status || type || "").toUpperCase();
  
  switch (statusUpper) {
    case "CREATED":
      return <FilePlus className="h-5 w-5 text-green-600" />;
    case "APPROVED":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "PENDING":
      return <FileClock className="h-5 w-5 text-gray-600" />;
    case "IN_PROGRESS":
      return <ScanEye className="h-5 w-5 text-purple-600" />;
    case "SENT_BACK":
      return <FileOutput className="h-5 w-5 text-orange-600" />;
    case "REJECTED":
      return <FileX className="h-5 w-5 text-red-600" />;
    case "UPDATED":
    case "EDITED":
      return <Edit className="h-5 w-5 text-amber-600" />;
    case "SUBMITTED":
      return <Send className="h-5 w-5 text-indigo-600" />;
    default:
      return <Activity className="h-5 w-5 text-gray-400" />;
  }
};

const getActivityText = (activity: any) => {
  const status = (activity.status || activity.type || "").toUpperCase();
  const userName = activity.user?.name || activity.title || "Unknown";
  
  switch (status) {
    case "CREATED":
      return `Created by ${userName}`;
    case "PENDING":
      return `To be reviewed by ${userName}`;
    case "IN_PROGRESS":
      return `Under review by ${userName}`;
    case "APPROVED":
      return `Approved by ${userName}`;
    case "REJECTED":
      return `Rejected by ${userName}`;
    case "SENT_BACK":
      return `Sent back by ${userName}`;
    default:
      return activity.title || `Activity by ${userName}`;
  }
};

export function InvoiceActivity({
  invoiceId: _invoiceId,
  className,
  activities: initialActivities,
}: InvoiceActivityProps) {
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<any[]>(initialActivities || []);
  const [error, setError] = useState<string | null>(null);

  // If activities contain approval workflow objects (from API), prepare a combined workflow
  const isWorkflowData = activities && activities.length > 0 && !!activities[0].approval_steps;
  const combinedApprovalWorkflow = isWorkflowData
    ? ({ approval_steps: (activities as any[]).slice().reverse().flatMap((item: any) => item.approval_steps || []) } as any)
    : null;

  useEffect(() => {
    // If parent provided activities (even an empty array), use them and skip fetching
    if (initialActivities !== undefined) {
      setActivities(initialActivities || []);
      setError(null);
      setLoading(false);
      return;
    }

    if (!_invoiceId) {
      setActivities([]);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    import("@/services/invoice/invoiceActivityService").then(({ invoiceActivityService }) => {
      invoiceActivityService
        .getApprovers(_invoiceId)
        .then((res) => {
          if (!active) return;
          const workflows = res?.data || [];
          const mapped: any[] = [];

          workflows.forEach((wf) => {
            const wfCreated = wf.created_at || null;
            (wf.approval_steps || []).forEach((step: any) => {
              mapped.push({
                type: "STEP",
                title: step.step_name,
                status: step.status,
                created_at: wfCreated,
                message: `Step ${step.step_order}`,
              });

              (step.approvers || []).forEach((app: any) => {
                mapped.push({
                  type: "APPROVER",
                  title: `${app.first_name || ""} ${app.last_name || ""}`.trim(),
                  status: app.approved_at ? "APPROVED" : null,
                  created_at: app.approved_at || wfCreated,
                  user: { name: `${app.first_name || ""} ${app.last_name || ""}`.trim(), email: app.email },
                });
              });
            });
          });

          setActivities(mapped);
        })
        .catch((e) => {
          if (!active) return;
          console.error("Error loading invoice activity:", e);
          setError("Failed to load activity");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });

    return () => {
      active = false;
    };
  }, [_invoiceId, initialActivities]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm">{error}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No activity found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* If activities are approval workflow objects, render WorkflowTimeline */}
            {combinedApprovalWorkflow ? (
              <WorkflowTimeline approvalWorkflow={combinedApprovalWorkflow} />
            ) : (
              activities.map((activity, index) => {
                const userEmail = activity.user?.email || activity.email || "";
                const note = activity.comment || activity.note || activity.message || "";

                return (
                  <div key={index} className="flex items-start space-x-4">
                    {/* Status Icon + Connector */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center h-5">
                        {getActivityIcon(activity.type, activity.status)}
                      </div>
                      {index < activities.length - 1 && (
                        <div className="w-px h-8 bg-gray-300 mt-2" />
                      )}
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1">
                      {activity.type === "STEP" ? (
                        <>
                          <div className="flex items-center gap-2 justify-between">
                            <div className="text-sm flex items-center h-5">
                              {activity.title}
                            </div>
                            {activity.created_at && (
                              <span className="text-[12px] text-gray-500 flex items-center h-5">
                                {formatDate(activity.created_at)}
                              </span>
                            )}
                          </div>
                          {activity.status && (
                            <div className="mt-1">
                              <StatusPill status={activity.status || "IN_PROGRESS"} className="px-2 py-0.5 text-xs" />
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 justify-between">
                            <div className="text-sm flex items-center h-5">
                              {getActivityText(activity)}
                            </div>
                            {activity.created_at && (
                              <span className="text-[12px] text-gray-500 flex items-center h-5">
                                {formatDate(activity.created_at)}
                              </span>
                            )}
                          </div>

                          {userEmail && (
                            <div className="text-[12px] text-muted-foreground mt-1">
                              {userEmail}
                            </div>
                          )}

                          {note && (
                            <div className="mt-1">
                              <span className="text-gray-600 italic text-[12px]">
                                "{note.trim()}"
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

