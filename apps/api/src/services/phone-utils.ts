export function normalizePhone(value: string, defaultCountryCode: string | null = "994") {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (defaultCountryCode && digits.length === 10 && digits.startsWith("0")) {
    digits = `${defaultCountryCode}${digits.slice(1)}`;
  }
  if (defaultCountryCode && digits.length === 9) digits = `${defaultCountryCode}${digits}`;
  return digits;
}
