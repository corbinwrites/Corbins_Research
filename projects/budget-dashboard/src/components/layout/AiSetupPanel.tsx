interface AiSetupPanelProps {
  enabled: boolean;
  model?: string;
  reason?: string;
}

export function AiSetupPanel({ enabled, model, reason }: AiSetupPanelProps) {
  return (
    <section className="rounded-3xl bg-white/90 p-6 shadow-card ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">AI Setup</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">Gemini Helper Status</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            AI features run only through the local helper. The browser never receives your Gemini API key.
          </p>
        </div>
        <div
          className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
            enabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          {enabled ? `Connected${model ? ` · ${model}` : ""}` : "Not connected"}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Current State</h3>
          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
            {enabled ? "The helper is online. Uploads can batch-classify transactions and budget recommendations can be generated." : reason ?? "The helper is offline."}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Setup Steps</h3>
          <ol className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li>1. In the project root, copy `.env.example` to `.env`.</li>
            <li>2. Add `GEMINI_API_KEY` from Google AI Studio.</li>
            <li>3. Run `npm run dev`.</li>
            <li>4. Refresh the app if the helper was started after the page loaded.</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
