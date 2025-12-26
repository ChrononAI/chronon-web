import { Loader2 } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const UI_DISPLAY_KEYS = [
  "category",
  "category id",
  "amount",
  "description",
  "expense date",
  "invoice number",
  "Reason",
  "vendor",
] as const;

function pickUiFields<T extends Record<string, any>>(
  obj: T
): Partial<Pick<T, (typeof UI_DISPLAY_KEYS)[number]>> {
  return Object.fromEntries(
    UI_DISPLAY_KEYS.filter((key) => key in obj).map((key) => [key, obj[key]])
  );
}

function ExpenseLogs({
  logs,
  loading,
  error,
  className,
}: {
  logs: any[];
  loading: boolean;
  error: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col h-full p-4", className)}>
      <div className="flex-1 overflow-y-auto space-y-4">
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
            <div key={log.id} className="relative flex gap-4 pl-6">
              {/* Vertical line */}
              {index !== logs.length - 1 && (
                <span className="absolute left-[11px] top-6 h-full w-[2px] bg-gray-200" />
              )}

              {/* Dot */}
              <span className="absolute left-[6px] top-3 h-3 w-3 rounded-full bg-gray-400" />

              {/* Content */}
              <div
                className={cn("flex animate-in fade-in slide-in-from-bottom-2")}
              >
                <div className="flex py-1 items-start gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium capitalize text-gray-800">
                      {`Expense ${
                        log.action?.replaceAll("_", " ").toLowerCase() ||
                        "unknown"
                      }`}
                    </span>

                    <span className="text-[12px] text-gray-500">
                      {formatDate(log.created_at)}
                    </span>

                    <p className="text-sm text-gray-700 leading-snug whitespace-pre-wrap break-words mt-0.5">
                      {log.comment}
                    </p>
                    {log.action_data && <p className="text-sm font-medium text-gray-800 mt-2">
                      Details:
                    </p>}
                    <div className="text-sm text-gray-800 ml-2">
                      {Object.entries(pickUiFields(log.action_data || {})).map(
                        ([key, value]) => (
                          <div className="my-1 flex items-center gap-1">
                            <div className="h-1 w-1 rounded-full bg-gray-800" />
                            <div>
                            <span className="w-1/2 capitalize">{key}</span>
                            {": "}
                            <span className="w-1/2">{key === "amount" ? formatCurrency(value) : value}</span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ExpenseLogs;
