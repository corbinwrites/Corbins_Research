import { useState } from "react";
import { Upload, Download, Trash2 } from "lucide-react";
import { exportTransactionsCsv, parseEmpowerCsv } from "../lib/csvParser";
import { dateFormatter } from "../lib/format";
import { Transaction, UploadRecord } from "../types";

interface UploadViewProps {
  uploads: UploadRecord[];
  transactions: Transaction[];
  onUpload: (file: File) => Promise<void>;
  onDeleteUpload: (uploadId: string) => Promise<void>;
  aiEnabled: boolean;
  aiLabel: string;
}

export function UploadView({ uploads, transactions, onUpload, onDeleteUpload, aiEnabled, aiLabel }: UploadViewProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    console.log("handleFiles called with:", files);
    const file = files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }
    console.log("Processing file:", file.name, file.size, file.type);
    setBusy(true);
    setError(null);
    try {
      console.log("Calling onUpload...");
      await onUpload(file);
      console.log("Upload completed successfully");
    } catch (uploadError) {
      console.error("Upload error:", uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    const csv = exportTransactionsCsv(
      transactions.map((transaction) => ({
        Date: dateFormatter.format(new Date(transaction.date)),
        Account: transaction.account,
        Description: transaction.description,
        Amount: transaction.amount,
        EmpowerCategory: transaction.empowerCategory,
        Category: transaction.canonicalCategory,
        Source: transaction.classificationSource,
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reclassified-transactions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-card dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">CSV Ingestion</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Upload Empower exports, dedupe transactions, and keep upload ownership intact.</p>
          </div>
          <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">
            <Download className="h-4 w-4" />
            Export Reclassified CSV
          </button>
        </div>

        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <Upload className="h-8 w-8 text-slate-400" />
          <span className="mt-4 text-base font-medium text-slate-900 dark:text-slate-50">{busy ? "Uploading..." : "Drag and drop or browse CSV"}</span>
          <span className="mt-2 text-sm text-slate-500 dark:text-slate-400">Empower format: Date, Account, Description, Category, Tags, Amount</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
            disabled={busy}
          />
        </label>

        {error ? <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</div> : null}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-card dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Uploaded Files</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="pb-3 pr-4">File</th>
                <th className="pb-3 pr-4">Uploaded</th>
                <th className="pb-3 pr-4">Month Range</th>
                <th className="pb-3 pr-4">Transactions</th>
                <th className="pb-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {uploads.map((upload) => (
                <tr key={upload.id}>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-50">{upload.fileName}</td>
                  <td className="py-3 pr-4">{dateFormatter.format(new Date(upload.uploadedAt))}</td>
                  <td className="py-3 pr-4">{upload.monthRange}</td>
                  <td className="py-3 pr-4">{upload.transactionCount}</td>
                  <td className="py-3 pr-4">
                    <button onClick={() => void onDeleteUpload(upload.id)} className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {uploads.length === 0 ? <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No uploads yet.</p> : null}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-card dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">AI Status</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{aiLabel}</p>
        <div className={`mt-4 inline-flex rounded-full px-3 py-2 text-xs font-semibold ${aiEnabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
          {aiEnabled ? "Classification on upload enabled" : "Fallback categorization only"}
        </div>
      </section>
    </div>
  );
}
