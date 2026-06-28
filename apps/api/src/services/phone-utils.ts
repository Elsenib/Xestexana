export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0")) digits = `994${digits.slice(1)}`;
  if (digits.length === 9) digits = `994${digits}`;
  return digits;
}
