import { Loader2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

function ExpenseLogs({ logs, loading, error, className }: {
    logs: any[];
    loading: boolean;
    error: string;
    className?: string;
}) {
    console.log(logs);
  return (
    <div className={cn("flex flex-col h-full", className)}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm">{error}</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">No logs</p>
              </div>
            ) : (
  logs.map((log: any, index: number) => (
    <div
      key={log.id}
      className="relative flex gap-4 pl-6"
    >
      {/* Vertical line */}
      {index !== logs.length - 1 && (
        <span className="absolute left-[11px] top-6 h-full w-[2px] bg-gray-200" />
      )}

      {/* Dot */}
      <span className="absolute left-[6px] top-3 h-3 w-3 rounded-full bg-gray-400" />

      {/* Content */}
      <div
        className={cn(
          "flex animate-in fade-in slide-in-from-bottom-2"
        )}
      >
        <div className="flex py-1 items-start gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium capitalize text-gray-800">
              {`Expense ${
                log.action?.replaceAll("_", " ").toLowerCase() || "unknown"
              }`}
            </span>

            <span className="text-[12px] text-gray-500">
              {formatDate(log.created_at)}
            </span>

            <p className="text-sm text-gray-700 leading-snug whitespace-pre-wrap break-words mt-0.5">
              {log.comment}
            </p>
          </div>
        </div>
      </div>
    </div>
  ))
)
}
          </div>
        </div>
  )
}

export default ExpenseLogs