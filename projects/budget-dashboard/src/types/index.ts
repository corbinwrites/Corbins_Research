export const canonicalCategories = [
  "Housing",
  "Groceries",
  "Dining Out",
  "Transportation",
  "Utilities",
  "Health & Medical",
  "Entertainment",
  "Shopping",
  "Travel",
  "Personal Care",
  "Subscriptions",
  "Childcare & Education",
  "Household Supplies",
  "Baby Essentials",
  "Gifts & Donations",
  "Savings & Investments",
  "Income",
  "Other",
] as const;

export type Category = (typeof canonicalCategories)[number];

export type ClassificationSource = "auto" | "flagged" | "manual" | "uncategorized";
export type AiStatus = "disabled" | "pending" | "classified" | "failed" | "skipped";

export interface Transaction {
  id: string;
  transactionHash: string;
  date: string;
  month: string;
  account: string;
  description: string;
  amount: number;
  empowerCategory: string;
  canonicalCategory: Category;
  classificationSource: ClassificationSource;
  classificationConfidence: number | null;
  aiStatus: AiStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UploadRecord {
  id: string;
  fileName: string;
  uploadedAt: string;
  monthRange: string;
  transactionCount: number;
}

export interface UploadTransactionLink {
  id: string;
  uploadId: string;
  transactionId: string;
}

export interface BudgetTarget {
  category: Category;
  targetAmount: number;
}

export interface CsvTransactionRow {
  Date: string;
  Account: string;
  Description: string;
  Category: string;
  Tags: string;
  Amount: string;
}

export interface ParsedCsvTransaction {
  date: string;
  month: string;
  account: string;
  description: string;
  amount: number;
  empowerCategory: string;
}

export interface TransactionClassification {
  canonicalCategory: Category;
  confidence: number | null;
  classificationSource: ClassificationSource;
  aiStatus: AiStatus;
}
