import { Loader2, Activity, Clock, User, FileText, CheckCircle, XCircle, Send, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceActivityProps {
  invoiceId: string | undefined;
  className?: string;
}

const formatActivityTime = (dateString: string | undefined | null): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(date);
  } catch {
    return "";
  }
};

const getActivityIcon = (type: string) => {
  switch (type?.toUpperCase()) {
    case "CREATED":
      return { icon: FileText, color: "text-blue-500", bg: "bg-blue-100" };
    case "UPDATED":
    case "EDITED":
      return { icon: Edit, color: "text-purple-500", bg: "bg-purple-100" };
    case "APPROVED":
      return { icon: CheckCircle, color: "text-green-500", bg: "bg-green-100" };
    case "REJECTED":
      return { icon: XCircle, color: "text-red-500", bg: "bg-red-100" };
    case "SUBMITTED":
      return { icon: Send, color: "text-orange-500", bg: "bg-orange-100" };
    default:
      return { icon: Activity, color: "text-gray-500", bg: "bg-gray-100" };
  }
};

export function InvoiceActivity({
  invoiceId,
  className,
}: InvoiceActivityProps) {
  // TODO: Implement activity API integration
  const loading = false;
  const activities: any[] = [];
  const error = null;

  return (
    <div className={cn("flex flex-col h-full bg-gradient-to-b from-purple-50/30 to-white", className)}>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-sm text-gray-500">Loading activity...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4 bg-red-50 rounded-xl border-2 border-red-200 max-w-sm">
              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="p-6 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 shadow-lg">
              <Activity className="h-12 w-12 text-purple-500" />
            </div>
            <div className="text-center max-w-xs">
              <p className="text-base font-semibold text-gray-800 mb-1">
                No Activity
              </p>
              <p className="text-sm text-gray-500">
                Activity timeline will appear here as actions are taken on this invoice.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-200 via-purple-300 to-transparent" />
            
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const iconConfig = getActivityIcon(activity.type || activity.action);
                const Icon = iconConfig.icon;
                const isLast = index === activities.length - 1;

                return (
                  <div
                    key={index}
                    className="relative flex gap-4 animate-in fade-in slide-in-from-left-2"
                  >
                    {/* Timeline dot */}
                    <div className="relative flex-shrink-0">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center shadow-sm border-2 border-white",
                        iconConfig.bg
                      )}>
                        <Icon className={cn("h-5 w-5", iconConfig.color)} />
                      </div>
                      {!isLast && (
                        <div className="absolute left-1/2 top-12 w-0.5 h-4 bg-purple-200 transform -translate-x-1/2" />
                      )}
                    </div>

                    {/* Activity content */}
                    <div className="flex-1 pb-4">
                      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-800">
                              {activity.title || activity.type || "Activity"}
                            </h4>
                            {activity.status && (
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                activity.status === "APPROVED" 
                                  ? "bg-green-100 text-green-700"
                                  : activity.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                              )}>
                                {activity.status}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatActivityTime(activity.created_at || activity.timestamp)}</span>
                          </div>
                        </div>
                        
                        {activity.message && (
                          <p className="text-sm text-gray-600 leading-relaxed mb-2">
                            {activity.message}
                          </p>
                        )}

                        {activity.user && (
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {activity.user.name || activity.user.email || "Unknown user"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

