import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "../ui/button";
import { ExpenseValidation, ValidationItem } from "./ExpenseValidation";
import { ExpenseComments } from "./ExpenseComments";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { expenseService } from "@/services/expenseService";
import ExpenseLogs from "./ExpenseLogs";
import { ExpenseComment } from "@/types/expense";
import { toast } from "sonner";
import { Attachment } from "./ExpenseDetailsStep2";
import { AttachmentUploader } from "./AttachmentUploader";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const isPdfUrl = (url: string | null | undefined) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes(".pdf") ||
    lowerUrl.startsWith("data:application/pdf") ||
    lowerUrl.includes("application%2Fpdf")
  );
};

function ReceiptViewer({
  activeReceiptTab,
  setActiveReceiptTab,
  readOnly,
  hasReceipt,
  handleReplaceReceipt,
  replaceRecLoading,
  loading,
  isLoadingReceipt,
  activeReceiptUrl,
  attachments,
  receiptZoom,
  receiptRotation,
  handleReceiptDownload,
  uploadReceipt,
  receiptDisplayName,
  expense,
  uploadedFile,
  handleReceiptRotate,
  handleReceiptZoomIn,
  handleReceiptZoomOut,
  setAttachments,
  fileIds,
  setFileIds,
  generateUploadUrl
}: any) {
  const [validations, setValidations] = useState<ValidationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [expenseLogs, setExpenseLogs] = useState<ExpenseComment[]>([]);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isReceiptFullscreen, setIsReceiptFullscreen] = useState(false);
  const [activeReceiptIndex, setReceiptIndex] = useState(0);
  const receiptArr = [
    ...(activeReceiptUrl ? [activeReceiptUrl] : []),
    ...(attachments?.map((a: Attachment) => a.url) ?? []),
  ];
  const currentReceiptUrl = receiptArr[activeReceiptIndex];

  const hasMultipleReceipts = receiptArr.length > 1;

  const goPrev = () => {
    setReceiptIndex((i) => (i === 0 ? receiptArr.length - 1 : i - 1));
  };

  const goNext = () => {
    setReceiptIndex((i) => (i === receiptArr.length - 1 ? 0 : i + 1));
  };

  const [newComment, setNewComment] = useState<string>();
  const [postingComment, setPostingComment] = useState(false);
  const [comments, setComments] = useState<ExpenseComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const validationCount = validations?.length ?? 0;

  const handleReceiptFullscreen = () => {
    setIsReceiptFullscreen(true);
  };

  const receiptDisplayType = uploadedFile
    ? uploadedFile.type.toLowerCase().includes("pdf")
      ? "PDF"
      : "Image"
    : activeReceiptUrl
      ? isPdfUrl(activeReceiptUrl)
        ? "PDF"
        : "Image"
      : null;

  const isPdfReceipt =
    (uploadedFile && uploadedFile.type.toLowerCase().includes("pdf")) ||
    isPdfUrl(currentReceiptUrl);

  const handlePostComment = async () => {
    if (!expense?.id || !newComment?.trim() || postingComment) return;

    setPostingComment(true);
    setCommentError(null);

    try {
      await expenseService.postExpenseComment(
        expense?.id,
        newComment.trim(),
        false
      );
      // Refetch comments to get the updated list with the new comment
      const fetchedComments = await expenseService.getExpenseComments(
        expense?.id
      );
      // Sort comments by created_at timestamp (oldest first)
      const sortedComments = [...fetchedComments.filter((c) => !c.action)].sort(
        (a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB;
        }
      );
      setComments(sortedComments);
      setNewComment("");
      toast.success("Comment posted successfully");
    } catch (error: any) {
      console.error("Error posting comment:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to post comment";
      setCommentError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setPostingComment(false);
    }
  };

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

  useEffect(() => {
    const fetchComments = async () => {
      if (expense?.id) {
        setLoadingComments(true);
        setCommentError(null);
        try {
          const fetchedComments = await expenseService.getExpenseComments(
            expense?.id
          );
          // Sort comments by created_at timestamp (oldest first)
          const sortedComments = [
            ...fetchedComments.filter((c) => c.creator_type === "USER"),
          ].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateA - dateB;
          });
          setComments(sortedComments);
          const sortedLogs = [
            ...fetchedComments.filter((c) => c.creator_type === "SYSTEM"),
          ].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateA - dateB;
          });
          setExpenseLogs(sortedLogs);
        } catch (error: any) {
          console.error("Error fetching comments:", error);
          setCommentError(
            error.response?.data?.message || "Failed to load comments"
          );
        } finally {
          setLoadingComments(false);
        }
      }
    };

    fetchComments();
  }, [expense?.id]);

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-3 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {[
              { key: "receipt", label: "Receipt" },
              { key: "comments", label: "Comments" },
              { key: "validation", label: "Validation" },
              { key: "logs", label: "Logs" },
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

                    hasErrors && !isActive && "bg-amber-50 text-amber-700"
                  )}
                >
                  {tab.label}

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
          className={`h-full flex-1 overflow-hidden ${activeReceiptTab !== "receipt" && "overflow-hidden"
            }`}
        >
          {activeReceiptTab === "receipt" ? (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 p-2 flex items-center">
                {isLoadingReceipt ? (
                  <div className="flex flex-col items-center justify-center mx-auto gap-3 p-16 text-center">
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
                  <div className="relative h-full w-full">
                    <div
                      className={cn(
                        "flex items-center justify-between",
                        isPdfReceipt && "h-full"
                      )}
                    >
                      {isPdfReceipt ? (
                        <embed
                          src={`${currentReceiptUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                          type="application/pdf"
                          className="w-full h-full block rounded-xl border border-gray-200 bg-white"
                          style={{
                            transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                            transformOrigin: "center",
                          }}
                        />
                      ) : (
                        <img
                          src={currentReceiptUrl ?? ""}
                          alt="Receipt preview"
                          className="w-[80%] bg-white object-contain mx-auto"
                          style={{
                            transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                            transformOrigin: "center",
                          }}
                          onClick={handleReceiptFullscreen}
                        />
                      )}
                    </div>
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
              <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 mx-auto w-48 flex items-center justify-between">
                {hasMultipleReceipts && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goPrev}
                    className="z-20 bg-white/70 hover:bg-white"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
                {hasMultipleReceipts && (
                  <div className="flex justify-center gap-2 py-2">
                    {receiptArr.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setReceiptIndex(index)}
                        className={cn(
                          "h-2 w-2 rounded-full transition-colors",
                          index === activeReceiptIndex
                            ? "bg-gray-600"
                            : "bg-gray-300 hover:bg-gray-400"
                        )}
                        aria-label={`Go to receipt ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
                {hasMultipleReceipts && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goNext}
                    className="z-20 bg-white/70 hover:bg-white"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
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
                  <AttachmentUploader
                    onChange={setAttachments}
                    fileIds={fileIds}
                    setFileIds={setFileIds}
                    generateUploadUrl={generateUploadUrl}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={handleReceiptZoomOut}
                        disabled={!hasReceipt || receiptZoom <= 0.5}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white text-black border border-[0.5]">
                      <p>Zoom out</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={handleReceiptZoomIn}
                        disabled={!hasReceipt || receiptZoom >= 3}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white text-black border border-[0.5]">
                      <p>Zoom in</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={handleReceiptRotate}
                        disabled={!hasReceipt}
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white text-black border border-[0.5]">
                      <p>Rotate</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3"
                        onClick={handleReceiptDownload}
                        disabled={!hasReceipt}
                      >
                        <Download className="mr-2 h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white text-black border border-[0.5]">
                      <p>Download</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          ) : activeReceiptTab === "comments" ? (
            <ExpenseComments
              expenseId={expense?.id}
              readOnly={false}
              comments={comments}
              commentError={commentError}
              loadingComments={loadingComments}
              postComment={handlePostComment}
              postingComment={postingComment}
              newComment={newComment || ""}
              setNewComment={setNewComment}
            />
          ) : activeReceiptTab === "validation" ? (
            <ExpenseValidation
              error={error}
              validations={validations}
              loading={validationLoading}
            />
          ) : (
            <ExpenseLogs
              logs={expenseLogs}
              loading={loadingComments}
              error={commentError || ""}
            />
          )}
        </div>
      </div>
      {isReceiptFullscreen && hasReceipt && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex flex-col">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Receipt Viewer
                </h3>
                <span className="text-sm text-gray-500">
                  {receiptDisplayName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptZoomOut}
                  disabled={receiptZoom <= 0.5}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                  {Math.round(receiptZoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptZoomIn}
                  disabled={receiptZoom >= 3}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptRotate}
                  className="h-8 w-8 p-0"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReceiptDownload}
                  className="h-8 px-3 text-xs"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReceiptFullscreen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Fullscreen Content */}
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
              {(() => {
                const fullscreenSourceUrl = currentReceiptUrl;
                return fullscreenSourceUrl?.toLowerCase().includes(".pdf") ? (
                  <div className="w-full h-full bg-white rounded">
                    <embed
                      src={`${fullscreenSourceUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0`}
                      type="application/pdf"
                      className="w-full h-full border-0 rounded"
                      style={{
                        transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                        transformOrigin: "center",
                      }}
                    />
                  </div>
                ) : (
                  <img
                    src={fullscreenSourceUrl || ""}
                    alt="Receipt fullscreen"
                    className="max-w-full max-h-full object-contain"
                    style={{
                      transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                      transformOrigin: "center",
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ReceiptViewer;
