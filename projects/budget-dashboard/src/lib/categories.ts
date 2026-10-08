import { Category } from "../types";

export const categoryIcons: Record<Category, string> = {
  Housing: "🏠",
  Groceries: "🛒",
  "Dining Out": "🍽️",
  Transportation: "🚗",
  Utilities: "💡",
  "Health & Medical": "🩺",
  Entertainment: "🎬",
  Shopping: "🛍️",
  Travel: "✈️",
  "Personal Care": "🧴",
  Subscriptions: "🔁",
  "Childcare & Education": "📚",
  "Household Supplies": "🧽",
  "Baby Essentials": "🍼",
  "Gifts & Donations": "🎁",
  "Savings & Investments": "📈",
  Income: "💵",
  Other: "📦",
};

export function fallbackCategoryFromEmpower(value: string): Category {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "Other";
  if (normalized.includes("income") || normalized.includes("paycheck")) return "Income";
  if (normalized.includes("grocer")) return "Groceries";
  if (normalized.includes("restaurant") || normalized.includes("dining") || normalized.includes("coffee")) return "Dining Out";
  if (normalized.includes("rent") || normalized.includes("mortgage")) return "Housing";
  if (normalized.includes("utility") || normalized.includes("electric") || normalized.includes("gas bill")) return "Utilities";
  if (normalized.includes("travel") || normalized.includes("hotel") || normalized.includes("air")) return "Travel";
  return "Other";
}
