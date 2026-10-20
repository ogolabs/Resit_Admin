export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  NGN: "₦",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "AU$",
  GHS: "GH₵",
  KES: "KSh",
  ZAR: "R",
  INR: "₹",
  JPY: "¥",
  AED: "AED ",
  BRL: "R$",
  CNY: "¥",
};

/**
 * Returns the authentic symbol for any currency code (fallback to USD $).
 */
export function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return "$";
  const upper = currency.trim().toUpperCase();
  return CURRENCY_SYMBOLS[upper] || `${upper} `;
}

/**
 * Formats a monetary amount using the authentic symbol for the specified currency.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency?: string | null,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || 0)) || 0;
  const symbol = getCurrencySymbol(currency);
  const minDigits = options?.minimumFractionDigits ?? 0;
  const maxDigits = options?.maximumFractionDigits ?? 2;
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  });
  return `${symbol}${formatted}`;
}

/**
 * Standard benchmark FX rates against 1 USD for global reporting.
 */
export const FX_FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  NGN: 1370,
  EUR: 0.92,
  GBP: 0.79,
  GHS: 15.5,
  KES: 130,
  ZAR: 18.2,
  CAD: 1.36,
  AUD: 1.52,
  INR: 83.5,
  JPY: 155,
  AED: 3.67,
  BRL: 5.4,
  CNY: 7.25,
};

/**
 * Converts a localized amount into its USD normalized value.
 */
export function convertToUsd(amount: number, currency?: string | null): number {
  if (!amount || isNaN(amount)) return 0;
  if (!currency || currency.trim().toUpperCase() === "USD") return amount;
  const upper = currency.trim().toUpperCase();
  const rate = FX_FALLBACK_RATES[upper] || 1.0;
  return amount / rate;
}

/**
 * Converts a USD amount into its NGN normalized equivalent value.
 */
export function convertUsdToNgn(usdAmount: number): number {
  if (!usdAmount || isNaN(usdAmount)) return 0;
  return usdAmount * (FX_FALLBACK_RATES.NGN || 1370);
}
