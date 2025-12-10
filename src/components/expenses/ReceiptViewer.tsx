import {
  Download,
  FileText,
  Loader2,
  Maximize2,
  RefreshCw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "../ui/button";
import { ExpenseValidation, ValidationItem } from "./ExpenseValidation";
import { ExpenseComments } from "./ExpenseComments";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { expenseService } from "@/services/expenseService";

function ReceiptViewer({
  activeReceiptTab,
  setActiveReceiptTab,
  readOnly,
  hasReceipt,
  handleReplaceReceipt,
  replaceRecLoading,
  loading,
  isLoadingReceipt,
  isPdfReceipt,
  activeReceiptUrl,
  receiptZoom,
  receiptRotation,
  handleReceiptFullscreen,
  handleReceiptDownload,
  uploadReceipt,
  receiptDisplayName,
  receiptDisplayType,
  expense,
  uploadedFile,
  handleReceiptRotate,
  handleReceiptZoomIn,
  handleReceiptZoomOut,
  handleReceiptReset,
}: any) {
  const [validations, setValidations] = useState<ValidationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const validationCount = validations?.length ?? 0;

  // Fetch comments when expenseId is available
  useEffect(() => {
    const fetchValidation = async () => {
      if (expense && expense?.id) {
        setValidationLoading(true);
        setError(null);
        try {
          const res = await expenseService.getExpenseValidation(expense?.id);
          setValidations(res.data.data);
        } catch (error: any) {
          console.error("Error fetching validaitons:", error);
          setError(
            error.response?.data?.message || "Failed to load validations"
          );
        } finally {
          setValidationLoading(false);
        }
      }
    };

    fetchValidation();
  }, [expense?.id]);

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {[
            { key: "receipt", label: "Receipt" },
            { key: "comments", label: "Comments" },
            { key: "validation", label: "Validation" },
          ].map((tab) => {
            const isActive = activeReceiptTab === tab.key;
            const isValidation = tab.key === "validation";
            const hasErrors = isValidation && validationCount > 0;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveReceiptTab(tab.key)}
                className={cn(
                  "relative rounded-full px-3 py-2 text-sm font-medium transition-all flex items-center gap-2",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-500 hover:text-gray-900",

                  // 🔥 Light brown background for validation tab if errors exist
                  hasErrors && !isActive && "bg-amber-50 text-amber-700"
                )}
              >
                {tab.label}

                {/* 🔥 Show badge only for validation */}
                {hasErrors && (
                  <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full">
                    {validationCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {!readOnly && hasReceipt && activeReceiptTab === "receipt" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReplaceReceipt}
            disabled={replaceRecLoading || loading}
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Replace receipt
          </Button>
        )}
      </div>
      <div
        className={`h-full flex-1 overflow-hidden ${
          activeReceiptTab !== "receipt" && "overflow-hidden"
        }`}
      >
        {activeReceiptTab === "receipt" ? (
          <div className="flex flex-col h-full">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 p-2">
              {isLoadingReceipt ? (
                <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Loading receipt preview
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Please wait a moment
                    </p>
                  </div>
                </div>
              ) : hasReceipt ? (
                <div className={`flex items-center justify-center p-4 ${isPdfReceipt && "h-full"}`}>
                  {isPdfReceipt ? (
                    <embed
                      src={`${activeReceiptUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      type="application/pdf"
                      className="w-full h-full block rounded-xl border border-gray-200 bg-white"
                      style={{
                        transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                        transformOrigin: "center",
                      }}
                    />
                  ) : (
                    <img
                      src={activeReceiptUrl ?? ""}
                      alt="Receipt preview"
                      className="w-[70%] bg-white object-contain"
                      style={{
                        transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                        transformOrigin: "center",
                      }}
                      onClick={handleReceiptFullscreen}
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
                  <FileText className="h-14 w-14 text-gray-300" />
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        No receipt uploaded
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Upload the receipt to see a preview here.
                      </p>
                    </div>
                    <Button onClick={uploadReceipt}>Upload Receipt</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 p-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <p className="text-sm font-medium text-gray-900">
                  {receiptDisplayName}
                </p>
                {receiptDisplayType && (
                  <p className="mt-1 flex items-center gap-2">
                    <span>{receiptDisplayType}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={handleReceiptZoomOut}
                  disabled={!hasReceipt || receiptZoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={handleReceiptZoomIn}
                  disabled={!hasReceipt || receiptZoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={handleReceiptRotate}
                  disabled={!hasReceipt}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={handleReceiptReset}
                  disabled={!hasReceipt}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3"
                  onClick={handleReceiptFullscreen}
                  disabled={!hasReceipt}
                >
                  <Maximize2 className="mr-2 h-4 w-4" />
                  View
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3"
                  onClick={handleReceiptDownload}
                  disabled={!hasReceipt && !uploadedFile}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        ) : activeReceiptTab === "comments" ? (
          <ExpenseComments
            expenseId={expense?.id}
            readOnly={false}
            autoFetch={activeReceiptTab === "comments"}
          />
        ) : (
          <ExpenseValidation
            error={error}
            validations={validations}
            loading={validationLoading}
          />
        )}
      </div>
    </div>
  );
}

export default ReceiptViewer;
