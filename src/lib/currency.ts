/**
 * Currency and date formatting utilities for Indian locale
 */

import { formatInTimeZone } from 'date-fns-tz';

// Indian timezone
export const INDIAN_TIMEZONE = 'Asia/Kolkata';

/**
 * Format amount in Indian Rupees
 */
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};

/**
 * Format date in Indian timezone
 */
export const formatDateIST = (date: Date | string, format: string = 'PPP'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, INDIAN_TIMEZONE, format);
};

/**
 * Get current date in Indian timezone
 */
export const getCurrentDateIST = (): Date => {
  return new Date(new Date().toLocaleString("en-US", {timeZone: INDIAN_TIMEZONE}));
};

/**
 * Format date to yyyy-MM-dd in IST
 */
export const formatDateStringIST = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(dateObj, INDIAN_TIMEZONE, 'yyyy-MM-dd');
};