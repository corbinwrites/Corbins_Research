import { useEffect, useState } from "react";
import { categoryIcons } from "../../lib/categories";
import { currency } from "../../lib/format";
import { BudgetRecommendationRow, fetchBudgetRecommendations, getBudgetRecommendationPlaceholder } from "../../lib/budget";
import { BudgetTarget, Category, canonicalCategories } from "../../types";

interface BudgetPlannerProps {
  selectedMonthLabel: string;
  actuals: Record<Category, number>;
  targets: Record<Category, number>;
  onSaveTarget: (category: Category, value: number) => Promise<void>;
  onApplyBestMonth: (month: string) => Promise<void>;
  availableMonths: string[];
  aiEnabled: boolean;
}

function BudgetCard({
  category,
  target,
  actual,
  onSaveTarget,
}: {
  category: Category;
  target: number;
  actual: number;
  onSaveTarget: (value: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(target.toString());

  useEffect(() => {
    setDraft(target.toString());
  }, [target]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const parsed = Number(draft);
      if (!Number.isNaN(parsed) && parsed !== target) {
        void onSaveTarget(parsed);
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [draft, onSaveTarget, target]);

  const progress = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const remaining = target - actual;
  const statusClass =
    target === 0 ? "bg-slate-300" : actual <= target * 0.8 ? "bg-emerald-500" : actual <= target ? "bg-amber-400" : "bg-rose-500";

  return (
    <article className="rounded-3xl bg-white p-5 shadow-card dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{categoryIcons[category]}</div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-50">{category}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Actual: {currency.format(actual)}</p>
          </div>
        </div>
        <input
          type="number"
          min="0"
          step="1"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="w-28 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm font-medium outline-none ring-0 focus:border-mint-500 dark:border-slate-700 dark:bg-slate-800"
        />
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${statusClass}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">Target {currency.format(target)}</span>
        <span className={remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
          {remaining >= 0 ? `${currency.format(remaining)} left` : `${currency.format(Math.abs(remaining))} over`}
        </span>
      </div>
    </article>
  );
}

export function BudgetPlanner({
  selectedMonthLabel,
  actuals,
  targets,
  onSaveTarget,
  onApplyBestMonth,
  availableMonths,
  aiEnabled,
}: BudgetPlannerProps) {
  const [bestMonth, setBestMonth] = useState("");
  const [recommendations, setRecommendations] = useState<Array<BudgetRecommendationRow & { delta: number; rationale: string }>>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const recommendationRows: BudgetRecommendationRow[] = canonicalCategories
    .filter((category) => category !== "Income")
    .map((category) => ({
      category,
      actualAverage: actuals[category] ?? 0,
      recommended: actuals[category] ?? 0,
      yourTarget: targets[category] ?? 0,
    }));

  const placeholders = recommendations.length > 0 ? recommendations : getBudgetRecommendationPlaceholder(recommendationRows);
  const totalBudgeted = canonicalCategories.filter((category) => category !== "Income").reduce((sum, category) => sum + (targets[category] ?? 0), 0);
  const totalSpent = canonicalCategories.filter((category) => category !== "Income").reduce((sum, category) => sum + (actuals[category] ?? 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-card dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">Budget Planner</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{selectedMonthLabel}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryMetric label="Total Budgeted" value={currency.format(totalBudgeted)} />
            <SummaryMetric label="Spent This Month" value={currency.format(totalSpent)} />
            <SummaryMetric label="Net Remaining" value={currency.format(totalBudgeted - totalSpent)} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <select
            value={bestMonth}
            onChange={(event) => setBestMonth(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Select best month to copy actuals</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (bestMonth) void onApplyBestMonth(bestMonth);
            }}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Use Best Month
          </button>
          <button
            disabled={!aiEnabled || loadingRecommendations}
            onClick={() => {
              setLoadingRecommendations(true);
              void fetchBudgetRecommendations(recommendationRows).then((rows) => {
                setRecommendations(rows);
                setLoadingRecommendations(false);
              });
            }}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-500 dark:bg-slate-100 dark:text-slate-900 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
            title={aiEnabled ? "Generate Gemini-based budget targets" : "Requires the local Gemini helper to be running."}
          >
            {loadingRecommendations ? "Generating..." : "Generate AI Budget Recommendation"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {canonicalCategories
          .filter((category) => category !== "Income")
          .map((category) => (
            <BudgetCard
              key={category}
              category={category}
              target={targets[category] ?? 0}
              actual={actuals[category] ?? 0}
              onSaveTarget={(value) => onSaveTarget(category, value)}
            />
          ))}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-card dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">AI Recommendation Placeholder</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The app keeps a side-by-side structure ready for future local AI integration.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Actual Avg</th>
                <th className="pb-3 pr-4">Recommended</th>
                <th className="pb-3 pr-4">Your Target</th>
                <th className="pb-3 pr-4">Delta</th>
                <th className="pb-3 pr-4">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {placeholders.map((row) => (
                <tr key={row.category}>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">{row.category}</td>
                  <td className="py-3 pr-4">{currency.format(row.actualAverage)}</td>
                  <td className="py-3 pr-4">{currency.format(row.recommended)}</td>
                  <td className="py-3 pr-4">{currency.format(row.yourTarget)}</td>
                  <td className={`py-3 pr-4 ${row.delta > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{currency.format(row.delta)}</td>
                  <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{row.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
