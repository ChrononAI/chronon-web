import { useState, useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { expenseService } from "@/services/expenseService";
import { cn } from "@/lib/utils";

interface ValidationItem {
  id: string;
  title: string;
  message: string;
  severity: "WARNING" | "ERROR" | "INFO" | string;
  status: "ACTIVE" | "RESOLVED" | string;
  validation_type:
    | "VENDOR_MISMATCH"
    | "RECEIPT_DATE_MISMATCH"
    | "INVOICE_NUMBER_MISMATCH"
    | "RECEIPT_AMOUNT_MISMATCH"
    | string;
  additional_data: Record<string, string | number>;
}

export function ExpenseValidation({
  expenseId,
  className,
}: {
  expenseId: string;
  className?: string;
}) {
  const [validations, setValidations] = useState<ValidationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch comments when expenseId is available
  useEffect(() => {
    const fetchValidation = async () => {
      if (expenseId) {
        setLoading(true);
        setError(null);
        try {
          const res = await expenseService.getExpenseValidation(expenseId);
          console.log(res);
          setValidations(res.data.data);
        } catch (error: any) {
          console.error("Error fetching validaitons:", error);
          setError(
            error.response?.data?.message || "Failed to load validations"
          );
        } finally {
          setLoading(false);
        }
      }
    };

    fetchValidation();
  }, [expenseId]);

  return (
    <div className={cn("flex flex-col h-full md:h-[520px]", className)}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : validations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No validations</p>
          </div>
        ) : (
          validations.map((validation) => (
            <div
              key={validation.id}
              className={cn("flex animate-in fade-in slide-in-from-bottom-2")}
            >
              <div className="flex py-2 items-start gap-3">
                {/* Icon */}
                <AlertTriangle size={22} className="text-yellow-500 mt-0.5" />

                {/* Content */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">
                    {validation.title || "Unknown"}
                  </span>

                  <p className="text-sm text-gray-700 leading-snug whitespace-pre-wrap break-words mt-0.5">
                    {validation.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
