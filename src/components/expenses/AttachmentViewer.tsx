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
import { cn } from "@/lib/utils";
import { useState } from "react";
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

function AttachmentViewer({
    activeTab,
    loading,
    attachments,
    setAttachments,
    fileIds,
    setFileIds,
    generateUploadUrl
}: any) {
    const [isReceiptFullscreen, setIsReceiptFullscreen] = useState(false);
    const [activeReceiptIndex, setReceiptIndex] = useState(0);
    const [receiptZoom, setReceiptZoom] = useState(1);
    const [receiptRotation, setReceiptRotation] = useState(0);
    const attachmentArr = [...(attachments?.map((a: Attachment) => a.url) ?? [])];
    const currentReceiptUrl = attachmentArr[activeReceiptIndex];
    const hasAttachment = attachmentArr.length > 0;

    const receiptDisplayName = "Receipt preview";

    const hasMultipleAttachments = attachmentArr.length > 1;

    const goPrev = () => {
        setReceiptIndex((i) => (i === 0 ? attachmentArr.length - 1 : i - 1));
    };

    const goNext = () => {
        setReceiptIndex((i) => (i === attachmentArr.length - 1 ? 0 : i + 1));
    };

    const handleReceiptFullscreen = () => {
        setIsReceiptFullscreen(true);
    };

    const handleReceiptZoomIn = () => {
        setReceiptZoom((prev) => Math.min(prev + 0.25, 3));
    };

    const handleReceiptZoomOut = () => {
        setReceiptZoom((prev) => Math.max(prev - 0.25, 0.5));
    };

    const handleReceiptRotate = () => {
        setReceiptRotation((prev) => (prev + 90) % 360);
    };

    const handleReceiptDownload = () => {
        if (currentReceiptUrl) {
            window.open(currentReceiptUrl, "_blank", "noopener,noreferrer");
        }
    };

    const receiptDisplayType = currentReceiptUrl
        ? isPdfUrl(currentReceiptUrl)
            ? "PDF"
            : "Image"
        : null;

    const isPdfAttachment = isPdfUrl(currentReceiptUrl);

    return (
        <>
            <div className="flex flex-col h-full">
                <div
                    className={`h-full flex-1 overflow-hidden ${activeTab !== "attachment" && "overflow-hidden"
                        }`}
                >
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 p-2 flex items-center">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center mx-auto gap-3 p-16 text-center">
                                    <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">
                                            Loading attachment preview
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Please wait a moment
                                        </p>
                                    </div>
                                </div>
                            ) : hasAttachment ? (
                                <div className="relative h-full w-full">
                                    <div
                                        className={cn(
                                            "flex items-center justify-center",
                                            isPdfAttachment && "h-full"
                                        )}
                                    >
                                        {isPdfAttachment ? (
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
                                                className="w-[70%] bg-white object-contain mx-auto"
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
                                <div className="flex flex-col items-center justify-center gap-3 mx-auto p-16 text-center">
                                    <FileText className="h-14 w-14 text-gray-300" />
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">
                                                No attachment uploaded
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Upload attachments to see a preview here.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="sticky bottom-0 z-10 bg-white w-48 mx-auto flex items-center justify-between">
                            {hasMultipleAttachments && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={goPrev}
                                    className="z-20 bg-white/70 hover:bg-white"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </Button>
                            )}
                            {hasMultipleAttachments && (
                                <div className="flex justify-center gap-2 py-2">
                                    {attachmentArr.map((_, index) => (
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
                            {hasMultipleAttachments && (
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
                                            disabled={!hasAttachment || receiptZoom <= 0.5}
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
                                            disabled={!hasAttachment || receiptZoom >= 3}
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
                                            disabled={!hasAttachment}
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
                                            disabled={!hasAttachment}
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
                </div>
            </div>
            {isReceiptFullscreen && hasAttachment && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
                    <div className="relative w-[96%] h-[96%] flex flex-col">
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

export default AttachmentViewer;
