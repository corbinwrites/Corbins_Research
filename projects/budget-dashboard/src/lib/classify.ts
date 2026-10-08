import { Category, ParsedCsvTransaction, TransactionClassification, canonicalCategories } from "../types";
import { fallbackCategoryFromEmpower } from "./categories";

const AI_BASE_URL = "http://localhost:4317";

function fallbackClassification(row: ParsedCsvTransaction): TransactionClassification {
  return {
    canonicalCategory: fallbackCategoryFromEmpower(row.empowerCategory),
    confidence: null,
    classificationSource: "uncategorized",
    aiStatus: "disabled",
  };
}

function isCategory(value: string): value is Category {
  return canonicalCategories.includes(value as Category);
}

export async function getAiFeatureStatus() {
  // Temporarily disabled to isolate upload issues
  return {
    enabled: false,
    reason: "AI temporarily disabled for testing.",
  };
  
  // Original code - uncomment when AI is ready
  /*
  try {
    const response = await fetch(`${AI_BASE_URL}/api/health`);
    if (!response.ok) throw new Error("AI helper unavailable");
    return (await response.json()) as { enabled: boolean; model?: string; reason?: string };
  } catch {
    return {
      enabled: false,
      reason: "Gemini helper not running. Start it locally and set GEMINI_API_KEY to enable AI.",
    };
  }
  */
}

export async function classifyTransactions(rows: ParsedCsvTransaction[]): Promise<TransactionClassification[]> {
  const fallback = rows.map(fallbackClassification);
  try {
    const response = await fetch(`${AI_BASE_URL}/api/classify-transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: rows }),
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as {
      results?: Array<{ canonicalCategory: string; confidence: number | null; classificationSource: string; aiStatus: string }>;
    };

    if (!payload.results || payload.results.length !== rows.length) {
      return fallback;
    }

    return payload.results.map((result, index) => ({
      canonicalCategory: isCategory(result.canonicalCategory) ? result.canonicalCategory : fallback[index].canonicalCategory,
      confidence: typeof result.confidence === "number" ? result.confidence : null,
      classificationSource:
        result.classificationSource === "auto" || result.classificationSource === "flagged" || result.classificationSource === "manual"
          ? result.classificationSource
          : fallback[index].classificationSource,
      aiStatus:
        result.aiStatus === "classified" || result.aiStatus === "failed" || result.aiStatus === "pending" || result.aiStatus === "skipped" || result.aiStatus === "disabled"
          ? result.aiStatus
          : fallback[index].aiStatus,
    }));
  } catch {
    return fallback;
  }
}
