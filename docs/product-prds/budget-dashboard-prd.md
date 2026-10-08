# Budget Dashboard — Product Requirements Document (v2)

---

## Overview

Build a **local-first personal budgeting dashboard** as a **React + Vite** single-page app. It should run locally via `npm run dev` with no hosted backend required. All budgeting data persists in the browser via **IndexedDB** (via `Dexie.js`). The architecture should be structured so it can be converted into a full hosted app (e.g., Next.js + Supabase) in the future.

The application must remain useful with **AI features disabled**. CSV import, manual categorization, charts, and budget planning are v1-critical. AI should be treated as an optional enhancement layer, not a hard dependency for core workflows.

---

## Tech Stack

- **React + Vite** (TypeScript)
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Dexie.js** for local IndexedDB persistence
- **Anthropic Claude API** (`claude-sonnet-4-20250514`) for AI classification and budget recommendations
- **Papa Parse** for CSV parsing

### AI Security Requirement

Do **not** expose the Anthropic API key to the browser via `VITE_ANTHROPIC_API_KEY` or any other client-bundled env var.

If AI features are implemented, they must go through a **local-only server boundary** such as:

- a small local Node/Express proxy started alongside the app, or
- a local CLI/helper process that the app calls indirectly

The API key must live only in that local server/helper environment. The React app must call a local endpoint or local helper interface, never Anthropic directly from the browser.

If that local server/helper is not implemented in v1, AI features should be visibly disabled with clear UI messaging rather than shipping an insecure browser-side integration.

---

## Design Reference — Mint

Use Mint (the budgeting app) as the primary design reference:

- Left sidebar navigation with iconography per section
- Budget category cards with a progress bar showing actual vs. target spend
- Clean typographic hierarchy — category name, budgeted amount, spent amount, remaining
- Color system: green (under budget), amber (approaching limit), red (over budget)
- Summary header bar showing total budgeted, total spent, and net remaining for the month
- Subtle card-based layout with soft shadows, not harsh borders
- Support **dark mode** via Tailwind's dark class

---

## CSV Ingestion — Empower Format

Empower exports CSVs with these columns:

```
Date, Account, Description, Category, Tags, Amount
```

- `Amount` is negative for expenses, positive for income
- Parse and store raw rows in IndexedDB, tagged with upload date and a derived `month` key (e.g., `"2024-11"`)
- Support **uploading multiple CSVs**
- Deduplicate using at minimum `Date + Account + Description + Amount`
- Also store a stable `transactionHash` derived from those fields
- Treat deduplication as a data integrity mechanism, not as a replacement for upload ownership tracking
- Treat the Empower `Category` column as a suggestion only, not ground truth

### Upload Ownership

Add a separate upload record for each imported CSV. Each stored transaction must track the upload it came from.

- If the same transaction appears in multiple uploads, the app must preserve that shared relationship instead of duplicating rows
- Deleting one upload must remove only that upload record and its relationship to transactions
- A transaction should be deleted only when it is no longer referenced by any remaining upload

---

## AI Classification

On upload, for every transaction:

1. Send `Description`, `Amount`, and Empower `Category` to Claude
2. Claude assigns one canonical category and returns a **confidence score** (0–1)
3. **Auto-apply** classifications with confidence ≥ 0.80
4. **Flag for review** (amber highlight) for confidence < 0.80
5. Store classification source: `"auto"`, `"flagged"`, or `"manual"`

Batch Claude API calls — up to 20 transactions per request.

If AI is unavailable, rate-limited, or returns malformed output:

- the upload must still succeed
- affected transactions must remain uncategorized or keep their prior category state
- the UI must show that AI classification is pending, skipped, or failed

### Canonical Categories

> Fixed list — no free-form categories allowed.

| Category |
|---|
| Housing |
| Groceries |
| Dining Out |
| Transportation |
| Utilities |
| Health & Medical |
| Entertainment |
| Shopping |
| Travel |
| Personal Care |
| Subscriptions |
| Childcare & Education |
| Household Supplies |
| Baby Essentials |
| Gifts & Donations |
| Savings & Investments |
| Income |
| Other |

---

## Manual Reclassification

- Every transaction row has a **category dropdown** using the canonical list
- Changing a category marks it `"manual"` and instantly updates all charts
- A **"Review Flagged"** mode filters to only amber-flagged transactions for easy review
- Manual changes persist immediately to IndexedDB
- Manual changes always override previous AI results for that transaction unless the user changes the category again

---

## Core Views

Accessible via a **left sidebar** (Mint-style), with icons per section.

---

### 1. Monthly Overview

- **Donut chart** — percentage of total spend per category for selected month
- **Bar chart** — absolute spend per category
- Month selector at the top
- Summary header: Total Spend, Total Income, Net Savings, # Flagged Transactions
- Clicking a category highlights its transactions in a table below
- Expense charts should exclude `Income` from category-spend visualizations unless explicitly stated otherwise

---

### 2. Multi-Month Comparison

- **Stacked bar chart** — months on X-axis, spend per category stacked on Y
- **Line overlay** — total monthly spend trend
- Toggle: dollar amounts vs. percentages
- Category include/exclude toggles
- Income should remain separate from stacked expense totals by default

---

### 3. Budget Planner

This is the most important view. It combines three sub-features.

#### 3a — Budget Targets (manual input)

