import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSat } from "@/context/SatContext";
import { fmtMoney, fmtPct } from "@/lib/model";

const PIE_COLORS = ["#7ac24a", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#14b8a6"];

export const MarginDashboard = () => {
  const { totals } = useSat();

  const monthly = totals.labels.map((label, i) => ({
    label,
    revenue: Math.round(totals.monthlyRevenue[i]),
    cost: Math.round(totals.monthlyCost[i]),
    grossProfit: Math.round(totals.monthlyGP[i]),
    margin: +(totals.monthlyMarginPct[i] * 100).toFixed(1),
  }));

  const kpis = [
    { label: "Total revenue", value: fmtMoney(totals.revenueTotal), testid: "kpi-revenue" },
    { label: "Direct costs (COGS)", value: fmtMoney(totals.costTotal), testid: "kpi-costs" },
    { label: "Gross margin", value: fmtPct(totals.marginPct), testid: "kpi-margin", accent: true },
    { label: "Avg monthly gross profit", value: fmtMoney(totals.avgMonthlyGP), testid: "kpi-avg-gp" },
    { label: "Peak revenue month", value: totals.peakMonth.label, sub: fmtMoney(totals.peakMonth.value), testid: "kpi-peak" },
  ];

  const pieData = totals.perCategory.filter((c) => c.revenue > 0);

  return (
    <div data-testid="margin-dashboard" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className={`sat-card p-5 transition-shadow hover:shadow-md ${k.accent ? "border-[#7ac24a] bg-[#f2f9ec]" : ""}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p data-testid={k.testid} className={`font-num mt-2 text-xl font-bold ${k.accent ? "text-[#3f6420]" : "text-slate-900"}`}>
              {k.value}
            </p>
            {k.sub && <p className="font-num mt-0.5 text-xs text-slate-500">{k.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="sat-card p-5 lg:col-span-2">
          <h3 className="font-display text-base font-bold text-slate-900">Revenue vs direct costs</h3>
          <p className="mt-0.5 text-xs text-slate-500">Monthly, across the projection horizon</p>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ left: -12, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7ac24a" stopOpacity={0.65} />
                    <stop offset="100%" stopColor="#7ac24a" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="gCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7ac24a" strokeWidth={2.5} fill="url(#gRev)" />
                <Area type="monotone" dataKey="cost" name="Direct costs" stroke="#f59e0b" strokeWidth={2} fill="url(#gCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="sat-card p-5">
          <h3 className="font-display text-base font-bold text-slate-900">Revenue by category</h3>
          <p className="mt-0.5 text-xs text-slate-500">Share of total projected revenue</p>
          <div className="mt-5 h-64">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="revenue" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-20 text-center text-xs text-slate-400">No revenue yet</p>
            )}
          </div>
        </div>

        <div className="sat-card p-5">
          <h3 className="font-display text-base font-bold text-slate-900">Gross margin trend</h3>
          <p className="mt-0.5 text-xs text-slate-500">Percentage, month by month</p>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ left: -18, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Line type="monotone" dataKey="margin" name="Gross margin" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="sat-card p-5 lg:col-span-2">
          <h3 className="font-display text-base font-bold text-slate-900">Monthly gross profit</h3>
          <p className="mt-0.5 text-xs text-slate-500">Revenue less direct costs, the cash your lender models from</p>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ left: -12, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="grossProfit" name="Gross profit" fill="#7ac24a" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
