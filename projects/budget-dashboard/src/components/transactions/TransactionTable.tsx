import { useDeferredValue, useMemo, useState } from "react";
import { amountClass, dateFormatter, fullCurrency } from "../../lib/format";
import { Category, Transaction, canonicalCategories } from "../../types";

interface TransactionTableProps {
  transactions: Transaction[];
  selectedCategory: Category | null;
  reviewOnly: boolean;
  onSelectedCategoryChange: (category: Category | null) => void;
  onReviewOnlyChange: (value: boolean) => void;
  onCategoryChange: (transactionId: string, category: Category) => Promise<void>;
}

type SortKey = "date" | "amount" | "category";

export function TransactionTable({
  transactions,
  selectedCategory,
  reviewOnly,
  onSelectedCategoryChange,
  onReviewOnlyChange,
  onCategoryChange,
}: TransactionTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const rows = transactions.filter((transaction) => {
      if (selectedCategory && transaction.canonicalCategory !== selectedCategory) return false;
      if (reviewOnly && transaction.classificationSource !== "flagged") return false;
      if (!query) return true;
      return transaction.description.toLowerCase().includes(query) || transaction.account.toLowerCase().includes(query);
    });

    rows.sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "date") return (new Date(left.date).getTime() - new Date(right.date).getTime()) * direction;
      if (sortKey === "amount") return (left.amount - right.amount) * direction;
      return left.canonicalCategory.localeCompare(right.canonicalCategory) * direction;
    });
    return rows;
  }, [deferredSearch, reviewOnly, selectedCategory, sortDirection, sortKey, transactions]);

  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-card dark:bg-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Transactions</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Shared across views. Reclassification updates charts immediately.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search description or account"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            onClick={() => onReviewOnlyChange(!reviewOnly)}
            className={`rounded-2xl px-4 py-3 text-sm font-medium ${reviewOnly ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
          >
            {reviewOnly ? "Showing flagged only" : "Review flagged"}
          </button>
          {selectedCategory ? (
            <button onClick={() => onSelectedCategoryChange(null)} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Clear category filter
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
              <SortableHeader label="Date" onClick={() => toggleSort("date")} />
              <th className="pb-3 pr-4">Description</th>
              <th className="pb-3 pr-4">Account</th>
              <SortableHeader label="Amount" onClick={() => toggleSort("amount")} />
              <SortableHeader label="Category" onClick={() => toggleSort("category")} />
              <th className="pb-3 pr-4">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageRows.map((transaction) => (
              <tr key={transaction.id}>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{dateFormatter.format(new Date(transaction.date))}</td>
                <td className="py-3 pr-4 text-slate-900 dark:text-slate-100">{transaction.description}</td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{transaction.account}</td>
                <td className={`py-3 pr-4 font-medium ${amountClass(transaction.amount)}`}>{fullCurrency.format(transaction.amount)}</td>
                <td className="py-3 pr-4">
                  <select
                    value={transaction.canonicalCategory}
                    onChange={(event) => void onCategoryChange(transaction.id, event.target.value as Category)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {canonicalCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 pr-4">
                  {transaction.classificationSource === "manual" ? "Manual ✏️" : transaction.classificationSource === "flagged" ? "⚠ Review" : transaction.classificationSource === "auto" ? "Auto ✓" : "Needs review"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          {filtered.length} transactions · page {page} of {pageCount}
        </span>
        <div className="flex items-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full bg-slate-100 px-3 py-2 disabled:opacity-50 dark:bg-slate-800">
            Prev
          </button>
          <button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-full bg-slate-100 px-3 py-2 disabled:opacity-50 dark:bg-slate-800">
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function SortableHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="pb-3 pr-4">
      <button onClick={onClick} className="font-medium">
        {label}
      </button>
    </th>
  );
}
