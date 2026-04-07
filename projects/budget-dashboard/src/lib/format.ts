export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const fullCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatMonthLabel(month: string): string {
  const [year, rawMonth] = month.split("-");
  const date = new Date(Number(year), Number(rawMonth) - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function amountClass(amount: number): string {
  if (amount > 0) return "text-emerald-600 dark:text-emerald-400";
  if (amount < 0) return "text-rose-600 dark:text-rose-400";
  return "text-slate-600 dark:text-slate-300";
}
