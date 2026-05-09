// src/utils/formatters.js

/**
 * eBPLS Native Formatters
 * Uses built-in Intl APIs for performance and zero-dependency footprint.
 */

/**
 * Formats a numeric value to PHP currency (e.g., ₱1,250.00).
 * 
 * @param {number|string} amount 
 * @returns {string} Formatted currency string
 */
export const formatPHP = (amount) => {
  const parsedAmount = parseFloat(amount);
  
  if (isNaN(parsedAmount)) {
    return '₱0.00';
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsedAmount);
};

/**
 * Formats a standard date (e.g., Jan 1, 2025).
 * 
 * @param {string|Date} dateInput 
 * @param {Intl.DateTimeFormatOptions} options 
 * @returns {string} Formatted date string
 */
export const formatDate = (dateInput, options = { dateStyle: 'medium' }) => {
  if (!dateInput) return 'N/A';
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid Date';

  return new Intl.DateTimeFormat('en-PH', options).format(date);
};

/**
 * Formats a date with time (e.g., Jan 1, 2025, 10:30 AM).
 * 
 * @param {string|Date} dateInput 
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (dateInput) => {
  return formatDate(dateInput, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};