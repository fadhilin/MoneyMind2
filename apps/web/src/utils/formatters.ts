/**
 * Formats a raw numeric string or number into Indonesian Rupiah format with dots as thousand separators.
 * Example: "1000000" -> "1.000.000"
 */
export const formatCurrencyInput = (val: string | number): string => {
  if (!val && val !== 0) return "";
  const numeric = typeof val === "string" ? val.replace(/[^0-9]/g, "") : val.toString();
  if (!numeric) return "";
  return Number(numeric).toLocaleString("id-ID");
};

/**
 * Parses a formatted currency string back into a raw numeric string.
 * Example: "1.000.000" -> "1000000"
 */
export const parseCurrencyInput = (val: string): string => {
  return val.replace(/[^0-9]/g, "");
};
