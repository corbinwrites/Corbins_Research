import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { currency } from "../../lib/format";

const colors = ["#26a269", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#ec4899", "#64748b"];

interface ChartDatum {
  category: string;
  amount: number;
}

export function OverviewCharts({ data }: { data: ChartDatum[] }) {
  if (data.length === 0) {
    return <div className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-card dark:bg-slate-900 dark:text-slate-400">No expense data for this month yet.</div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
      <section className="rounded-3xl bg-white p-6 shadow-card dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Spend Mix</h2>
        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="amount" nameKey="category" innerRadius={70} outerRadius={112} paddingAngle={2}>
                {data.map((entry, index) => (
                  <Cell key={entry.category} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => currency.format(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-card dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Spend by Category</h2>
        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" tickFormatter={(value) => currency.format(Number(value))} hide />
              <YAxis type="category" dataKey="category" width={120} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number) => currency.format(value)} />
              <Bar dataKey="amount" radius={[0, 12, 12, 0]} fill="#26a269" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
