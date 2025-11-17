import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: number[] | string): string {
  if (Array.isArray(date)) {
    // Handle [2025, 7, 8] format
    const [year, month, day] = date;
    return format(new Date(year, month - 1, day), 'MMM dd, yyyy');
  }
  // Handle ISO string format
  return format(new Date(date), 'MMM dd, yyyy');
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// Status color helper
export const getStatusColor = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'PENDING':
    case 'PENDING_APPROVAL':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    case 'APPROVED':
    case 'FULLY_APPROVED':
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    case 'IN_APPROVAL':
    case 'INITIATED':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    case 'UNDER_REVIEW':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    case 'FOR_APPROVAL':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    case 'SENT_BACK':
      return 'bg-orange-100 hover:bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  }
};

// Workflow status color helper
export const getWorkflowStatusColor = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'INITIATED':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    case 'APPROVED':
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    case 'NOT_INITIATED':
      return 'bg-gray-100 text-gray-500 hover:bg-gray-100';
    default:
      return 'bg-gray-100 text-gray-600 hover:bg-gray-100';
  }
};