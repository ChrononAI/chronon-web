import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: string;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const normalizedStatus = status?.toUpperCase() || "";

  const getStatusBackgroundColor = (): string => {
    if (
      normalizedStatus === "PROCESSED" ||
      normalizedStatus === "OCR_PROCESSED" ||
      normalizedStatus === "APPROVED" ||
      normalizedStatus === "OPEN"
    ) {
      return "bg-[#5DC364]/10";
    } else if (
      normalizedStatus === "REJECTED" ||
      normalizedStatus === "FAILED" ||
      normalizedStatus === "OCR_FAILED"
    ) {
      return "bg-[#DC2627]/10";
    } else if (normalizedStatus === "DRAFT") {
      return "bg-gray-200";
    } else if (
      normalizedStatus === "PENDING" ||
      normalizedStatus === "OCR_PENDING" ||
      normalizedStatus === "PROCESSING" ||
      normalizedStatus === "OCR_PROCESSING" ||
      normalizedStatus === "UPLOADING" ||
      normalizedStatus === "EXTRACTING_DATA" ||
      normalizedStatus === "PENDING_APPROVAL"
    ) {
      return "bg-[#FFF7D6]";
    }
    return "bg-gray-100";
  };

  const getStatusTextColor = (): string => {
    if (
      normalizedStatus === "PROCESSED" ||
      normalizedStatus === "OCR_PROCESSED" ||
      normalizedStatus === "APPROVED" ||
      normalizedStatus === "OPEN"
    ) {
      return "text-[#5DC364]";
    } else if (
      normalizedStatus === "REJECTED" ||
      normalizedStatus === "FAILED" ||
      normalizedStatus === "OCR_FAILED"
    ) {
      return "text-[#DC2627]";
    } else if (normalizedStatus === "DRAFT") {
      return "text-gray-600";
    } else if (
      normalizedStatus === "PENDING" ||
      normalizedStatus === "OCR_PENDING" ||
      normalizedStatus === "PROCESSING" ||
      normalizedStatus === "OCR_PROCESSING" ||
      normalizedStatus === "UPLOADING" ||
      normalizedStatus === "EXTRACTING_DATA" ||
      normalizedStatus === "PENDING_APPROVAL"
    ) {
      return "text-[#F59E0B]";
    }
    return "text-gray-600";
  };

  const formatStatusText = (): string => {
    if (!status) return "Unknown";
    
    // Handle special cases
    if (normalizedStatus === "UPLOADING") {
      return "Uploading";
    }
    if (normalizedStatus === "EXTRACTING_DATA") {
      return "Extracting Data";
    }
    if (normalizedStatus === "PENDING_APPROVAL") {
      return "Pending Approval";
    }
    
    // Remove OCR_ prefix if present
    let formattedStatus = status.startsWith("OCR_")
      ? status.replace("OCR_", "")
      : status;
    
    // Replace underscores with spaces
    formattedStatus = formattedStatus.replace(/_/g, " ");
    return formattedStatus
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center gap-[10px] rounded-lg",
        getStatusBackgroundColor(),
        className
      )}
      style={{
        width: "fit-content",
        height: "23px",
        paddingTop: "4px",
        paddingRight: "8px",
        paddingBottom: "4px",
        paddingLeft: "8px",
        lineHeight: "1",
      }}
    >
      <span className={cn("text-sm font-medium leading-none", getStatusTextColor())}>
        {formatStatusText()}
      </span>
    </div>
  );
}

