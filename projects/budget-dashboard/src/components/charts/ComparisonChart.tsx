import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { currency } from "../../lib/format";

const colors = ["#26a269", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#ec4899", "#64748b"];

export interface ComparisonDatum {
  month: string;
  total: number;
  [key: string]: number | string;
}

export function ComparisonChart({
  data,
  categories,
  showPercentages,
}: {
  data: ComparisonDatum[];
  categories: string[];
  showPercentages: boolean;
}) {
  if (data.length === 0) {
    return <div className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-card dark:bg-slate-900 dark:text-slate-400">Upload at least one month to compare spending.</div>;
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-card dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Month Comparison</h2>
      <div className="mt-6 h-[26rem]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => (showPercentages ? `${Math.round(Number(value))}%` : currency.format(Number(value)))}
            />
            <Tooltip formatter={(value: number) => (showPercentages ? `${Number(value).toFixed(1)}%` : currency.format(value))} />
            <Legend />
            {categories.map((category, index) => (
              <Bar key={category} dataKey={category} stackId="spend" fill={colors[index % colors.length]} radius={index === categories.length - 1 ? [6, 6, 0, 0] : 0} />
            ))}
            {!showPercentages ? <Line type="monotone" dataKey="total" stroke="#0f172a" strokeWidth={2} dot={false} /> : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
