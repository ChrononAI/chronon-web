import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { useAuthStore } from "@/store/authStore";
import { FilterMap } from "@/pages/MyExpensesPage";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseLocalDate(dateString: string): Date {
  const rfc1123 = dateString.match(/^\w{3},\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\b/);
  if (rfc1123) {
    const [, day, mon, year] = rfc1123;
    const months: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const m = months[mon];
    if (m !== undefined) {
      return new Date(parseInt(year), m, parseInt(day));
    }
  }

  const iso = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, year, month, day] = iso;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  const dmy = dateString.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  const dmy2 = dateString.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (dmy2) {
    const [, day, month, yy] = dmy2;
    const y = parseInt(yy);
    const year = y >= 70 ? 1900 + y : 2000 + y;
    return new Date(year, parseInt(month) - 1, parseInt(day));
  }

  const ymdSlash = dateString.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdSlash) {
    const [, year, month, day] = ymdSlash;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  return new Date(dateString);
}

export function formatDate(date: number[] | string): string {
  if (date == null) return "";

  if (Array.isArray(date)) {
    const [year, month, day] = date;
    return format(new Date(year, month - 1, day), "MMM dd, yyyy");
  }

  const str = String(date).trim();
  if (!str) return "";

  const d = parseLocalDate(str);
  if (isNaN(d.getTime())) return str;

  return format(d, "MMM dd, yyyy");
}

export { parseLocalDate };

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
  const currency = overrideCurrency || getOrgCurrency();

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

export function buildApprovalBackendQuery(filters: FilterMap): string {
  const params: string[] = [];

  Object.entries(filters).forEach(([key, fieldFilters]) => {
    if (key === "q") {
      const value = fieldFilters?.[0]?.value;

      if (typeof value !== "string" || value.trim() === "") {
        return;
      }

      const finalValue = value.endsWith(":*") ? value : `${value}:*`;

      params.push(`q=${finalValue}`);
      return;
    }

    fieldFilters?.forEach(({ operator, value }) => {
      if (
        !value ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return;
      }

      switch (operator) {
        case "in":
          let values = value as string[];
          if (key === "status" && values.includes("PENDING_APPROVAL")) {
            values = values.map((v) =>
              v === "PENDING_APPROVAL" ? "IN_PROGRESS" : v
            );
          }
          const joined = values.join(",");
          params.push(
            key === "status" ? `${key}=${joined}` : `${key}=in.(${joined})`
          );
          break;

        case "ilike":
          params.push(`${key}=ilike.%${value}%`);
          break;

        default:
          params.push(`${key}=${operator}.${value}`);
      }
    });
  });

  return params.join("&");
}
