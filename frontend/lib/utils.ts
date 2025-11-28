import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as +91-XXXXX-XXXXX
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+91-${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  if (cleaned.length === 10) {
    return `+91-${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }

  return phone;
}

/**
 * Format currency (GBP)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

/**
 * Format date only
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(d);
}

/**
 * Format time only
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    timeStyle: 'short',
  }).format(d);
}

/**
 * Get relative time (e.g., "5 minutes ago")
 */
export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

/**
 * Get order status display text
 */
export function getOrderStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: 'Pending',
    SEARCHING_DRIVER: 'Searching for Driver',
    DRIVER_ASSIGNED: 'Driver Assigned',
    DRIVER_ARRIVED: 'Driver Arrived',
    PICKED_UP: 'Picked Up',
    IN_TRANSIT: 'In Transit',
    REACHED_DESTINATION: 'Reached Destination',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
  };

  return statusMap[status] || status;
}

/**
 * Get order status color
 */
export function getOrderStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    PENDING: 'status-pending',
    SEARCHING_DRIVER: 'status-searching',
    DRIVER_ASSIGNED: 'status-assigned',
    DRIVER_ARRIVED: 'status-assigned',
    PICKED_UP: 'status-in-transit',
    IN_TRANSIT: 'status-in-transit',
    REACHED_DESTINATION: 'status-in-transit',
    DELIVERED: 'status-delivered',
    CANCELLED: 'status-cancelled',
  };

  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Validate OTP
 */
export function isValidOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

/**
 * Generate order number display
 */
export function formatOrderNumber(orderNumber: string): string {
  if (orderNumber.length <= 8) return orderNumber;
  return `${orderNumber.slice(0, 4)}-${orderNumber.slice(4, 8)}-${orderNumber.slice(8)}`;
}

/**
 * Get package size display text
 */
export function getPackageSizeText(size: string): string {
  const sizeMap: Record<string, string> = {
    SMALL: 'Small (< 5kg)',
    MEDIUM: 'Medium (5-15kg)',
    LARGE: 'Large (15-30kg)',
  };

  return sizeMap[size] || size;
}

/**
 * Get delivery type display text
 */
export function getDeliveryTypeText(type: string): string {
  const typeMap: Record<string, string> = {
    URGENT: 'Urgent (2 hours)',
    SCHEDULED: 'Scheduled',
  };

  return typeMap[type] || type;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * Get greeting based on time
 */
export function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
