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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Attachment } from "./JourneyAttachmentModal";

const isPdfUrl = (url: string | null | undefined) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes(".pdf") ||
    lowerUrl.startsWith("data:application/pdf") ||
    lowerUrl.includes("application%2Fpdf")
  );
};

interface AttachmentFullscreenViewerProps {
  attachments: Attachment[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export function AttachmentFullscreenViewer({
  attachments,
  isOpen,
  onClose,
  initialIndex = 0,
}: AttachmentFullscreenViewerProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(initialIndex);
      setZoom(1);
      setRotation(0);
      setLoading(true);
    }
  }, [isOpen, initialIndex]);

  const currentAttachment = attachments[activeIndex];
  const currentUrl = currentAttachment?.url;
  const hasMultiple = attachments.length > 1;
  const isPdf = currentUrl ? isPdfUrl(currentUrl) : false;

  const goPrev = () => {
    setActiveIndex((i) => (i === 0 ? attachments.length - 1 : i - 1));
    setZoom(1);
    setRotation(0);
    setLoading(true);
  };

  const goNext = () => {
    setActiveIndex((i) => (i === attachments.length - 1 ? 0 : i + 1));
    setZoom(1);
    setRotation(0);
    setLoading(true);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (currentUrl) {
      window.open(currentUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleImageLoad = () => {
    setLoading(false);
  };

  const handleImageError = () => {
    setLoading(false);
  };

  useEffect(() => {
    if (currentUrl && !isPdf) {
      const img = new Image();
      img.onload = handleImageLoad;
      img.onerror = handleImageError;
      img.src = currentUrl;
    } else if (currentUrl && isPdf) {
      setLoading(false);
    }
  }, [currentUrl, isPdf]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasMultiple) {
        goPrev();
      } else if (e.key === "ArrowRight" && hasMultiple) {
        goNext();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "r" || e.key === "R") {
        handleRotate();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, hasMultiple]);

  if (!isOpen || attachments.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-white">
                {currentAttachment?.name || `Attachment ${activeIndex + 1}`}
              </h3>
              {hasMultiple && (
                <span className="text-sm text-gray-300">
                  {activeIndex + 1} of {attachments.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="h-9 w-9 p-0 text-white hover:bg-white/20"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-white min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="h-9 w-9 p-0 text-white hover:bg-white/20"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-white/30 mx-2" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                className="h-9 w-9 p-0 text-white hover:bg-white/20"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-white/30 mx-2" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-9 px-3 text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <div className="w-px h-6 bg-white/30 mx-2" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-9 w-9 p-0 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex items-center justify-center p-4 pt-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-white" />
              <p className="text-sm text-gray-300">Loading attachment...</p>
            </div>
          ) : currentUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {isPdf ? (
                <div className="w-full h-full bg-white rounded-lg overflow-hidden">
                  <embed
                    src={`${currentUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0`}
                    type="application/pdf"
                    className="w-full h-full"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: "center",
                    }}
                  />
                </div>
              ) : (
                <img
                  src={currentUrl}
                  alt={currentAttachment?.name || "Attachment"}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: "center",
                  }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}

              {hasMultiple && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goPrev}
                    className={cn(
                      "absolute left-4 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20",
                      "transition-all hover:scale-110"
                    )}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goNext}
                    className={cn(
                      "absolute right-4 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 text-white border border-white/20",
                      "transition-all hover:scale-110"
                    )}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-white">
              <FileText className="h-16 w-16 text-gray-400" />
              <p className="text-lg font-medium">No attachment available</p>
              <p className="text-sm text-gray-400">
                This attachment could not be loaded
              </p>
            </div>
          )}
        </div>

        {hasMultiple && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
              {attachments.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setActiveIndex(index);
                    setZoom(1);
                    setRotation(0);
                    setLoading(true);
                  }}
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    index === activeIndex
                      ? "bg-white w-8"
                      : "bg-white/40 hover:bg-white/60"
                  )}
                  aria-label={`Go to attachment ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
