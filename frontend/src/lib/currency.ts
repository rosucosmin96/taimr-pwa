// Currency utility functions

// Supported currencies
export const SUPPORTED_CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  CAD: 'CAD',
  AUD: 'AUD',
  RON: 'RON',
} as const;

export type SupportedCurrency = keyof typeof SUPPORTED_CURRENCIES;

// Currency symbols for display (not used in main formatting)
export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  RON: 'RON',
};

// Currency labels for dropdowns
export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  USD: 'USD - US Dollar',
  EUR: 'EUR - Euro',
  GBP: 'GBP - British Pound',
  CAD: 'CAD - Canadian Dollar',
  AUD: 'AUD - Australian Dollar',
  RON: 'RON - Romanian Leu',
};

/**
 * Get the currency symbol for a given currency code (for legacy compatibility)
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @returns The currency symbol or the currency code if no symbol is defined
 */
export const getCurrencySymbol = (currency: string): string => {
  return CURRENCY_SYMBOLS[currency as SupportedCurrency] || currency;
};

/**
 * Format a number as currency with the specified currency code
 * Format: <number> <currency> (e.g., "1,234.56 USD")
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string,
  decimals: number = 2
): string => {
  // Format the number with appropriate decimal places
  const formattedAmount = amount.toFixed(decimals);

  // Add thousand separators
  const parts = formattedAmount.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedNumber = parts.join('.');

  // Return in format: <number> <currency>
  return `${formattedNumber} ${currency}`;
};

/**
 * Format a number as currency with symbol (for legacy compatibility)
 * Format: <symbol><number> (e.g., "$1,234.56")
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string with symbol
 */
export const formatCurrencyWithSymbol = (
  amount: number,
  currency: string,
  decimals: number = 2
): string => {
  const symbol = getCurrencySymbol(currency);
  const formattedAmount = amount.toFixed(decimals);

  // Add thousand separators
  const parts = formattedAmount.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formattedNumber = parts.join('.');

  return `${symbol}${formattedNumber}`;
};

/**
 * Validate if a currency code is supported
 * @param currency - The currency code to validate
 * @returns True if the currency is supported
 */
export const isValidCurrency = (currency: string): currency is SupportedCurrency => {
  return Object.keys(SUPPORTED_CURRENCIES).includes(currency);
};

/**
 * Get all supported currencies as an array for dropdowns
 * @returns Array of currency objects with value and label
 */
export const getSupportedCurrencies = () => {
  return Object.entries(CURRENCY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
};

/**
 * Default currency fallback
 */
export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

// Custom hook for currency formatting with profile context
import { useProfile } from '../contexts/ProfileContext';

/**
 * Hook to format currency using the current user's profile currency
 * @returns Object with formatting functions that use the user's currency
 */
export const useCurrency = () => {
  const { profile } = useProfile();
  const userCurrency = profile?.currency || DEFAULT_CURRENCY;

  return {
    currency: userCurrency,
    format: (amount: number, decimals: number = 2) =>
      formatCurrency(amount, userCurrency, decimals),
    // Legacy function for backward compatibility
    formatWithSymbol: (amount: number, decimals: number = 2) =>
      formatCurrencyWithSymbol(amount, userCurrency, decimals),
    symbol: getCurrencySymbol(userCurrency),
  };
};
