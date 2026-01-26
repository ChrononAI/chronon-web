import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { useAuthStore } from "@/store/authStore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: number[] | string): string {
  if (Array.isArray(date)) {
    const [year, month, day] = date;
    return format(new Date(year, month - 1, day), "MMM dd, yyyy");
  }
  return format(new Date(date), "MMM dd, yyyy");
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getOrgCurrency(): string {
  const orgSettings = useAuthStore.getState().orgSettings;
  return orgSettings?.currency;
}

export function usesMetricSystem(): boolean {
  const currency = getOrgCurrency();
  return currency === "INR";
}

export function getDistanceUnit(): "km" | "miles" {
  return usesMetricSystem() ? "km" : "miles";
}

export function formatDistance(distance: number, distanceUnit: string): string {
  const unit = distanceUnit.toUpperCase() === "MILES" ? "miles" : "km";
  return `${distance.toFixed(2)} ${unit}`;
}

export function formatDistanceWithDefault(distance: number): string {
  const unit = getDistanceUnit();
  return `${distance.toFixed(2)} ${unit}`;
}

export function parseDistanceToKm(distanceStr: string): number {
  const match = distanceStr.match(/(\d+\.?\d*)/);
  if (!match) return 0;

  return parseFloat(match[1]);
}

export function parseDistanceUnit(distanceStr: string): string {
  const unit = distanceStr.toLowerCase();
  if (unit.includes("mile")) {
    return "MILES";
  }
  return "KM";
}

export function formatCurrency(
  amount: number,
  overrideCurrency?: string
): string {
  const currency = overrideCurrency || getOrgCurrency() || "INR";

  let locale = "en-IN";
  if (currency === "USD") {
    locale = "en-US";
  } else if (currency === "EUR") {
    locale = "en-DE";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export const getStatusColor = (status: string): string => {
  switch (status?.toUpperCase()) {
    case "PENDING":
    case "PENDING_APPROVAL":
    case "PAYMENT_PENDING":
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "APPROVED":
    case "PAID":
    case "FULLY_APPROVED":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "REJECTED":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    case "IN_APPROVAL":
    case "INITIATED":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "UNDER_REVIEW":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "FOR_APPROVAL":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "SENT_BACK":
      return "bg-orange-100 hover:bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

export const getBulkUploadStatusColor = (status: string): string => {
  switch (status.toUpperCase()) {
      case "NEED_FIXES":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "FINALIZED":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "COMPLETED":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

export const getWorkflowStatusColor = (status: string): string => {
  switch (status.toUpperCase()) {
    case "INITIATED":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "APPROVED":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "REJECTED":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    case "NOT_INITIATED":
      return "bg-gray-100 text-gray-500 hover:bg-gray-100";
    default:
      return "bg-gray-100 text-gray-600 hover:bg-gray-100";
  }
};

export const generateIdWithPrefix = (prefix: string, length = 10): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars[randomValues[i] % chars.length];
  }

  return `${prefix}${id}`;
};
