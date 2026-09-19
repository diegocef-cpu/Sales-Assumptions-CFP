import React, { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Percent } from "lucide-react";
import { useSat } from "@/context/SatContext";
import { suggestAssumptions } from "@/lib/api";
import { num, fmtMoney, fmtPct } from "@/lib/model";

export default function StepCosts() {
  const { state, updateItem, totals } = useSat();
  const [busy, setBusy] = useState(null);

  const suggest = async (item) => {
    setBusy(item.id);
    try {
      const data = await suggestAssumptions({
        industry: state.industry,
        businessModel: state.businessModel,
        itemName: item.name,
        months: state.months,
        price: num(item.price),
      });
      updateItem(item.id, { unitCost: data.unit_cost });
      toast.success(data.note || `Suggested direct cost for ${item.name}`);
    } catch (e) {
      toast.error("Suggestion failed — enter the cost manually");
    } finally {
      setBusy(null);
    }
  };

  const setTargetMargin = (item, pct) => updateItem(item.id, { unitCost: +(num(item.price) * (1 - pct)).toFixed(2) });

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
        Now the direct cost of delivering <em>one</em> unit — materials, stock you buy in, subcontractors, packaging, delivery,
        payment fees. Leave out rent, salaries and other overheads; those sit further down the cash flow.
      </p>

      <div className="sat-card divide-y divide-slate-100 overflow-hidden">
        {state.items.map((it, i) => {
          const m = totals.perItem[it.id];
          const healthy = m?.marginPct >= 0.3;
          return (
            <div key={it.id} className="grid grid-cols-1 items-center gap-3 px-5 py-4 lg:grid-cols-[1fr_170px_auto_auto]">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{it.name || `Product / Service ${i + 1}`}</p>
                <p className="font-num text-xs text-slate-400">sells for {fmtMoney(it.price, 2)} / unit</p>
              </div>
              <div className="relative">
                <span className="font-num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input
                  data-testid={`cost-input-${i}`}
                  type="number"
                  min="0"
                  step="0.01"
                  className="sat-input font-num pl-7 text-right"
                  placeholder="0.00"
                  value={it.unitCost === 0 ? "" : it.unitCost}
                  onChange={(e) => updateItem(it.id, { unitCost: num(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2">
                {[0.4, 0.6].map((p) => (
                  <button
                    key={p}
                    data-testid={`cost-target-${p * 100}-${i}`}
                    onClick={() => setTargetMargin(it, p)}
                    className="sat-chip"
                    title={`Set cost for a ${p * 100}% margin`}
                  >
                    <Percent size={11} /> {p * 100}% margin
                  </button>
                ))}
                <button
                  data-testid={`ai-suggest-cost-${i}`}
                  onClick={() => suggest(it)}
                  disabled={busy === it.id}
                  className="sat-chip"
                >
                  {busy === it.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Suggest
                </button>
              </div>
              <span
                data-testid={`item-margin-${i}`}
                className={`font-num shrink-0 rounded-md px-2.5 py-1 text-right text-xs font-bold ${
                  healthy ? "bg-[#f2f9ec] text-[#3f6420]" : "bg-amber-50 text-amber-700"
                }`}
              >
                {fmtPct(m?.marginPct ?? 0)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="sat-card flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-5 text-white">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Running gross margin</span>
        <div className="flex flex-wrap items-baseline gap-6">
          <span className="font-num text-sm text-slate-300">
            Revenue <strong className="text-white">{fmtMoney(totals.revenueTotal)}</strong>
          </span>
          <span className="font-num text-sm text-slate-300">
            Direct costs <strong className="text-white">{fmtMoney(totals.costTotal)}</strong>
          </span>
          <span data-testid="running-margin" className="font-num text-2xl font-bold text-[#a8e06f]">
            {fmtPct(totals.marginPct)}
          </span>
        </div>
      </div>
    </div>
  );
}
