import { Loader2, AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceValidationProps {
  invoiceId: string | undefined;
  className?: string;
}

export function InvoiceValidation({
  invoiceId,
  className,
}: InvoiceValidationProps) {
  // TODO: Implement validation API integration
  const loading = false;
  const validations: any[] = [];
  const error = null;

  const getSeverityConfig = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "ERROR":
        return {
          icon: XCircle,
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          iconColor: "text-red-500",
          textColor: "text-red-800",
          badgeColor: "bg-red-100 text-red-700",
        };
      case "WARNING":
        return {
          icon: AlertTriangle,
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          iconColor: "text-yellow-500",
          textColor: "text-yellow-800",
          badgeColor: "bg-yellow-100 text-yellow-700",
        };
      case "INFO":
        return {
          icon: Info,
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          iconColor: "text-blue-500",
          textColor: "text-blue-800",
          badgeColor: "bg-blue-100 text-blue-700",
        };
      default:
        return {
          icon: AlertTriangle,
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          iconColor: "text-gray-500",
          textColor: "text-gray-800",
          badgeColor: "bg-gray-100 text-gray-700",
        };
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-gradient-to-b from-amber-50/30 to-white", className)}>
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-sm text-gray-500">Validating invoice...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4 bg-red-50 rounded-xl border-2 border-red-200 max-w-sm">
              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          </div>
        ) : validations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="relative">
              <div className="p-6 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 shadow-lg">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-center max-w-xs">
              <p className="text-base font-semibold text-gray-800 mb-1">
                All Clear!
              </p>
              <p className="text-sm text-gray-500">
                No validation issues found. Your invoice looks good.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-800">
                  {validations.length} {validations.length === 1 ? "Issue" : "Issues"} Found
                </h3>
              </div>
            </div>
            {validations.map((validation, index) => {
              const config = getSeverityConfig(validation.severity || "WARNING");
              const Icon = config.icon;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "group animate-in fade-in slide-in-from-bottom-2 p-4 rounded-xl border-2 transition-all hover:shadow-md",
                    config.bgColor,
                    config.borderColor
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex-shrink-0 p-2 rounded-lg",
                      config.bgColor
                    )}>
                      <Icon className={cn("h-5 w-5", config.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className={cn(
                          "text-sm font-semibold",
                          config.textColor
                        )}>
                          {validation.title || validation.validation_type || "Validation Issue"}
                        </h4>
                        {validation.severity && (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            config.badgeColor
                          )}>
                            {validation.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {validation.message}
                      </p>
                      {validation.status && (
                        <div className="mt-2 pt-2 border-t border-gray-200/50">
                          <span className="text-xs text-gray-500">
                            Status: <span className="font-medium">{validation.status}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

