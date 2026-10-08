import Dexie, { Table } from "dexie";
import { fallbackCategoryFromEmpower } from "./categories";
import {
  BudgetTarget,
  ParsedCsvTransaction,
  Transaction,
  TransactionClassification,
  UploadRecord,
  UploadTransactionLink,
  canonicalCategories,
} from "../types";

function hashTransaction(input: ParsedCsvTransaction) {
  return [
    input.date.slice(0, 10),
    input.account.trim().toLowerCase(),
    input.description.trim().toLowerCase(),
    input.amount.toFixed(2),
  ].join("|");
}

function uuid() {
  return crypto.randomUUID();
}

export class BudgetDashboardDb extends Dexie {
  transactions!: Table<Transaction, string>;
  uploads!: Table<UploadRecord, string>;
  uploadTransactionLinks!: Table<UploadTransactionLink, string>;
  budgetTargets!: Table<BudgetTarget, string>;

  constructor() {
    super("budget-dashboard");
    this.version(1).stores({
      transactions: "id, transactionHash, month, date, account, canonicalCategory, classificationSource, aiStatus",
      uploads: "id, uploadedAt",
      uploadTransactionLinks: "id, uploadId, transactionId, [uploadId+transactionId]",
      budgetTargets: "category",
    });
  }
}

export const db = new BudgetDashboardDb();

export async function ensureBudgetTargets() {
  const count = await db.budgetTargets.count();
  if (count > 0) return;
  await db.budgetTargets.bulkAdd(
    canonicalCategories.map((category) => ({
      category,
      targetAmount: 0,
    })),
  );
}

export async function importTransactions(file: File, rows: ParsedCsvTransaction[], classifications?: TransactionClassification[]) {
  const uploadId = uuid();
  const uploadedAt = new Date().toISOString();
  const monthSet = [...new Set(rows.map((row) => row.month))].sort();
  const monthRange = monthSet.length === 0 ? "No transactions" : monthSet.length === 1 ? monthSet[0] : `${monthSet[0]} → ${monthSet.at(-1)}`;

  await db.transaction("rw", db.transactions, db.uploads, db.uploadTransactionLinks, async () => {
    await db.uploads.add({
      id: uploadId,
      fileName: file.name,
      uploadedAt,
      monthRange,
      transactionCount: rows.length,
    });

    for (const [index, row] of rows.entries()) {
      const transactionHash = hashTransaction(row);
      let transaction = await db.transactions.where("transactionHash").equals(transactionHash).first();
      const classification = classifications?.[index];

      if (!transaction) {
        transaction = {
          id: uuid(),
          transactionHash,
          date: row.date,
          month: row.month,
          account: row.account,
          description: row.description,
          amount: row.amount,
          empowerCategory: row.empowerCategory,
          canonicalCategory: classification?.canonicalCategory ?? fallbackCategoryFromEmpower(row.empowerCategory),
          classificationSource: classification?.classificationSource ?? "uncategorized",
          classificationConfidence: classification?.confidence ?? null,
          aiStatus: classification?.aiStatus ?? "disabled",
          createdAt: uploadedAt,
          updatedAt: uploadedAt,
        };
        await db.transactions.add(transaction);
      }

      const existingLink = await db.uploadTransactionLinks
        .where("[uploadId+transactionId]")
        .equals([uploadId, transaction.id])
        .first();

      if (!existingLink) {
        await db.uploadTransactionLinks.add({
          id: uuid(),
          uploadId,
          transactionId: transaction.id,
        });
      }
    }
  });
}

export async function deleteUpload(uploadId: string) {
  await db.transaction("rw", db.uploads, db.uploadTransactionLinks, db.transactions, async () => {
    const links = await db.uploadTransactionLinks.where("uploadId").equals(uploadId).toArray();
    const transactionIds = links.map((link) => link.transactionId);
    await db.uploadTransactionLinks.where("uploadId").equals(uploadId).delete();
    await db.uploads.delete(uploadId);

    for (const transactionId of transactionIds) {
      const remainingLinks = await db.uploadTransactionLinks.where("transactionId").equals(transactionId).count();
      if (remainingLinks === 0) {
        await db.transactions.delete(transactionId);
      }
    }
  });
}

export async function updateTransactionCategory(transactionId: string, category: Transaction["canonicalCategory"]) {
  await db.transactions.update(transactionId, {
    canonicalCategory: category,
    classificationSource: "manual",
    classificationConfidence: 1,
    updatedAt: new Date().toISOString(),
  });
}

export async function upsertBudgetTarget(category: BudgetTarget["category"], targetAmount: number) {
  await db.budgetTargets.put({ category, targetAmount });
}
