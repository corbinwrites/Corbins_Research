import { Category } from "../types";

export interface BudgetRecommendationRow {
  category: Category;
  actualAverage: number;
  recommended: number;
  yourTarget: number;
}

export function getBudgetRecommendationPlaceholder(rows: BudgetRecommendationRow[]) {
  return rows.map((row) => ({
    ...row,
    delta: row.recommended - row.yourTarget,
    rationale: "AI recommendations are disabled in this secure local-first build.",
  }));
}

export async function fetchBudgetRecommendations(rows: BudgetRecommendationRow[]) {
  try {
    const response = await fetch("http://localhost:4317/api/budget-recommendation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    if (!response.ok) {
      return getBudgetRecommendationPlaceholder(rows);
    }
    const payload = (await response.json()) as {
      recommendations?: Array<BudgetRecommendationRow & { delta: number; rationale: string }>;
    };
    return payload.recommendations && payload.recommendations.length === rows.length
      ? payload.recommendations
      : getBudgetRecommendationPlaceholder(rows);
  } catch {
    return getBudgetRecommendationPlaceholder(rows);
  }
}
