import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Sidebar, ViewId } from "./components/layout/Sidebar";
import { AiSetupPanel } from "./components/layout/AiSetupPanel";
import { OverviewCharts } from "./components/charts/OverviewCharts";
import { ComparisonChart, ComparisonDatum } from "./components/charts/ComparisonChart";
import { BudgetPlanner } from "./components/budget/BudgetPlanner";
import { TransactionTable } from "./components/transactions/TransactionTable";
import { UploadView } from "./views/UploadView";
import { db, deleteUpload, ensureBudgetTargets, importTransactions, updateTransactionCategory, upsertBudgetTarget } from "./lib/db";
import { parseEmpowerCsv } from "./lib/csvParser";
import { amountClass, currency, formatMonthLabel } from "./lib/format";
import { classifyTransactions, getAiFeatureStatus } from "./lib/classify";
import { Category, Transaction, canonicalCategories } from "./types";

function buildCategoryActuals(transactions: Transaction[]) {
  const totals = Object.fromEntries(canonicalCategories.map((category) => [category, 0])) as Record<Category, number>;
  for (const transaction of transactions) {
    if (transaction.amount < 0) {
      totals[transaction.canonicalCategory] += Math.abs(transaction.amount);
    }
  }
  return totals;
}

function App() {
  const [currentView, setCurrentView] = useState<ViewId>("overview");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [comparisonMode, setComparisonMode] = useState<"dollars" | "percentages">("dollars");
  const [enabledComparisonCategories, setEnabledComparisonCategories] = useState<Category[]>(canonicalCategories.filter((category) => category !== "Income"));
  const [aiState, setAiState] = useState<{ enabled: boolean; reason?: string; model?: string }>({
    enabled: false,
    reason: "Checking Gemini helper status...",
  });

  const transactions = useLiveQuery(() => db.transactions.orderBy("date").reverse().toArray(), [], []) ?? [];
  const uploads = useLiveQuery(() => db.uploads.orderBy("uploadedAt").reverse().toArray(), [], []) ?? [];
  const budgetTargets = useLiveQuery(() => db.budgetTargets.toArray(), [], []) ?? [];

  useEffect(() => {
    void ensureBudgetTargets();
  }, []);

  useEffect(() => {
    void getAiFeatureStatus().then(setAiState);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const availableMonths = useMemo(() => [...new Set(transactions.map((transaction) => transaction.month))].sort().reverse(), [transactions]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.month === selectedMonth),
    [selectedMonth, transactions],
  );

  const monthActuals = useMemo(() => buildCategoryActuals(monthTransactions), [monthTransactions]);
  const targetMap = useMemo(
    () => Object.fromEntries(budgetTargets.map((target) => [target.category, target.targetAmount])) as Record<Category, number>,
    [budgetTargets],
  );

  const overviewData = useMemo(
    () =>
      canonicalCategories
        .filter((category) => category !== "Income")
        .map((category) => ({ category, amount: monthActuals[category] }))
        .filter((entry) => entry.amount > 0),
    [monthActuals],
  );

  const totals = useMemo(() => {
    const totalSpend = monthTransactions.filter((transaction) => transaction.amount < 0).reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const totalIncome = monthTransactions.filter((transaction) => transaction.amount > 0).reduce((sum, transaction) => sum + transaction.amount, 0);
    const flaggedCount = monthTransactions.filter((transaction) => transaction.classificationSource === "flagged").length;
    return {
      totalSpend,
      totalIncome,
      netSavings: totalIncome - totalSpend,
      flaggedCount,
    };
  }, [monthTransactions]);

  const comparisonData = useMemo<ComparisonDatum[]>(() => {
    return availableMonths
      .slice()
      .reverse()
      .map((month) => {
        const rows = transactions.filter((transaction) => transaction.month === month && transaction.amount < 0);
        const total = rows.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
        const base: ComparisonDatum = { month, total };
        for (const category of enabledComparisonCategories) {
          const spend = rows
            .filter((transaction) => transaction.canonicalCategory === category)
            .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
          base[category] = comparisonMode === "percentages" && total > 0 ? (spend / total) * 100 : spend;
        }
        return base;
      });
  }, [availableMonths, comparisonMode, enabledComparisonCategories, transactions]);

  const handleUpload = async (file: File) => {
    console.log("handleUpload started for file:", file.name);
    try {
      console.log("Parsing CSV...");
      const rows = await parseEmpowerCsv(file);
      console.log("Parsed rows:", rows.length);
      
      console.log("AI state:", aiState.enabled);
      const classifications = aiState.enabled ? await classifyTransactions(rows) : undefined;
      console.log("Classifications:", classifications?.length || "none");
      
      console.log("Importing transactions...");
      await importTransactions(file, rows, classifications);
      console.log("Transactions imported");
      
      if (rows.length > 0) {
        setSelectedMonth((current) => current || rows[0].month);
      }
      
      const refreshedAi = await getAiFeatureStatus();
      setAiState(refreshedAi);
      console.log("Upload completed successfully");
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  };

  const handleApplyBestMonth = async (month: string) => {
    const monthRows = transactions.filter((transaction) => transaction.month === month && transaction.amount < 0);
    const actuals = buildCategoryActuals(monthRows);
    await Promise.all(
      canonicalCategories
        .filter((category) => category !== "Income")
        .map((category) => upsertBudgetTarget(category, Math.round(actuals[category] ?? 0))),
    );
  };

  const selectedMonthLabel = selectedMonth ? formatMonthLabel(selectedMonth) : "No month selected";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(38,162,105,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef4f2_100%)] px-4 py-6 text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(38,162,105,0.18),_transparent_26%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] dark:text-slate-100 lg:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 lg:flex-row">
        <Sidebar
          currentView={currentView}
          onChange={setCurrentView}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((current) => !current)}
          aiEnabled={aiState.enabled}
          aiLabel={aiState.enabled ? `Gemini helper connected${aiState.model ? ` (${aiState.model})` : ""}.` : aiState.reason ?? "Gemini helper unavailable."}
        />

        <main className="flex-1 space-y-6">
          <AiSetupPanel enabled={aiState.enabled} model={aiState.model} reason={aiState.reason} />

          <section className="rounded-3xl bg-white/90 p-6 shadow-card ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Summary</div>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">{selectedMonthLabel}</h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  {availableMonths.length === 0 ? <option value="">No months loaded</option> : null}
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(month)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryTile label="Total Spend" value={currency.format(totals.totalSpend)} tone="spend" />
              <SummaryTile label="Total Income" value={currency.format(totals.totalIncome)} tone="income" />
              <SummaryTile label="Net Savings" value={currency.format(totals.netSavings)} tone={totals.netSavings >= 0 ? "income" : "spend"} />
              <SummaryTile label="Flagged Transactions" value={String(totals.flaggedCount)} tone="neutral" />
            </div>
          </section>

          {currentView === "overview" ? (
            <>
              <OverviewCharts data={overviewData} />
              <div className="rounded-3xl bg-white p-4 shadow-card dark:bg-slate-900">
                <div className="flex flex-wrap gap-2">
                  {overviewData.map((entry) => (
                    <button
                      key={entry.category}
                      onClick={() => setSelectedCategory(entry.category as Category)}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${selectedCategory === entry.category ? "bg-mint-100 text-mint-700 dark:bg-slate-800 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
                    >
                      {entry.category}
                    </button>
                  ))}
                </div>
              </div>
              <TransactionTable
                transactions={monthTransactions}
                selectedCategory={selectedCategory}
                reviewOnly={reviewOnly}
                onSelectedCategoryChange={setSelectedCategory}
                onReviewOnlyChange={setReviewOnly}
                onCategoryChange={updateTransactionCategory}
              />
            </>
          ) : null}

          {currentView === "comparison" ? (
            <>
              <section className="rounded-3xl bg-white p-6 shadow-card dark:bg-slate-900">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Comparison Controls</h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Income stays out of stacked expense charts by default.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setComparisonMode("dollars")} className={`rounded-full px-4 py-2 text-sm ${comparisonMode === "dollars" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800"}`}>Dollars</button>
                    <button onClick={() => setComparisonMode("percentages")} className={`rounded-full px-4 py-2 text-sm ${comparisonMode === "percentages" ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800"}`}>Percentages</button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canonicalCategories
                    .filter((category) => category !== "Income")
                    .map((category) => {
                      const active = enabledComparisonCategories.includes(category);
                      return (
                        <button
                          key={category}
                          onClick={() =>
                            setEnabledComparisonCategories((current) =>
                              active ? current.filter((entry) => entry !== category) : [...current, category],
                            )
                          }
                          className={`rounded-full px-4 py-2 text-sm ${active ? "bg-mint-100 text-mint-700 dark:bg-slate-800 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                        >
                          {category}
                        </button>
                      );
                    })}
                </div>
              </section>
              <ComparisonChart data={comparisonData} categories={enabledComparisonCategories} showPercentages={comparisonMode === "percentages"} />
              <TransactionTable
                transactions={transactions}
                selectedCategory={selectedCategory}
                reviewOnly={reviewOnly}
                onSelectedCategoryChange={setSelectedCategory}
                onReviewOnlyChange={setReviewOnly}
                onCategoryChange={updateTransactionCategory}
              />
            </>
          ) : null}

          {currentView === "budget" ? (
            <>
              <BudgetPlanner
                selectedMonthLabel={selectedMonthLabel}
                actuals={monthActuals}
                targets={targetMap}
                onSaveTarget={(category, value) => upsertBudgetTarget(category, value)}
                onApplyBestMonth={handleApplyBestMonth}
                availableMonths={availableMonths}
                aiEnabled={aiState.enabled}
              />
              <TransactionTable
                transactions={monthTransactions}
                selectedCategory={selectedCategory}
                reviewOnly={reviewOnly}
                onSelectedCategoryChange={setSelectedCategory}
                onReviewOnlyChange={setReviewOnly}
                onCategoryChange={updateTransactionCategory}
              />
            </>
          ) : null}

          {currentView === "upload" ? (
            <UploadView
              uploads={uploads}
              transactions={transactions}
              onUpload={handleUpload}
              onDeleteUpload={deleteUpload}
              aiEnabled={aiState.enabled}
              aiLabel={aiState.enabled ? `Gemini helper connected${aiState.model ? ` (${aiState.model})` : ""}. Uploads will batch-classify transactions.` : aiState.reason ?? "Gemini helper unavailable."}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: "income" | "spend" | "neutral" }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-5 py-4 dark:bg-slate-800">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${tone === "income" ? "text-emerald-600 dark:text-emerald-400" : tone === "spend" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100"}`}>{value}</div>
    </div>
  );
}

export default App;
