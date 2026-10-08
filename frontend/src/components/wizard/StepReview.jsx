import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSat } from "@/context/SatContext";
import { fmtMoney, fmtPct, num } from "@/lib/model";

export default function StepReview() {
  const { state, totals } = useSat();

  const warnings = [];
  state.items.forEach((it) => {
    if (num(it.unitCost) === 0) warnings.push(`${it.name || "An item"} has no direct cost, its margin shows as 100%.`);
    if (num(it.unitCost) > num(it.price)) warnings.push(`${it.name || "An item"} costs more than it sells for.`);
    if (it.units.every((u) => num(u) === 0)) warnings.push(`${it.name || "An item"} has no unit volumes.`);
  });

  const stats = [
    { label: `${state.months}-month revenue`, value: fmtMoney(totals.revenueTotal), testid: "review-revenue" },
    { label: "Direct costs", value: fmtMoney(totals.costTotal), testid: "review-costs" },
    { label: "Gross profit", value: fmtMoney(totals.grossProfit), testid: "review-gross-profit" },
    { label: "Gross margin", value: fmtPct(totals.marginPct), testid: "review-margin", accent: true },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`sat-card p-5 ${s.accent ? "border-[#7ac24a] bg-[#f2f9ec]" : ""}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
            <p data-testid={s.testid} className={`font-num mt-2 text-2xl font-bold ${s.accent ? "text-[#3f6420]" : "text-slate-900"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="sat-card p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">What we captured</p>
        <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <li>
            <strong>{state.items.length}</strong> products / services across <strong>{state.categories.length}</strong> sales
            {state.categories.length === 1 ? " category" : " categories"}
          </li>
          <li>
            <strong>{state.months}</strong>-month horizon starting <strong>{totals.labels[0]}</strong>
          </li>
          <li>
            Industry: <strong>{state.industry || "not set"}</strong>
          </li>
          <li>
            Peak revenue month: <strong>{totals.peakMonth.label}</strong> at <strong>{fmtMoney(totals.peakMonth.value)}</strong>
          </li>
        </ul>
      </div>

      {warnings.length > 0 ? (
        <div data-testid="review-warnings" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle size={16} /> Worth a second look
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800">
            {[...new Set(warnings)].slice(0, 6).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-700">You can still continue, everything stays editable in the tables.</p>
        </div>
      ) : (
        <div data-testid="review-clean" className="flex items-center gap-2 rounded-xl border border-[#cbe8af] bg-[#f2f9ec] p-5 text-sm font-medium text-[#3f6420]">
          <CheckCircle2 size={17} /> Your assumptions look complete and internally consistent.
        </div>
      )}
    </div>
  );
}