- Display all canonical categories as **Mint-style budget cards**
- Each card shows:
  - Category name + icon
  - **Editable budget target field** — user types in a dollar amount (e.g., `$500`)
  - Actual spend for the selected month
  - Progress bar: actual vs. target (green / amber / red)
  - Dollar amount remaining or over
- Budget targets **persist in IndexedDB** per category — they are not month-specific (they represent the household's standing monthly budget)
- A **summary header** at the top shows: Total Budgeted, Total Spent This Month, Net Remaining
- User can edit any category target inline at any time and it saves automatically (debounced)
- `Income` should not behave like a normal spending budget card unless explicitly included as a non-spend summary row

#### 3b — "Best Month" Selector

- Dropdown to select any uploaded month as a budget model
- Populates the budget target fields with that month's actuals as a starting point
- User can then adjust from there

#### 3c — AI Budget Recommendation

- Button: **"Generate AI Budget Recommendation"**
- Sends 3–6 months of category spend averages to Claude
- Claude returns a recommended monthly budget per category + 1–2 sentence rationale
- Side-by-side comparison table: Actual Avg | Recommended | Your Target | Delta
- Delta shown as colored variance (green = under, red = over)

---

## Transaction Table

Shared across views.

| Column | Details |
|---|---|
| Date | `MMM D, YYYY` |
| Description | Raw from CSV |
| Account | From CSV |
| Amount | Red for expense, green for income |
| Category | Dropdown (canonical list) |
| Confidence | `Auto ✓` / `⚠ Review` / `Manual ✏️` |

- Sortable by Date, Amount, Category
- Searchable by description
- Paginated (25 per page)
- Shared transaction state must update every dependent view without reload

---

## Data Management

- Drag-and-drop or browse CSV upload
- Uploaded files list with: upload date, month range, transaction count
- Delete a file (removes its transactions from DB)
- Export reclassified transactions as CSV

### Date and Month Handling

- Parse dates consistently in local time
- Derive `month` in `YYYY-MM` format from the parsed local date
- Do not let timezone conversion shift a transaction into an adjacent day or month

---

## File Structure

```
src/
  components/
    charts/             # Recharts wrappers
    transactions/       # Table, row, category dropdown
    budget/             # Budget cards, progress bars, AI recommendation panel
  views/
    Overview.tsx
    Comparison.tsx
    BudgetPlanner.tsx
    Upload.tsx
  lib/
    db.ts               # Dexie schema (transactions + budgetTargets tables)
    classify.ts         # Claude classification calls
    budget.ts           # Claude budget recommendation calls
    csvParser.ts        # Papa Parse + Empower column mapping
  types/
    index.ts            # Transaction, Category, BudgetTarget types
```

### Dexie Schema

Three tables required:

- **`transactions`** — all uploaded + classified rows
- **`uploads`** — metadata for each imported file
- **`budgetTargets`** — `{ category: string, targetAmount: number }` — one row per category, persisted across sessions

Minimum `transactions` fields:

- `id`
- `transactionHash`
- `date`
- `month`
- `account`
- `description`
- `amount`
- `empowerCategory`
- `canonicalCategory`
- `classificationSource`
- `classificationConfidence`
- `aiStatus`
- `createdAt`
- `updatedAt`

Minimum `uploads` fields:

- `id`
- `fileName`
- `uploadedAt`
- `monthRange`
- `transactionCount`

Also include a join/ownership mechanism so transactions can belong to one or more uploads. This can be a separate table or an equivalent normalized representation, but deletion behavior must remain correct.

---

## Build Order

Tell the agent to follow this sequence:

1. CSV upload + Empower parsing + transaction table
2. IndexedDB schema (`transactions` + `budgetTargets`)
3. Manual category reclassification (dropdowns, save to DB)
4. Monthly Overview charts (donut + bar)
5. Multi-Month Comparison chart
6. Budget Planner cards with editable targets + progress bars
7. AI classification on upload (batched Claude calls)
8. "Best Month" selector
9. AI Budget Recommendation
10. Polish: dark mode, empty states, loading skeletons, Mint-style design

---

## Out of Scope for v1

- User authentication
- Multi-user / shared access
- Hosting / deployment
- Bank sync (Plaid, etc.)
- Mobile layout

---

## Acceptance Criteria

1. A user can upload one Empower CSV and see transactions persisted after refresh.
2. A user can upload overlapping CSVs without duplicated transaction rows.
3. Deleting one uploaded CSV removes only that upload’s ownership records and deletes transactions only when no uploads still reference them.
4. A user can manually reclassify any transaction and see all charts and budget views update immediately.
5. Monthly Overview and Multi-Month Comparison exclude income from expense-spend charts by default.
6. Budget Planner stores targets persistently and recalculates summary totals without reload.
7. The app works fully for non-AI workflows with no API key configured.
8. If AI is enabled, the API key is not exposed in the browser bundle.
9. If AI classification fails, upload still succeeds and affected transactions remain reviewable.
10. The implementation remains compatible with a future migration to a hosted architecture.

---

## Agent Notes

> **Important:** Do not wire Anthropic directly into the Vite client with `VITE_ANTHROPIC_API_KEY`. If AI is included, set up a local-only server/helper boundary first. If that is deferred, ship the non-AI budgeting workflow as the secure v1 baseline.
