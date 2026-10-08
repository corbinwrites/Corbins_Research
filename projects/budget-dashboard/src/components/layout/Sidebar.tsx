import { BarChart3, CalendarRange, PiggyBank, Receipt, Upload, Moon, SunMedium } from "lucide-react";

export type ViewId = "overview" | "comparison" | "budget" | "upload";

interface SidebarProps {
  currentView: ViewId;
  onChange: (view: ViewId) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  aiEnabled: boolean;
  aiLabel: string;
}

const items = [
  { id: "overview", label: "Monthly Overview", icon: BarChart3 },
  { id: "comparison", label: "Multi-Month", icon: CalendarRange },
  { id: "budget", label: "Budget Planner", icon: PiggyBank },
  { id: "upload", label: "Data Management", icon: Upload },
] satisfies Array<{ id: ViewId; label: string; icon: typeof Upload }>;

export function Sidebar({ currentView, onChange, darkMode, onToggleDarkMode, aiEnabled, aiLabel }: SidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-6 rounded-3xl bg-white/90 p-5 shadow-card ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800 lg:w-72">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Budget Dashboard</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">Personal Finance</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Local-first budgeting with secure AI placeholders.</p>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === currentView;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                active
                  ? "bg-mint-50 text-mint-700 ring-1 ring-mint-100 dark:bg-slate-800 dark:text-emerald-300 dark:ring-slate-700"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <div className="mb-3 flex items-center gap-2 font-medium">
          <Receipt className="h-4 w-4" />
          AI Security
        </div>
        <p>{aiLabel}</p>
        <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${aiEnabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
          {aiEnabled ? "Gemini helper online" : "AI helper offline"}
        </div>
        <button
          onClick={onToggleDarkMode}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white dark:bg-slate-200 dark:text-slate-900"
        >
          {darkMode ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}
